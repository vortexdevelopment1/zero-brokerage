import type { FastifyInstance, FastifyRequest } from "fastify";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import { STEP04_LEGACY_COMPATIBILITY_CONFIG } from "../../../common/http/compatibility.js";
import {
  changePhoneConfirmSchema,
  changePhoneRequestSchema,
  deleteAccountSchema,
  refreshSessionSchema,
  requestOtpSchema,
  revokeSessionParamsSchema,
  verifyOtpSchema,
  stepUpVerifySchema,
} from "../schemas/auth-schemas.js";
import { AccountLifecycleService } from "../services/account-lifecycle-service.js";
import { AuthService } from "../services/auth-service.js";
import { SessionService } from "../services/session-service.js";
import { StepUpService } from "../services/step-up-service.js";

import type { OtpDeliveryProvider } from "../providers/otp-provider.js";

// Global singleton provider for OTP dispatch (can be overridden in production)
export const globalOtpProvider = new MockOtpDeliveryProvider();

/** Explicit route configuration export for Step 04 legacy compatibility. */
export const STEP04_LEGACY_ROUTE_CONFIG = STEP04_LEGACY_COMPATIBILITY_CONFIG;

export async function registerAuthRoutes(
  app: FastifyInstance,
  options?: { otpProvider?: OtpDeliveryProvider },
): Promise<void> {
  await app.register(async (authScope) => {
    // Explicit Step 04 legacy compatibility boundary:
    // Every route registered within this Step 04 module automatically inherits
    // the legacy Step 04 compatibility surface declaration.
    authScope.addHook("onRoute", (routeOptions) => {
      routeOptions.config = routeOptions.config || {};
      routeOptions.config.compatibilitySurface = "step04-legacy";
    });

    const otpProvider = options?.otpProvider ?? globalOtpProvider;
    const authService = new AuthService(authScope.db, otpProvider);
    const sessionService = new SessionService(authScope.db);
    const lifecycleService = new AccountLifecycleService(
      authScope.db,
      otpProvider,
    );
    const stepUpService = new StepUpService(authScope.db, otpProvider);

    function getClientMeta(request: FastifyRequest) {
      return {
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      };
    }

    // 1. Request OTP
    authScope.post("/api/v1/auth/request-otp", async (request, reply) => {
      const body = requestOtpSchema.parse(request.body);
      const meta = getClientMeta(request);

      const result = await authService.requestOtp({
        phone: body.phone,
        purpose: body.purpose,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    });

    // 2. Verify OTP
    authScope.post("/api/v1/auth/verify-otp", async (request, reply) => {
      const body = verifyOtpSchema.parse(request.body);
      const meta = getClientMeta(request);

      const result = await authService.verifyOtp({
        challengeId: body.challengeId,
        code: body.code,
        deviceInfo: body.deviceInfo,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: result.user.id,
            phone: result.user.phone,
            role: result.user.role,
            status: result.user.status,
          },
          tokens: result.tokens,
          isNewUser: result.isNewUser,
        },
      });
    });

    // 3. Refresh Session
    const handleRefresh = async (request: FastifyRequest, reply: any) => {
      const body = refreshSessionSchema.parse(request.body);
      const meta = getClientMeta(request);

      const result = await authService.refreshSession({
        refreshToken: body.refreshToken,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    };

    authScope.post("/api/v1/auth/refresh-session", handleRefresh);
    authScope.post("/api/v1/auth/refresh", handleRefresh);

    // 4. Logout Current Session
    authScope.post(
      "/api/v1/auth/logout",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const meta = getClientMeta(request);

        await authService.logout({
          sessionId: request.user!.sessionId,
          userId: request.user!.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: { message: "Logged out successfully." },
        });
      },
    );

    // 5. Logout All Sessions
    authScope.post(
      "/api/v1/auth/logout-all",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const meta = getClientMeta(request);

        await authService.logoutAll({
          userId: request.user!.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: { message: "Logged out of all sessions successfully." },
        });
      },
    );

    // 6. Current User Profile & Authorization Details
    authScope.get(
      "/api/v1/auth/me",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const profile = await lifecycleService.getCurrentUserProfile(
          request.user!.id,
        );

        return reply.status(200).send({
          success: true,
          data: profile,
        });
      },
    );

    // 7. List Active Sessions
    authScope.get(
      "/api/v1/auth/sessions",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const sessions = await sessionService.getActiveSessions(
          request.user!.id,
          request.user!.sessionId,
        );

        return reply.status(200).send({
          success: true,
          data: { sessions },
        });
      },
    );

    // 8. Revoke Specific Session
    authScope.delete(
      "/api/v1/auth/sessions/:sessionId",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const params = revokeSessionParamsSchema.parse(request.params);
        const meta = getClientMeta(request);

        await sessionService.revokeSession({
          userId: request.user!.id,
          sessionIdToRevoke: params.sessionId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: { message: "Session revoked successfully." },
        });
      },
    );

    // 9. Initiate Phone Change
    authScope.post(
      "/api/v1/auth/change-phone/request",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const body = changePhoneRequestSchema.parse(request.body);
        const meta = getClientMeta(request);

        const result = await lifecycleService.requestPhoneChange({
          userId: request.user!.id,
          newPhone: body.newPhone,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 10. Confirm Phone Change
    authScope.post(
      "/api/v1/auth/change-phone/confirm",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const body = changePhoneConfirmSchema.parse(request.body);
        const meta = getClientMeta(request);

        await lifecycleService.confirmPhoneChange({
          userId: request.user!.id,
          challengeId: body.challengeId,
          code: body.code,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: { message: "Phone number updated successfully." },
        });
      },
    );

    // 11. Delete Account Lifecycle
    authScope.post(
      "/api/v1/auth/delete-account",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const body = deleteAccountSchema.parse(request.body ?? {});
        const meta = getClientMeta(request);

        const result = await lifecycleService.deleteAccount({
          userId: request.user!.id,
          reason: body.reason,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 12. Cancel Account Deletion (Grace Period)
    authScope.post(
      "/api/v1/auth/delete-account/cancel",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const meta = getClientMeta(request);

        const result = await lifecycleService.cancelAccountDeletion({
          userId: request.user!.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 13. Finalize Account Deletion
    authScope.post(
      "/api/v1/auth/delete-account/finalize",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const meta = getClientMeta(request);

        const result = await lifecycleService.finalizeAccountDeletion({
          userId: request.user!.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 14. Request Step-Up Security Challenge (Super Admin)
    authScope.post(
      "/api/v1/auth/step-up/request",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const meta = getClientMeta(request);

        const result = await stepUpService.requestStepUp({
          userId: request.user!.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 15. Verify Step-Up Security Challenge
    authScope.post(
      "/api/v1/auth/step-up/verify",
      { preHandler: [authScope.authenticate] },
      async (request, reply) => {
        const body = stepUpVerifySchema.parse(request.body);
        const meta = getClientMeta(request);

        const result = await stepUpService.verifyStepUp({
          userId: request.user!.id,
          sessionId: request.user!.sessionId,
          challengeId: body.challengeId,
          code: body.code,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      },
    );
  });
}
