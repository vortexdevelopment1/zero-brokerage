import crypto from "node:crypto";
import { UnauthorizedError } from "../../../common/errors/index.js";
import type { AuthenticatedUser, PlatformRole, UserTokens } from "../types.js";
import { generateSecureRandomToken, hashToken } from "./crypto.js";

export interface AccessTokenPayload {
  sub: string; // userId
  sessionId: string;
  role: PlatformRole;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf.toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/**
 * Signs an access token using HMAC-SHA256.
 */
export function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds: number,
): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AccessTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verifies and decodes an access token.
 * Throws UnauthorizedError if invalid or expired.
 */
export function verifyAccessToken(
  token: string,
  secret: string,
): AccessTokenPayload {
  if (!token || typeof token !== "string") {
    throw new UnauthorizedError("Authentication token is missing.");
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError("Invalid token format.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new UnauthorizedError("Malformed authentication token.");
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expBuffer)
  ) {
    throw new UnauthorizedError("Invalid token signature.");
  }

  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Failed to parse token payload.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new UnauthorizedError("Authentication token has expired.");
  }

  return payload;
}

/**
 * Generates an Access Token and an Opaque Refresh Token pair.
 */
export function createTokenPair(
  user: { id: string; role: PlatformRole },
  sessionId: string,
  secret: string,
  accessExpirySeconds: number,
): {
  tokens: UserTokens;
  refreshToken: string;
  refreshTokenHash: string;
} {
  const accessToken = signAccessToken(
    {
      sub: user.id,
      sessionId,
      role: user.role,
    },
    secret,
    accessExpirySeconds,
  );

  const rawRefreshToken = generateSecureRandomToken(32);
  const refreshTokenHash = hashToken(rawRefreshToken);

  return {
    tokens: {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresInSeconds: accessExpirySeconds,
      tokenType: "Bearer",
    },
    refreshToken: rawRefreshToken,
    refreshTokenHash,
  };
}
