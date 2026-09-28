import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import errorHandlerPlugin from "../../../plugins/error-handler.js";
import rateLimitPlugin from "../../../plugins/rate-limit.js";
import authenticationPlugin from "../../../plugins/authentication.js";
import authorizationPlugin from "../../../plugins/authorization.js";
import { signAccessToken } from "../utils/tokens.js";
import { env } from "../../../config/env.js";
import { createMockDbPool } from "./mock-db-pool.js";

describe("Authorization Guards Integration Tests", () => {
  let app: FastifyInstance;
  let mockPool: any;

  beforeEach(async () => {
    mockPool = createMockDbPool();

    const mockDbPlugin = fp(
      async (f) => {
        f.decorate("db", mockPool);
      },
      { name: "database" },
    );

    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(mockDbPlugin);
    await app.register(rateLimitPlugin);
    await app.register(authenticationPlugin);
    await app.register(authorizationPlugin);

    // Set up test routes protected by various authorization guards
    app.get(
      "/test/broker-only",
      {
        preHandler: [
          app.authenticate,
          app.requireRole(["INDEPENDENT_BROKER", "AGENCY_BROKER"]),
        ],
      },
      async () => ({ success: true, message: "Welcome broker" }),
    );

    app.get(
      "/test/admin-permission",
      {
        preHandler: [
          app.authenticate,
          app.requirePermission("admin:manage_settings"),
        ],
      },
      async () => ({ success: true, message: "Admin setting allowed" }),
    );

    app.get(
      "/test/verified-broker",
      {
        preHandler: [app.authenticate, app.requireBrokerVerified()],
      },
      async () => ({ success: true, message: "Verified broker allowed" }),
    );

    app.get(
      "/test/agency-admin",
      {
        preHandler: [
          app.authenticate,
          app.requireAgencyRole("agency-abc", ["ADMIN"]),
        ],
      },
      async () => ({ success: true, message: "Agency admin allowed" }),
    );

    await app.ready();
  });

  const createTestUser = (userId: string, role: any) => {
    const sessionId = "sess-" + userId;
    mockPool._state.identities.set(userId, {
      id: userId,
      phone: "+919999999999",
      role,
      status: "ACTIVE",
    });
    mockPool._state.sessions.set(sessionId, {
      id: sessionId,
      user_id: userId,
      refresh_token_hash: "hash",
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
    });

    const token = signAccessToken(
      { sub: userId, sessionId, role },
      env.JWT_SECRET,
      900,
    );
    return token;
  };

  it("blocks regular USER from broker-only route (403)", async () => {
    const userToken = createTestUser("u-1", "USER");

    const res = await app.inject({
      method: "GET",
      url: "/test/broker-only",
      headers: { authorization: `Bearer ${userToken}` },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("permits INDEPENDENT_BROKER to broker-only route (200)", async () => {
    const brokerToken = createTestUser("b-1", "INDEPENDENT_BROKER");

    const res = await app.inject({
      method: "GET",
      url: "/test/broker-only",
      headers: { authorization: `Bearer ${brokerToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
  });

  it("blocks non-admin from admin-permission route and permits SUPER_ADMIN", async () => {
    const brokerToken = createTestUser("b-2", "INDEPENDENT_BROKER");
    const adminToken = createTestUser("sa-1", "SUPER_ADMIN");

    const deniedRes = await app.inject({
      method: "GET",
      url: "/test/admin-permission",
      headers: { authorization: `Bearer ${brokerToken}` },
    });
    assert.equal(deniedRes.statusCode, 403);

    const allowedRes = await app.inject({
      method: "GET",
      url: "/test/admin-permission",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(allowedRes.statusCode, 200);
  });

  it("enforces broker verification requirement", async () => {
    const brokerToken = createTestUser("b-3", "INDEPENDENT_BROKER");

    // 1. Without verification record in DB -> 403 (VERIFICATION_REQUIRED)
    const unverifiedRes = await app.inject({
      method: "GET",
      url: "/test/verified-broker",
      headers: { authorization: `Bearer ${brokerToken}` },
    });
    assert.equal(unverifiedRes.statusCode, 403);
    assert.equal(
      JSON.parse(unverifiedRes.payload).error.code,
      "VERIFICATION_REQUIRED",
    );

    // 2. Add approved verification record
    mockPool._state.brokerVerifications.set("b-3", {
      id: "ver-1",
      user_id: "b-3",
      status: "APPROVED",
    });

    const verifiedRes = await app.inject({
      method: "GET",
      url: "/test/verified-broker",
      headers: { authorization: `Bearer ${brokerToken}` },
    });
    assert.equal(verifiedRes.statusCode, 200);
  });

  it("enforces agency membership and role scope", async () => {
    const userToken = createTestUser("u-agency", "AGENCY_BROKER");

    // 1. No membership in agency-abc -> 403
    const noMemRes = await app.inject({
      method: "GET",
      url: "/test/agency-admin",
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.equal(noMemRes.statusCode, 403);

    // 2. Member but role is BROKER (not ADMIN) -> 403
    mockPool._state.agencyMemberships.set("mem-1", {
      id: "mem-1",
      user_id: "u-agency",
      agency_id: "agency-abc",
      role: "BROKER",
      status: "ACTIVE",
    });

    const notAdminRes = await app.inject({
      method: "GET",
      url: "/test/agency-admin",
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.equal(notAdminRes.statusCode, 403);

    // 3. Member updated to ADMIN -> 200
    mockPool._state.agencyMemberships.get("mem-1").role = "ADMIN";

    const adminRes = await app.inject({
      method: "GET",
      url: "/test/agency-admin",
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.equal(adminRes.statusCode, 200);
  });
});
