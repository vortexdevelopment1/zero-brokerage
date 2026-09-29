import crypto from "node:crypto";

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  const codeInt = crypto.randomInt(100000, 1000000);
  return codeInt.toString();
}

/**
 * Hashes an OTP code with salt for secure database storage.
 * Raw OTP codes are NEVER stored in plain text.
 */
export function hashOtpCode(code: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(code.trim()).digest("hex");
}

/**
 * Verifies whether a candidate OTP matches the stored hash in constant time.
 */
export function verifyOtpCode(
  candidateCode: string,
  storedHash: string,
  salt: string,
): boolean {
  const candidateHash = hashOtpCode(candidateCode, salt);
  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

/**
 * Generates a secure random token (e.g. for refresh tokens or session keys).
 */
export function generateSecureRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hashes an opaque token using SHA-256 for persistent indexing and lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
