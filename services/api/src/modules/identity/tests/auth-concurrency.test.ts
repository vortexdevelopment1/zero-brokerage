import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { createMockDbPool } from "./mock-db-pool.js";
import { AuthService } from "../services/auth-service.js";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import { hashToken } from "../utils/crypto.js";
import { createSession } from "../repositories/session-repository.js";

describe("Authentication Concurrency & Token Race Protection", () => {
  let pool: Pool;
  let mockState: any;
  let otpProvider: MockOtpDeliveryProvider;
  let authService: AuthService;

  const testUser = {
    id: "user-race-1",
    phone: "+919876501234",
    role: "USER",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    pool = createMockDbPool();
    mockState = (pool as any)._state;
    otpProvider = new MockOtpDeliveryProvider();
    authService = new AuthService(pool, otpProvider);

    mockState.identities.set(testUser.id, { ...testUser });
  });

  it("permits only one refresh to succeed when concurrent requests present the same refresh token", async () => {
    const rawRefreshToken = "shared-active-refresh-token-value";
    const initialTokenHash = hashToken(rawRefreshToken);

    const session = await createSession(pool, {
      userId: testUser.id,
      refreshTokenHash: initialTokenHash,
      deviceInfo: "Test Client",
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent/1.0",
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    assert.ok(session.id);

    // Launch two concurrent refresh attempts using the EXACT same refresh token simultaneously
    const results = await Promise.allSettled([
      authService.refreshSession({
        refreshToken: rawRefreshToken,
        ipAddress: "127.0.0.1",
        userAgent: "Client-A",
      }),
      authService.refreshSession({
        refreshToken: rawRefreshToken,
        ipAddress: "127.0.0.1",
        userAgent: "Client-B",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one must succeed with a new token pair
    assert.equal(
      fulfilled.length,
      1,
      "Exactly one refresh attempt must succeed",
    );
    assert.equal(
      rejected.length,
      1,
      "The competing concurrent refresh attempt must be rejected",
    );

    // The successful one gets new tokens
    const successResult = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    assert.ok(successResult.tokens.accessToken);
    assert.ok(successResult.tokens.refreshToken);

    // The rejected one receives an UnauthorizedError
    const errorResult = (rejected[0] as PromiseRejectedResult).reason;
    assert.equal(errorResult.statusCode, 401);
  });
});
