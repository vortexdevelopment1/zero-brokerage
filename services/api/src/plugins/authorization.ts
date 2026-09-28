import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../common/errors/index.js";
import { assertActiveAgencyMembership } from "../modules/identity/authorization/agency-policy.js";
import { assertBrokerVerificationState } from "../modules/identity/authorization/broker-policy.js";
import { assertEntitlement } from "../modules/identity/authorization/entitlements.js";
import {
  hasAllPermissions,
  type Permission,
} from "../modules/identity/authorization/roles-and-permissions.js";
import {
  findAgencyMembershipsByUserId,
  findBrokerVerificationByUserId,
} from "../modules/identity/repositories/identity-repository.js";
import type {
  AgencyMembershipRole,
  PlatformRole,
} from "../modules/identity/types.js";
import { assertPermission } from "../modules/identity/authorization/roles-and-permissions.js";
import { recordAdminPrivilegeUsed } from "../modules/identity/authorization/admin-audit.js";
import { StepUpService } from "../modules/identity/services/step-up-service.js";
import { globalOtpProvider } from "../modules/identity/routes/auth-routes.js";

declare module "fastify" {
  interface FastifyInstance {
    requireRole: (
      ...roles: (PlatformRole | PlatformRole[])[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    requirePermission: (
      ...permissions: (Permission | Permission[])[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    requireAgencyRole: (
      agencyIdParamName: string,
      ...roles: (AgencyMembershipRole | AgencyMembershipRole[])[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    requireBrokerVerified: () => (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;

    requireEntitlement: (
      featureKey: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    requireStepUp: () => (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;

    requireSensitiveAdminAction: (options: {
      permission: Permission;
      action: string;
      resourceType: string;
      requiresStepUp?: boolean;
    }) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authorizationPlugin(app: FastifyInstance): Promise<void> {
  /**
   * Enforces that the authenticated user has at least one of the allowed platform roles.
   */
  const requireRole = (...allowedRoles: (PlatformRole | PlatformRole[])[]) => {
    const roles = (allowedRoles as any[]).flat();

    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required.");
      }

      if (!roles.includes(request.user.role)) {
        throw new ForbiddenError(
          `Access denied. Role "${request.user.role}" does not have sufficient platform privilege.`,
        );
      }
    };
  };

  /**
   * Enforces that the authenticated user's role grants all specified action permissions.
   */
  const requirePermission = (
    ...requiredPermissions: (Permission | Permission[])[]
  ) => {
    const permissions = (requiredPermissions as any[]).flat();

    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required.");
      }

      const permitted = hasAllPermissions(request.user.role, permissions);

      if (!permitted) {
        throw new ForbiddenError(
          `Access denied. You lack the required permissions: ${permissions.join(", ")}.`,
        );
      }
    };
  };

  /**
   * Enforces active agency membership for an agency referenced by route parameter or direct ID.
   */
  const requireAgencyRole = (
    agencyIdOrParamName: string,
    ...requiredRoles: (AgencyMembershipRole | AgencyMembershipRole[])[]
  ) => {
    const roles = (requiredRoles as any[]).flat();

    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required.");
      }

      const params = (request.params as Record<string, string>) ?? {};
      const targetAgencyId = params[agencyIdOrParamName] ?? agencyIdOrParamName;

      if (!targetAgencyId) {
        throw new ForbiddenError(
          `Missing expected agency parameter "${agencyIdOrParamName}".`,
        );
      }

      const memberships = await findAgencyMembershipsByUserId(
        app.db,
        request.user.id,
      );

      const targetMembership = memberships.find(
        (m) => m.agencyId === targetAgencyId,
      );

      assertActiveAgencyMembership(
        targetMembership,
        roles.length > 0 ? roles : undefined,
      );
    };
  };

  /**
   * Enforces that the broker's verification status is APPROVED and operational.
   */

  const requireBrokerVerified = () => {
    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required.");
      }

      const verification = await findBrokerVerificationByUserId(
        app.db,
        request.user.id,
      );

      assertBrokerVerificationState(verification, ["APPROVED"]);
    };
  };

  /**
   * Enforces that the user/organization possesses the required subscription entitlement.
   */
  const requireEntitlement = (featureKey: string) => {
    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required.");
      }

      await assertEntitlement({
        userId: request.user.id,
        featureKey,
      });
    };
  };

  const stepUpService = new StepUpService(app.db, globalOtpProvider);

  /**
   * Enforces that a sensitive operation has completed single-use step-up security verification.
   */
  const requireStepUp = () => {
    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user || !request.session) {
        throw new UnauthorizedError("Authentication required.");
      }

      const rawToken =
        (request.headers["x-step-up-token"] as string | undefined) ??
        (request.headers["x-security-challenge"] as string | undefined);

      await stepUpService.validateAndConsumeStepUpToken(rawToken, {
        userId: request.user.id,
        sessionId: request.user.sessionId,
      });
    };
  };

  /**
   * Enforces administrative permission, step-up challenge verification (when required),
   * and records the authoritative ADMIN_PRIVILEGE_USED audit event with sanitized metadata.
   */
  const requireSensitiveAdminAction = (options: {
    permission: Permission;
    action: string;
    resourceType: string;
    requiresStepUp?: boolean;
  }) => {
    return async (request: FastifyRequest): Promise<void> => {
      if (!request.user || !request.session) {
        throw new UnauthorizedError("Authentication required.");
      }

      // 1. Role must possess the required administrative action permission
      assertPermission(request.user.role, options.permission);

      // 2. Validate and consume single-use step-up security token
      if (options.requiresStepUp ?? true) {
        const rawToken =
          (request.headers["x-step-up-token"] as string | undefined) ??
          (request.headers["x-security-challenge"] as string | undefined);

        await stepUpService.validateAndConsumeStepUpToken(rawToken, {
          userId: request.user.id,
          sessionId: request.user.sessionId,
        });
      }

      // 3. Atomically persist sanitized ADMIN_PRIVILEGE_USED audit record
      await recordAdminPrivilegeUsed(app.db, {
        userId: request.user.id,
        sessionId: request.user.sessionId,
        action: options.action,
        resourceType: options.resourceType,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
        metadata: (request.body as Record<string, unknown>) ?? {},
      });
    };
  };

  app.decorate("requireRole", requireRole);
  app.decorate("requirePermission", requirePermission);
  app.decorate("requireAgencyRole", requireAgencyRole);
  app.decorate("requireBrokerVerified", requireBrokerVerified);
  app.decorate("requireEntitlement", requireEntitlement);
  app.decorate("requireStepUp", requireStepUp);
  app.decorate("requireSensitiveAdminAction", requireSensitiveAdminAction);
}

export default fp(authorizationPlugin, {
  name: "authorization",
  dependencies: ["authentication", "database"],
});
