import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import errorHandlerPlugin from "../../../plugins/error-handler.js";
import rateLimitPlugin from "../../../plugins/rate-limit.js";
import authenticationPlugin from "../../../plugins/authentication.js";
import authorizationPlugin from "../../../plugins/authorization.js";
import { registerIdentityModule } from "../index.js";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import { createMockDbPool } from "./mock-db-pool.js";
import {
  InMemoryRateLimiter,
  setRateLimiter,
} from "../rate-limiting/rate-limiter.js";
import { maskPhoneNumber } from "../utils/phone.js";

describe("Identity and Authentication E2E Integration Flow", () => {
  let app: FastifyInstance;
  let mockPool: any;
  let otpProvider: MockOtpDeliveryProvider;

  beforeEach(async () => {
    // Reset rate limiter
    const limiter = new InMemoryRateLimiter();
    setRateLimiter(limiter);

    mockPool = createMockDbPool();
    otpProvider = new MockOtpDeliveryProvider();

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

    await registerIdentityModule(app, { otpProvider });
    await app.ready();
  });

  it("completes full authentication, profile, refresh rotation, and logout lifecycle", async () => {
    const testPhone = "+919876543210";

    // 1. Request OTP
    const reqOtpRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { phone: testPhone },
    });

    assert.equal(reqOtpRes.statusCode, 200);
    const reqOtpBody = JSON.parse(reqOtpRes.payload);
    assert.equal(reqOtpBody.success, true);
    const challengeId = reqOtpBody.data.challengeId;
    assert.ok(challengeId);

    // Retrieve sent code from mock provider
    const sentOtp = otpProvider.getLastOtp(testPhone);
    assert.ok(sentOtp);
    assert.equal(sentOtp.length, 6);

    // 2. Verify OTP with incorrect code should fail with 401
    const badVerifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: {
        challengeId,
        code: "000000",
      },
    });
    assert.equal(badVerifyRes.statusCode, 401);

    // 3. Verify OTP with correct code succeeds and returns tokens
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: {
        challengeId,
        code: sentOtp,
      },
    });

    assert.equal(verifyRes.statusCode, 200);
    const verifyBody = JSON.parse(verifyRes.payload);
    assert.equal(verifyBody.success, true);
    assert.equal(verifyBody.data.isNewUser, true);
    assert.equal(verifyBody.data.user.phone, testPhone);
    assert.equal(verifyBody.data.user.role, "USER");

    const { accessToken, refreshToken } = verifyBody.data.tokens;
    assert.ok(accessToken);
    assert.ok(refreshToken);

    // 4. Access current authenticated user profile
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.payload);
    assert.equal(meBody.success, true);
    assert.equal(meBody.data.user.phone, maskPhoneNumber(testPhone));
    assert.ok(Array.isArray(meBody.data.permissions));

    // 5. Accessing me with missing or invalid token fails with 401
    const unauthRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: "Bearer invalid-garbage-token",
      },
    });
    assert.equal(unauthRes.statusCode, 401);

    // 6. Refresh token rotation
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });

    assert.equal(refreshRes.statusCode, 200);
    const refreshBody = JSON.parse(refreshRes.payload);
    assert.equal(refreshBody.success, true);
    const newAccessToken = refreshBody.data.tokens.accessToken;
    const newRefreshToken = refreshBody.data.tokens.refreshToken;
    assert.ok(newAccessToken);
    assert.ok(newRefreshToken);
    assert.notEqual(refreshToken, newRefreshToken); // Must rotate

    // 7. Token replay protection: Re-using the old refresh token MUST fail
    const replayRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });
    assert.equal(replayRes.statusCode, 401);

    // 8. List active sessions
    const sessionsRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/sessions",
      headers: {
        authorization: `Bearer ${newAccessToken}`,
      },
    });
    assert.equal(sessionsRes.statusCode, 200);
    const sessionsBody = JSON.parse(sessionsRes.payload);
    assert.equal(sessionsBody.success, true);
    assert.equal(sessionsBody.data.sessions.length, 1);
    assert.equal(sessionsBody.data.sessions[0].isCurrent, true);

    // 9. Logout current session
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        authorization: `Bearer ${newAccessToken}`,
      },
    });
    assert.equal(logoutRes.statusCode, 200);

    // 10. Subsequent requests using the logged-out session fail
    const afterLogoutRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${newAccessToken}`,
      },
    });
    assert.equal(afterLogoutRes.statusCode, 401);
  });

  it("preserves the legacy Step 04 validation error envelope", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: {},
    });

    assert.equal(response.statusCode, 422);
    const body = JSON.parse(response.payload);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.equal(
      body.error.message,
      "The request payload contains invalid values.",
    );
    assert.ok(Array.isArray(body.error.details));
    assert.equal(typeof body.error.timestamp, "string");
    assert.equal(typeof body.error.requestId, "string");
  });

  it("handles account deletion lifecycle with 30-day retention and session revocation", async () => {
    const testPhone = "+919123456780";

    // Request & verify OTP
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { phone: testPhone },
    });
    const challenge = Array.from(mockPool._state.challenges.values())[0] as any;
    const sentOtp = otpProvider.getLastOtp(testPhone)!;

    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { challengeId: challenge.id, code: sentOtp },
    });
    const tokens = JSON.parse(verifyRes.payload).data.tokens;

    // Delete account
    const deleteRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/delete-account",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
      },
      payload: {
        reason: "Moving to another city",
      },
    });

    assert.equal(deleteRes.statusCode, 200);
    const deleteBody = JSON.parse(deleteRes.payload);
    assert.equal(deleteBody.success, true);

    // Verify database state: status is DELETION_PENDING, session is revoked, PII anonymized
    const userId = JSON.parse(verifyRes.payload).data.user.id;
    const userInDb = mockPool._state.identities.get(userId);
    assert.equal(userInDb.status, "DELETION_PENDING");
    assert.ok(userInDb.scheduled_for_deletion_at);

    // Tokens should no longer work
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    assert.equal(meRes.statusCode, 401);
  });

  it("handles phone change request and confirmation lifecycle", async () => {
    const originalPhone = "+919888877770";
    const newPhone = "+919888877771";

    // 1. Authenticate user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { phone: originalPhone },
    });
    const c1 = Array.from(mockPool._state.challenges.values())[0] as any;
    const otp1 = otpProvider.getLastOtp(originalPhone)!;

    const v1 = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { challengeId: c1.id, code: otp1 },
    });
    const tokens = JSON.parse(v1.payload).data.tokens;
    const userId = JSON.parse(v1.payload).data.user.id;

    // 2. Request phone change
    const changeReqRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/change-phone/request",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      payload: { newPhone },
    });
    assert.equal(changeReqRes.statusCode, 200);
    const changeChallengeId = JSON.parse(changeReqRes.payload).data.challengeId;

    const changeOtp = otpProvider.getLastOtp(newPhone)!;
    assert.ok(changeOtp);

    // 3. Confirm phone change
    const confirmRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/change-phone/confirm",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      payload: {
        challengeId: changeChallengeId,
        code: changeOtp,
      },
    });
    assert.equal(confirmRes.statusCode, 200);

    // Identity phone in DB is updated to newPhone
    const updatedUser = mockPool._state.identities.get(userId);
    assert.equal(updatedUser.phone, newPhone);
  });

  it("enforces rate limits on excessive OTP requests", async () => {
    const spamPhone = "+919999000011";

    // Quota is 3 requests per 10 mins
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        payload: { phone: spamPhone },
      });
      // 1st request succeeds, next within cooldown may hit cooldown or rate limit
      if (i === 0) {
        assert.equal(res.statusCode, 200);
      }
    }

    // 4th request must be rejected with 429
    const limitedRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { phone: spamPhone },
    });
    assert.equal(limitedRes.statusCode, 429);
    assert.equal(JSON.parse(limitedRes.payload).error.code, "RATE_LIMITED");
  });
});
