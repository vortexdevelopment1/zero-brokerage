import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  hashToken,
} from "../utils/crypto.js";

describe("OTP Generation and Cryptographic Utilities", () => {
  const secret = "test-jwt-secret-key-32-chars-long!!";

  it("generates 6-digit numeric OTPs", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      assert.match(code, /^\d{6}$/);
      assert.equal(code.length, 6);
    }
  });

  it("generates distinct codes across calls (CSPRNG distribution)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateOtpCode());
    }
    // High probability of uniqueness across 100 random 6-digit codes
    assert.ok(codes.size > 90);
  });

  it("hashes OTP and verifies matching code correctly", () => {
    const code = "482910";
    const hash = hashOtpCode(code, secret);
    assert.ok(hash.length > 0);
    assert.equal(verifyOtpCode(code, hash, secret), true);
  });

  it("rejects mismatched OTP codes", () => {
    const code = "482910";
    const wrongCode = "482911";
    const hash = hashOtpCode(code, secret);
    assert.equal(verifyOtpCode(wrongCode, hash, secret), false);
  });

  it("produces deterministic SHA-256 token hashes for session lookup", () => {
    const rawToken = "refresh-token-xyz-123";
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64); // 32 bytes hex = 64 characters
  });

  it("produces different hashes for different tokens", () => {
    const hash1 = hashToken("token-a");
    const hash2 = hashToken("token-b");
    assert.notEqual(hash1, hash2);
  });
});
