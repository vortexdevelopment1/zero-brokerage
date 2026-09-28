import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  signAccessToken,
  verifyAccessToken,
  createTokenPair,
} from "../utils/tokens.js";

describe("Token Management (JWT and Refresh Tokens)", () => {
  const secret = "super-secret-key-for-testing-purposes-123";
  const user = {
    id: "user-uuid-1234",
    role: "INDEPENDENT_BROKER" as const,
  };
  const sessionId = "session-uuid-5678";

  it("signs and successfully verifies a valid JWT access token", () => {
    const token = signAccessToken(
      { sub: user.id, sessionId, role: user.role },
      secret,
      900,
    );
    const payload = verifyAccessToken(token, secret);

    assert.equal(payload.sub, user.id);
    assert.equal(payload.role, "INDEPENDENT_BROKER");
    assert.equal(payload.sessionId, sessionId);
    assert.ok(payload.exp > payload.iat);
  });

  it("rejects token with invalid signature or wrong secret", () => {
    const token = signAccessToken(
      { sub: user.id, sessionId, role: user.role },
      secret,
      900,
    );
    assert.throws(
      () => verifyAccessToken(token, "different-wrong-secret-key"),
      { name: "UnauthorizedError" },
    );
  });

  it("rejects expired JWT token", () => {
    // Generate token that expires immediately (-10 seconds)
    const token = signAccessToken(
      { sub: user.id, sessionId, role: user.role },
      secret,
      -10,
    );
    assert.throws(() => verifyAccessToken(token, secret), {
      name: "UnauthorizedError",
    });
  });

  it("creates a complete token pair with opaque refresh token and hashed lookup", () => {
    const { tokens, refreshTokenHash } = createTokenPair(
      user,
      sessionId,
      secret,
      900,
    );

    assert.ok(tokens.accessToken.length > 0);
    assert.ok(tokens.refreshToken.length > 0);
    assert.equal(tokens.tokenType, "Bearer");
    assert.equal(tokens.expiresInSeconds, 900);
    assert.equal(refreshTokenHash.length, 64);
  });
});
