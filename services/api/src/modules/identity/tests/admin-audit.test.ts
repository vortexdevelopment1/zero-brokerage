import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { Pool } from "pg";

import { createMockDbPool } from "./mock-db-pool.js";
import errorHandlerPlugin from "../../../plugins/error-handler.js";
import databasePlugin from "../../../plugins/database.js";
import authenticationPlugin from "../../../plugins/authentication.js";
import authorizationPlugin from "../../../plugins/authorization.js";
import { signAccessToken } from "../utils/tokens.js";
import { env } from "../../../config/env.js";
import {
  recordAdminPrivilegeUsed,
  sanitizeAuditMetadata,
} from "../authorization/admin-audit.js";
import { StepUpService } from "../services/step-up-service.js";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import type { PlatformRole } from "../types.js";

describe("Super Admin Sensitive-Action Auditing and Guards", () => {
  let app: FastifyInstance;
  let pool: Pool;
  let mockState: any;
  let otpProvider: MockOtpDeliveryProvider;
  let stepUpService: StepUpService;

  const superAdminUser = {
    id: "admin-uuid-1",
    phone: "+919876543210",
    role: "SUPER_ADMIN" as PlatformRole,
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const regularUser = {
    id: "user-uuid-2",
    phone: "+919876543211",
    role: "USER" as PlatformRole,
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const adminSession = {
    id: "session-uuid-1",
    user_id: superAdminUser.id,
    refresh_token_hash: "hash-admin",
    device_info: "Test Device",
    ip_address: "127.0.0.1",
    user_agent: "SuperAdminApp/1.0",
    expires_at: new Date(Date.now() + 86400000),
    last_used_at: new Date(),
    revoked_at: null,
    revocation_reason: null,
    created_at: new Date(),
  };

  const regularSession = {
    id: "session-uuid-2",
    user_id: regularUser.id,
    refresh_token_hash: "hash-regular",
    device_info: "Test Device",
    ip_address: "127.0.0.1",
    user_agent: "Mobile/1.0",
    expires_at: new Date(Date.now() + 86400000),
    last_used_at: new Date(),
    revoked_at: null,
    revocation_reason: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    pool = createMockDbPool();
    mockState = (pool as any)._state;
    otpProvider = new MockOtpDeliveryProvider();
    stepUpService = new StepUpService(pool, otpProvider, env.JWT_SECRET);

    mockState.identities.set(superAdminUser.id, { ...superAdminUser });
    mockState.identities.set(regularUser.id, { ...regularUser });
    mockState.sessions.set(adminSession.id, { ...adminSession });
    mockState.sessions.set(regularSession.id, { ...regularSession });

    const mockDbPlugin = fp(
      async (f) => {
        f.decorate("db", pool);
      },
      { name: "database" },
    );

    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(mockDbPlugin);
    await app.register(authenticationPlugin);
    await app.register(authorizationPlugin);

    // Register test route for sensitive admin action requiring step-up
    app.post(
      "/test/admin/sensitive-action",
      {
        preHandler: [
          app.authenticate,
          app.requireSensitiveAdminAction({
            permission: "admin:system_operations",
            action: "PURGE_TEMP_STORAGE",
            resourceType: "SYSTEM",
            requiresStepUp: true,
          }),
        ],
      },
      async (_req, reply) => {
        return reply.status(200).send({ success: true, executed: true });
      },
    );

    await app.ready();
  });

  function createAuthHeader(
    user: { id: string; role: PlatformRole },
    sessionId: string,
  ) {
    const token = signAccessToken(
      { sub: user.id, role: user.role, sessionId },
      env.JWT_SECRET,
      900,
    );
    return `Bearer ${token}`;
  }

  it("sanitizes metadata by stripping passwords, tokens, OTPs, and secrets", () => {
    const dirty = {
      actionTarget: "broker-42",
      password: "PlainTextPassword123!",
      userToken: "jwt.secret.token",
      otpCode: "123456",
      authorizationHeader: "Bearer abc.def",
      nested: {
        refreshToken: "refresh-secret",
        normalKey: "safeValue",
      },
    };

    const clean = sanitizeAuditMetadata(dirty);

    assert.equal(clean.actionTarget, "broker-42");
    assert.equal(clean.password, "[REDACTED]");
    assert.equal(clean.userToken, "[REDACTED]");
    assert.equal(clean.otpCode, "[REDACTED]");
    assert.equal(clean.authorizationHeader, "[REDACTED]");
    assert.equal((clean.nested as any).refreshToken, "[REDACTED]");
    assert.equal((clean.nested as any).normalKey, "safeValue");
  });

  it("rejects unauthorized role attempting to invoke sensitive administrative action (403)", async () => {
    const regularToken = createAuthHeader(regularUser, regularSession.id);

    const res = await app.inject({
      method: "POST",
      url: "/test/admin/sensitive-action",
      headers: { authorization: regularToken },
      payload: { reason: "Attempt unauthorized access" },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("rejects authorized Super Admin without step-up challenge (403 SECURITY_CHALLENGE_REQUIRED)", async () => {
    const adminToken = createAuthHeader(superAdminUser, adminSession.id);

    const res = await app.inject({
      method: "POST",
      url: "/test/admin/sensitive-action",
      headers: { authorization: adminToken },
      payload: { reason: "Missing step-up token" },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error.code, "SECURITY_CHALLENGE_REQUIRED");
  });

  it("authorizes Super Admin with valid step-up and persists sanitized ADMIN_PRIVILEGE_USED audit event", async () => {
    const adminToken = createAuthHeader(superAdminUser, adminSession.id);

    // 1. Complete step-up challenge
    const challengeRes = await stepUpService.requestStepUp({
      userId: superAdminUser.id,
    });
    const otp = otpProvider.getLastOtp(superAdminUser.phone)!;
    const { stepUpToken } = await stepUpService.verifyStepUp({
      userId: superAdminUser.id,
      sessionId: adminSession.id,
      challengeId: challengeRes.challengeId,
      code: otp,
    });

    // 2. Perform sensitive action with step-up token header
    const res = await app.inject({
      method: "POST",
      url: "/test/admin/sensitive-action",
      headers: {
        authorization: adminToken,
        "x-step-up-token": stepUpToken,
      },
      payload: {
        reason: "Scheduled maintenance",
        password: "should-be-sanitized",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.executed, true);

    // 3. Verify ADMIN_PRIVILEGE_USED event in audit repository
    const auditEvent = mockState.securityEvents.find(
      (e: any) =>
        e.eventType === "ADMIN_PRIVILEGE_USED" &&
        e.userId === superAdminUser.id,
    );
    assert.ok(auditEvent);
    assert.equal(auditEvent.metadata.action, "PURGE_TEMP_STORAGE");
    assert.equal(auditEvent.metadata.resourceType, "SYSTEM");
    assert.equal(auditEvent.metadata.reason, "Scheduled maintenance");
    assert.equal(auditEvent.metadata.password, "[REDACTED]");
  });
});
