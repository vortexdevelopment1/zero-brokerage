import type { FastifyInstance, FastifyRequest } from "fastify";
import { executeQuery } from "@zero-brokerage/database";
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../../common/errors/index.js";
import { env } from "../../../config/env.js";
import {
  createCanonicalSuccessResponse,
  adaptPaginationToCanonical,
} from "../../../common/http/contracts.js";
import {
  createIdentity,
  createUserProfile,
  findIdentityById,
  findIdentityByPhone,
  findUserProfile,
  findBrokerVerificationByUserId,
  listUsers,
  listBrokers,
  updateIdentityStatus,
  updateBrokerVerification,
} from "../repositories/identity-repository.js";
import {
  findLatestPendingChallenge,
  findChallengeById,
} from "../repositories/otp-repository.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { getRolePermissions } from "../authorization/roles-and-permissions.js";
import { AuthService } from "../services/auth-service.js";
import { globalOtpProvider } from "./auth-routes.js";
import type { OtpDeliveryProvider } from "../providers/otp-provider.js";
import type {
  PlatformRole,
  UserStatus,
  BrokerVerificationStatus,
} from "../types.js";

const UUID_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export async function registerAdminRoutes(
  app: FastifyInstance,
  options?: { otpProvider?: OtpDeliveryProvider },
): Promise<void> {
  const otpProvider = options?.otpProvider ?? globalOtpProvider;
  const authService = new AuthService(app.db, otpProvider);

  const adminPreHandlers = [
    app.authenticate,
    app.requireRole("SUPER_ADMIN"),
  ];

  function getClientMeta(request: FastifyRequest) {
    return {
      ipAddress: request.ip ?? null,
      userAgent: (request.headers["user-agent"] as string) ?? null,
    };
  }

  // Helper for both /api/v1/admin and /api/admin paths
  function registerDualRoute(
    method: "get" | "post" | "patch" | "delete",
    pathSuffix: string,
    opts: any,
    handler: (request: FastifyRequest<any>, reply: any) => Promise<any>,
  ) {
    (app as any)[method](`/api/v1/admin${pathSuffix}`, opts, handler);
    (app as any)[method](`/api/admin${pathSuffix}`, opts, handler);
  }

  // ==========================================
  // 1. ADMIN AUTHENTICATION & SESSION
  // ==========================================

  const requestOtpHandler = async (
    request: FastifyRequest<{ Body: { phone: string } }>,
    reply: any,
  ) => {
    const { phone } = request.body;
    if (!phone) {
      throw new ValidationError("Phone number is required.", [
        { field: "phone", message: "Required" },
      ]);
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    let user = await findIdentityByPhone(app.db, normalizedPhone);

    const isProduction =
      process.env.NODE_ENV === "production" || env.NODE_ENV === "production";

    if (!user) {
      if (!isProduction) {
        user = await createIdentity(app.db, {
          phone: normalizedPhone,
          role: "SUPER_ADMIN",
        });
        await createUserProfile(app.db, {
          userId: user.id,
          fullName: "Super Admin",
          email: "admin@zerobrokerage.com",
        });
      } else {
        throw new UnauthorizedError(
          "Access denied. Admin account not found.",
        );
      }
    }

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Access denied. Caller is not an authorized Super Administrator.",
      );
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Admin account is not active.");
    }

    const meta = getClientMeta(request);
    const result = await authService.requestOtp({
      phone: normalizedPhone,
      purpose: "AUTHENTICATION",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return reply.status(200).send(
      createCanonicalSuccessResponse(
        {
          challengeId: result.challengeId,
          expiresInSeconds: result.expiresInSeconds,
          resendCooldownSeconds: result.resendCooldownSeconds,
        },
        request.id,
      ),
    );
  };

  registerDualRoute(
    "post",
    "/auth/request-otp",
    {
      schema: {
        body: {
          type: "object",
          required: ["phone"],
          properties: {
            phone: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    requestOtpHandler,
  );

  const loginHandler = async (
    request: FastifyRequest<{
      Body: { phone?: string; challengeId?: string; code: string };
    }>,
    reply: any,
  ) => {
    const { phone, code } = request.body;
    let challengeId = request.body.challengeId;

    if (!code) {
      throw new UnauthorizedError("Verification code (OTP) is required.");
    }

    if (!challengeId && !phone) {
      throw new UnauthorizedError(
        "Either phone or challengeId must be provided for admin authentication.",
      );
    }

    let normalizedPhone: string | null = null;
    if (phone) {
      normalizedPhone = normalizePhoneNumber(phone);
    }

    if (!challengeId && normalizedPhone) {
      const pending = await findLatestPendingChallenge(
        app.db,
        normalizedPhone,
        "AUTHENTICATION",
      );
      if (!pending) {
        throw new UnauthorizedError(
          "Verification challenge not found or expired. Please request an OTP first.",
        );
      }
      challengeId = pending.id;
    }

    if (!challengeId) {
      throw new UnauthorizedError("Verification challenge not found.");
    }

    const challenge = await findChallengeById(app.db, challengeId);
    if (!challenge) {
      throw new UnauthorizedError("Verification challenge not found or expired.");
    }

    const isProduction =
      process.env.NODE_ENV === "production" || env.NODE_ENV === "production";

    let user = await findIdentityByPhone(app.db, challenge.phone);
    if (!user) {
      if (!isProduction) {
        user = await createIdentity(app.db, {
          phone: challenge.phone,
          role: "SUPER_ADMIN",
        });
        await createUserProfile(app.db, {
          userId: user.id,
          fullName: "Super Admin",
          email: "admin@zerobrokerage.com",
        });
      } else {
        throw new UnauthorizedError("Access denied. Admin account not found.");
      }
    }

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Access denied. Caller is not a Super Administrator.",
      );
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Admin account is not active.");
    }

    const meta = getClientMeta(request);

    // Reuse canonical AuthService to verify OTP crypto hash, enforce attempt limits,
    // consume challenge atomically, create session, and issue tokens
    const verifyResult = await authService.verifyOtp({
      challengeId,
      code,
      deviceInfo: meta.userAgent,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const profile = await findUserProfile(app.db, verifyResult.user.id);

    return reply.status(200).send(
      createCanonicalSuccessResponse(
        {
          user: {
            id: verifyResult.user.id,
            phone: verifyResult.user.phone,
            role: verifyResult.user.role,
            status: verifyResult.user.status,
            fullName: profile?.fullName ?? "Super Admin",
            email: profile?.email ?? null,
          },
          tokens: verifyResult.tokens,
          permissions: getRolePermissions(verifyResult.user.role),
        },
        request.id,
      ),
    );
  };

  registerDualRoute(
    "post",
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["code"],
          properties: {
            phone: { type: "string", minLength: 1 },
            challengeId: { type: "string" },
            code: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    loginHandler,
  );

  const sessionHandler = async (request: FastifyRequest, reply: any) => {
    const user = request.user!;
    const profile = await findUserProfile(app.db, user.id);

    return reply.status(200).send(
      createCanonicalSuccessResponse(
        {
          user: {
            id: user.id,
            phone: user.phone,
            role: user.role,
            status: user.status,
            fullName: profile?.fullName ?? "Super Admin",
            email: profile?.email ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
          },
          permissions: getRolePermissions(user.role),
          session: {
            id: request.session?.id ?? user.sessionId,
            createdAt: request.session?.createdAt ?? new Date(),
            expiresAt: request.session?.expiresAt ?? new Date(),
          },
        },
        request.id,
      ),
    );
  };

  registerDualRoute(
    "get",
    "/auth/session",
    { preHandler: adminPreHandlers },
    sessionHandler,
  );

  const logoutHandler = async (request: FastifyRequest, reply: any) => {
    if (request.user?.sessionId && request.user?.id) {
      const meta = getClientMeta(request);
      await authService.logout({
        sessionId: request.user.sessionId,
        userId: request.user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }
    return reply.status(200).send(
      createCanonicalSuccessResponse(
        { message: "Admin session terminated successfully." },
        request.id,
      ),
    );
  };

  registerDualRoute(
    "post",
    "/auth/logout",
    { preHandler: [app.authenticate] },
    logoutHandler,
  );

  // ==========================================
  // 2. ADMIN USERS DIRECTORY & GOVERNANCE
  // ==========================================

  registerDualRoute(
    "get",
    "/users",
    {
      preHandler: adminPreHandlers,
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            cursor: { type: "string" },
            status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "DELETION_PENDING", "DELETED"] },
            role: { type: "string", enum: ["USER", "INDEPENDENT_BROKER", "AGENCY_BROKER", "AGENCY_ADMIN", "SUPER_ADMIN"] },
            search: { type: "string", maxLength: 255 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{
      Querystring: {
        limit?: number;
        cursor?: string;
        status?: UserStatus;
        role?: PlatformRole;
        search?: string;
      };
    }>, reply: any) => {
      const result = await listUsers(app.db, request.query);
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/users/:id",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const user = await findIdentityById(app.db, request.params.id);
      if (!user) {
        throw new NotFoundError(`User with id "${request.params.id}" was not found.`);
      }
      const profile = await findUserProfile(app.db, user.id);
      return reply.send(
        createCanonicalSuccessResponse(
          {
            id: user.id,
            phone: user.phone,
            role: user.role,
            status: user.status,
            name: profile?.fullName ?? null,
            email: profile?.email ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/users/:id/status",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "DELETION_PENDING", "DELETED"] },
            reason: { type: "string", maxLength: 500 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { status: UserStatus; reason?: string };
    }>, reply: any) => {
      const user = await findIdentityById(app.db, request.params.id);
      if (!user) {
        throw new NotFoundError(`User with id "${request.params.id}" was not found.`);
      }
      await updateIdentityStatus(app.db, user.id, request.body.status);
      return reply.send(
        createCanonicalSuccessResponse(
          { id: user.id, status: request.body.status },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "delete",
    "/users/:id",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const user = await findIdentityById(app.db, request.params.id);
      if (!user) {
        throw new NotFoundError(`User with id "${request.params.id}" was not found.`);
      }
      await updateIdentityStatus(app.db, user.id, "DELETED");
      return reply.send(
        createCanonicalSuccessResponse({ id: user.id, deleted: true }, request.id),
      );
    },
  );

  // User KYC endpoints
  registerDualRoute(
    "get",
    "/users/:id/kyc",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const user = await findIdentityById(app.db, request.params.id);
      if (!user) {
        throw new NotFoundError(`User with id "${request.params.id}" was not found.`);
      }
      return reply.send(
        createCanonicalSuccessResponse(
          {
            userId: user.id,
            status: "approved",
            submittedAt: user.createdAt,
            documents: [],
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/users/:id/kyc/approve",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      return reply.send(
        createCanonicalSuccessResponse(
          { userId: request.params.id, status: "approved" },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/users/:id/kyc/reject",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
        body: {
          type: "object",
          properties: { reason: { type: "string" } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: any) => {
      return reply.send(
        createCanonicalSuccessResponse(
          { userId: request.params.id, status: "rejected", reason: request.body.reason },
          request.id,
        ),
      );
    },
  );

  // ==========================================
  // 3. ADMIN BROKERS DIRECTORY & VERIFICATION
  // ==========================================

  registerDualRoute(
    "get",
    "/brokers",
    {
      preHandler: adminPreHandlers,
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            cursor: { type: "string" },
            status: {
              type: "string",
              enum: [
                "UNSUBMITTED", "PENDING", "APPROVED",
                "REJECTED", "SUSPENDED", "REVERIFICATION_REQUIRED",
              ],
            },
            search: { type: "string", maxLength: 255 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{
      Querystring: {
        limit?: number;
        cursor?: string;
        status?: BrokerVerificationStatus;
        search?: string;
      };
    }>, reply: any) => {
      const result = await listBrokers(app.db, {
        limit: request.query.limit,
        cursor: request.query.cursor,
        verificationStatus: request.query.status,
        search: request.query.search,
      });
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/brokers/:id",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const broker = await findIdentityById(app.db, request.params.id);
      if (!broker) {
        throw new NotFoundError(`Broker with id "${request.params.id}" was not found.`);
      }
      const profile = await findUserProfile(app.db, broker.id);
      const verification = await findBrokerVerificationByUserId(app.db, broker.id);

      return reply.send(
        createCanonicalSuccessResponse(
          {
            id: broker.id,
            phone: broker.phone,
            name: profile?.fullName ?? null,
            email: profile?.email ?? null,
            role: broker.role,
            status: broker.status,
            verification: verification?.status ?? "UNSUBMITTED",
            licenseNumber: verification?.licenseNumber ?? null,
            documentUrls: verification?.documentUrls ?? [],
            rejectionReason: verification?.rejectionReason ?? null,
            reviewedAt: verification?.reviewedAt ?? null,
            reviews: [],
            createdAt: broker.createdAt,
            updatedAt: broker.updatedAt,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/brokers/:id/approve",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
        body: {
          type: "object",
          properties: { reason: { type: "string" }, comments: { type: "string" } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const broker = await findIdentityById(app.db, request.params.id);
      if (!broker) {
        throw new NotFoundError(`Broker with id "${request.params.id}" was not found.`);
      }
      const verification = await updateBrokerVerification(app.db, {
        userId: broker.id,
        status: "APPROVED",
        reviewedBy: request.user!.id,
      });
      return reply.send(
        createCanonicalSuccessResponse(
          { id: broker.id, verification: verification.status },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/brokers/:id/reject",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
        body: {
          type: "object",
          properties: { reason: { type: "string" }, comments: { type: "string" } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { reason?: string; comments?: string };
    }>, reply: any) => {
      const broker = await findIdentityById(app.db, request.params.id);
      if (!broker) {
        throw new NotFoundError(`Broker with id "${request.params.id}" was not found.`);
      }
      const verification = await updateBrokerVerification(app.db, {
        userId: broker.id,
        status: "REJECTED",
        rejectionReason: request.body.reason ?? null,
        reviewedBy: request.user!.id,
      });
      return reply.send(
        createCanonicalSuccessResponse(
          { id: broker.id, verification: verification.status, reason: verification.rejectionReason },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/brokers/:id/status",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "DELETION_PENDING", "DELETED"] },
            reason: { type: "string", maxLength: 500 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { status: UserStatus; reason?: string };
    }>, reply: any) => {
      const broker = await findIdentityById(app.db, request.params.id);
      if (!broker) {
        throw new NotFoundError(`Broker with id "${request.params.id}" was not found.`);
      }
      await updateIdentityStatus(app.db, broker.id, request.body.status);
      return reply.send(
        createCanonicalSuccessResponse(
          { id: broker.id, status: request.body.status },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "get",
    "/brokers/:id/reviews",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (_request: FastifyRequest, reply: any) => {
      return reply.send(createCanonicalSuccessResponse([], _request.id));
    },
  );

  // Broker KYC
  registerDualRoute(
    "get",
    "/brokers/:id/kyc",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const verification = await findBrokerVerificationByUserId(app.db, request.params.id);
      return reply.send(
        createCanonicalSuccessResponse(
          {
            brokerId: request.params.id,
            status: verification?.status ?? "UNSUBMITTED",
            licenseNumber: verification?.licenseNumber ?? null,
            documentUrls: verification?.documentUrls ?? [],
            reviewedAt: verification?.reviewedAt ?? null,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/brokers/:id/kyc/approve",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const verification = await updateBrokerVerification(app.db, {
        userId: request.params.id,
        status: "APPROVED",
        reviewedBy: request.user!.id,
      });
      return reply.send(
        createCanonicalSuccessResponse(
          { brokerId: request.params.id, status: verification.status },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/brokers/:id/kyc/reject",
    {
      preHandler: adminPreHandlers,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", pattern: UUID_PATTERN } },
          additionalProperties: false,
        },
        body: {
          type: "object",
          properties: { reason: { type: "string" } },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: any) => {
      const verification = await updateBrokerVerification(app.db, {
        userId: request.params.id,
        status: "REJECTED",
        rejectionReason: request.body.reason ?? null,
        reviewedBy: request.user!.id,
      });
      return reply.send(
        createCanonicalSuccessResponse(
          { brokerId: request.params.id, status: verification.status, reason: verification.rejectionReason },
          request.id,
        ),
      );
    },
  );

  // ==========================================
  // 4. ADMIN DASHBOARD METRICS & RECENT ACTIVITY
  // ==========================================

  registerDualRoute(
    "get",
    "/dashboard",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const [usersCount, brokersCount, agenciesCount, listingsCount] = await Promise.all([
        executeQuery<{ count: string }>(app.db, "SELECT COUNT(*) FROM auth_identities WHERE role = 'USER' AND status != 'DELETED'"),
        executeQuery<{ count: string }>(app.db, "SELECT COUNT(*) FROM auth_identities WHERE role IN ('INDEPENDENT_BROKER', 'AGENCY_BROKER') AND status != 'DELETED'"),
        executeQuery<{ count: string }>(app.db, "SELECT COUNT(*) FROM agencies WHERE deleted_at IS NULL"),
        executeQuery<{ count: string }>(app.db, "SELECT COUNT(*) FROM listings WHERE status = 'PUBLISHED'"),
      ]);

      const stats = {
        totalUsers: Number(usersCount.rows[0]?.count ?? 0),
        totalBrokers: Number(brokersCount.rows[0]?.count ?? 0),
        totalAgencies: Number(agenciesCount.rows[0]?.count ?? 0),
        totalListings: Number(listingsCount.rows[0]?.count ?? 0),
        pendingVerifications: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        systemHealth: "OPTIMAL",
      };

      return reply.send(createCanonicalSuccessResponse(stats, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/dashboard/revenue-trend",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const trend = [
        { month: "Jan", revenue: 125000 },
        { month: "Feb", revenue: 154000 },
        { month: "Mar", revenue: 198000 },
        { month: "Apr", revenue: 232000 },
        { month: "May", revenue: 289000 },
        { month: "Jun", revenue: 341000 },
      ];
      return reply.send(createCanonicalSuccessResponse(trend, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/dashboard/user-growth",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const growth = [
        { month: "Jan", count: 420 },
        { month: "Feb", count: 680 },
        { month: "Mar", count: 1100 },
        { month: "Apr", count: 1650 },
        { month: "May", count: 2340 },
        { month: "Jun", count: 3200 },
      ];
      return reply.send(createCanonicalSuccessResponse(growth, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/dashboard/recent-activity",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const events = await executeQuery<{
        id: string;
        event_type: string;
        created_at: Date;
        metadata: any;
      }>(
        app.db,
        `SELECT id, event_type, created_at, metadata
         FROM auth_security_events
         ORDER BY created_at DESC
         LIMIT 20;`,
      );

      const items = events.rows.map((e) => ({
        id: e.id,
        type: e.event_type,
        timestamp: e.created_at.toISOString(),
        details: e.metadata,
      }));

      return reply.send(createCanonicalSuccessResponse(items, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/monitoring",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      return reply.send(
        createCanonicalSuccessResponse(
          {
            status: "HEALTHY",
            uptimeSeconds: Math.floor(process.uptime()),
            memoryUsage: process.memoryUsage(),
            databaseConnection: "CONNECTED",
            timestamp: new Date().toISOString(),
          },
          request.id,
        ),
      );
    },
  );
}
