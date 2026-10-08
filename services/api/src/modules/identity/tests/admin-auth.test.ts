import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import errorHandlerPlugin from "../../../plugins/error-handler.js";
import rateLimitPlugin from "../../../plugins/rate-limit.js";
import authenticationPlugin from "../../../plugins/authentication.js";
import authorizationPlugin from "../../../plugins/authorization.js";
import requestContextPlugin from "../../../plugins/request-context.js";
import { registerIdentityModule } from "../index.js";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import { createMockDbPool } from "./mock-db-pool.js";
import {
  InMemoryRateLimiter,
  setRateLimiter,
} from "../rate-limiting/rate-limiter.js";
import { signAccessToken } from "../utils/tokens.js";
import { env } from "../../../config/env.js";

describe("Super Admin Authentication & Governance Regression Suite", () => {
  let app: FastifyInstance;
  let mockPool: any;
  let otpProvider: MockOtpDeliveryProvider;

  const adminPhone = "+919999999999";
  const regularUserPhone = "+918888888888";
  const adminId = "550e8400-e29b-41d4-a716-446655440001";
  const regularUserId = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(async () => {
    // Reset rate limiter and environment
    setRateLimiter(new InMemoryRateLimiter());
    process.env.NODE_ENV = "test";

    mockPool = createMockDbPool();
    otpProvider = new MockOtpDeliveryProvider();

    // Pre-seed an active SUPER_ADMIN
    mockPool._state.identities.set(adminId, {
      id: adminId,
      phone: adminPhone,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockPool._state.profiles.set(adminId, {
      user_id: adminId,
      full_name: "Super Admin",
      email: "admin@zerobrokerage.com",
    });

    // Pre-seed an active regular USER
    mockPool._state.identities.set(regularUserId, {
      id: regularUserId,
      phone: regularUserPhone,
      role: "USER",
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockPool._state.profiles.set(regularUserId, {
      user_id: regularUserId,
      full_name: "Regular User",
      email: "user@example.com",
    });

    const mockDbPlugin = fp(
      async (f) => {
        f.decorate("db", mockPool);
      },
      { name: "database" },
    );

    app = Fastify();
    await app.register(requestContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(mockDbPlugin);
    await app.register(rateLimitPlugin);
    await app.register(authenticationPlugin);
    await app.register(authorizationPlugin);
    await registerIdentityModule(app, { otpProvider });
    await app.ready();
  });

  // a. Valid admin authentication
  it("a. authenticates SUPER_ADMIN successfully with valid OTP and returns canonical session & tokens", async () => {
    // Request OTP for super admin
    const reqRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/request-otp",
      payload: { phone: adminPhone },
    });

    assert.equal(reqRes.statusCode, 200);
    const reqBody = JSON.parse(reqRes.payload);
    const challengeId = reqBody.data.challengeId;
    assert.ok(challengeId);

    const otpCode = otpProvider.getLastOtp(adminPhone);
    assert.ok(otpCode);

    // Login with valid code
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/login",
      payload: {
        challengeId,
        code: otpCode,
      },
    });

    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.payload);
    assert.equal(loginBody.data.user.role, "SUPER_ADMIN");
    assert.equal(loginBody.data.user.phone, adminPhone);
    assert.ok(loginBody.data.tokens.accessToken);
    assert.ok(loginBody.data.tokens.refreshToken);
    assert.ok(Array.isArray(loginBody.data.permissions));
  });

  // b. Invalid OTP
  it("b. rejects admin login when OTP code is incorrect with 401 Unauthorized", async () => {
    const reqRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/request-otp",
      payload: { phone: adminPhone },
    });
    const reqBody = JSON.parse(reqRes.payload);
    const challengeId = reqBody.data.challengeId;

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/login",
      payload: {
        challengeId,
        code: "000000",
      },
    });

    assert.equal(loginRes.statusCode, 401);
    const loginBody = JSON.parse(loginRes.payload);
    assert.match(loginBody.error.message, /Invalid verification code/);
  });

  // c. Non-admin user attempting admin authentication
  it("c. rejects non-admin user attempting admin authentication with 403 Forbidden", async () => {
    // Attempt request-otp on admin route with a non-admin phone
    const reqRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/request-otp",
      payload: { phone: regularUserPhone },
    });

    assert.equal(reqRes.statusCode, 403);
    const reqBody = JSON.parse(reqRes.payload);
    assert.match(reqBody.error.message, /not an authorized Super Administrator/);
  });

  // d. Unknown phone in production
  it("d. rejects unknown phone number in production without creating admin account", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const unknownPhone = "+919111111111";
      const reqRes = await app.inject({
        method: "POST",
        url: "/api/v1/admin/auth/request-otp",
        payload: { phone: unknownPhone },
      });

      assert.equal(reqRes.statusCode, 401);
      const reqBody = JSON.parse(reqRes.payload);
      assert.match(reqBody.error.message, /Admin account not found/);

      // Verify no identity was created in the database
      const createdUser = Array.from(mockPool._state.identities.values()).find(
        (u: any) => u.phone === unknownPhone,
      );
      assert.equal(createdUser, undefined);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // e. Allowed development bootstrap in non-production
  it("e. allows development bootstrap for unknown phone in non-production with valid OTP", async () => {
    process.env.NODE_ENV = "development";
    const newAdminPhone = "+919222222222";

    const reqRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/request-otp",
      payload: { phone: newAdminPhone },
    });

    assert.equal(reqRes.statusCode, 200);
    const reqBody = JSON.parse(reqRes.payload);
    const challengeId = reqBody.data.challengeId;

    const otpCode = otpProvider.getLastOtp(newAdminPhone);
    assert.ok(otpCode);

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/login",
      payload: {
        challengeId,
        code: otpCode,
      },
    });

    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.payload);
    assert.equal(loginBody.data.user.role, "SUPER_ADMIN");
    assert.equal(loginBody.data.user.phone, newAdminPhone);
  });

  // f. Authenticated SUPER_ADMIN accessing protected admin routes
  it("f. permits authenticated SUPER_ADMIN to access protected admin routes", async () => {
    const adminSessionId = "sess-admin-1";
    mockPool._state.sessions.set(adminSessionId, {
      id: adminSessionId,
      user_id: adminId,
      refresh_token_hash: "hash",
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
    });

    const adminToken = signAccessToken(
      { sub: adminId, sessionId: adminSessionId, role: "SUPER_ADMIN" },
      env.JWT_SECRET,
      900,
    );

    const sessionRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/session",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    assert.equal(sessionRes.statusCode, 200);
    const body = JSON.parse(sessionRes.payload);
    assert.equal(body.data.user.role, "SUPER_ADMIN");
    assert.ok(Array.isArray(body.data.permissions));
  });

  // g. Unauthenticated request receiving 401
  it("g. rejects unauthenticated requests to admin routes with 401 Unauthorized", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/session",
    });

    assert.equal(res.statusCode, 401);
  });

  // h. Authenticated non-admin receiving 403
  it("h. rejects authenticated non-admin accessing protected admin routes with 403 Forbidden", async () => {
    const userSessionId = "sess-user-1";
    mockPool._state.sessions.set(userSessionId, {
      id: userSessionId,
      user_id: regularUserId,
      refresh_token_hash: "hash",
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
    });

    const userToken = signAccessToken(
      { sub: regularUserId, sessionId: userSessionId, role: "USER" },
      env.JWT_SECRET,
      900,
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/session",
      headers: { authorization: `Bearer ${userToken}` },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error.code, "FORBIDDEN");
    assert.ok(body.error.message.includes("sufficient platform privilege"));
  });

  // Dual route compatibility for frontend
  it("supports dual frontend route /api/admin/auth/login and logout lifecycle", async () => {
    const reqRes = await app.inject({
      method: "POST",
      url: "/api/admin/auth/request-otp",
      payload: { phone: adminPhone },
    });
    assert.equal(reqRes.statusCode, 200);
    const challengeId = JSON.parse(reqRes.payload).data.challengeId;
    const otpCode = otpProvider.getLastOtp(adminPhone)!;

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/admin/auth/login",
      payload: {
        phone: adminPhone,
        code: otpCode,
      },
    });

    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.payload);
    const token = loginBody.data.tokens.accessToken;

    // Logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/admin/auth/logout",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(logoutRes.statusCode, 200);
  });
});
