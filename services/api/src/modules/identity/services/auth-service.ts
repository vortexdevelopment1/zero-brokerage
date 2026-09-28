import type { Pool } from "pg";
import {
  InvalidAccountStateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../../common/errors/index.js";
import { env } from "../../../config/env.js";
import type { OtpDeliveryProvider } from "../providers/otp-provider.js";
import { assertRateLimit } from "../rate-limiting/rate-limiter.js";
import {
  createIdentity,
  createUserProfile,
  findIdentityById,
  findIdentityByPhone,
} from "../repositories/identity-repository.js";
import {
  consumeOtpChallenge,
  createOtpChallenge,
  findChallengeById,
  findLatestPendingChallenge,
  incrementOtpAttempts,
  supersedePendingChallenges,
} from "../repositories/otp-repository.js";
import { recordSecurityEvent } from "../repositories/security-event-repository.js";
import {
  createSession,
  findSessionByTokenHash,
  revokeAllUserSessions,
  revokeSession,
  rotateSessionToken,
} from "../repositories/session-repository.js";
import type {
  AuthIdentity,
  OtpPurpose,
  OtpRequestResult,
  UserTokens,
} from "../types.js";
import {
  generateOtpCode,
  hashOtpCode,
  hashToken,
  verifyOtpCode,
} from "../utils/crypto.js";
import { maskPhoneNumber, normalizePhoneNumber } from "../utils/phone.js";
import { createTokenPair } from "../utils/tokens.js";

export class AuthService {
  constructor(
    private pool: Pool,
    private otpProvider: OtpDeliveryProvider,
  ) {}

  /**
   * Initiates phone authentication by issuing an OTP challenge.
   */
  async requestOtp(params: {
    phone: string;
    purpose?: OtpPurpose | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<OtpRequestResult> {
    const normalizedPhone = normalizePhoneNumber(params.phone);
    const purpose: OtpPurpose = params.purpose ?? "AUTHENTICATION";

    // Reject OTP requests for permanently deleted accounts
    const existingIdentity = await findIdentityByPhone(
      this.pool,
      normalizedPhone,
    );
    if (existingIdentity?.status === "DELETED") {
      throw new InvalidAccountStateError("This account has been deleted.");
    }

    // 1. Rate limiting by phone (max 3 requests per 10 mins) and IP (max 10 requests per hour)
    await assertRateLimit(
      `auth:ratelimit:phone:${normalizedPhone}`,
      { windowSeconds: 600, maxRequests: 3 },
      "Too many OTP requests for this phone number. Please wait before requesting another code.",
    );

    if (params.ipAddress) {
      await assertRateLimit(
        `auth:ratelimit:ip:${params.ipAddress}`,
        { windowSeconds: 3600, maxRequests: 10 },
        "Too many requests from this network. Please try again later.",
      );
    }

    // 2. Check resend cooldown from previous pending challenge
    const existingPending = await findLatestPendingChallenge(
      this.pool,
      normalizedPhone,
      purpose,
    );

    if (existingPending) {
      const elapsedSeconds = Math.floor(
        (Date.now() - existingPending.createdAt.getTime()) / 1000,
      );

      if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds =
          env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        throw new ValidationError(
          `Please wait ${remainingSeconds} seconds before requesting a new code.`,
          [{ field: "phone", message: "Cooldown period active." }],
        );
      }

      // Supersede older pending challenge
      await supersedePendingChallenges(this.pool, normalizedPhone, purpose);
    }

    // 3. Generate secure OTP code and cryptographic hash
    const rawOtp = generateOtpCode();
    const codeHash = hashOtpCode(rawOtp, env.JWT_SECRET);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    // 4. Record challenge in database
    const challenge = await createOtpChallenge(this.pool, {
      phone: normalizedPhone,
      purpose,
      codeHash,
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    // 5. Deliver OTP code via provider
    await this.otpProvider.sendOtp(normalizedPhone, rawOtp, purpose);

    // 6. Record security audit event (NEVER log raw OTP)
    await recordSecurityEvent(this.pool, {
      eventType: "OTP_REQUESTED",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        challengeId: challenge.id,
        phone: maskPhoneNumber(normalizedPhone),
        purpose,
      },
    });

    return {
      challengeId: challenge.id,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  /**
   * Verifies an OTP challenge and creates an authenticated user session.
   */
  async verifyOtp(params: {
    challengeId: string;
    code: string;
    deviceInfo?: string | null | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<{
    user: AuthIdentity;
    tokens: UserTokens;
    isNewUser: boolean;
  }> {
    // 1. Rate limit verification attempts by IP
    if (params.ipAddress) {
      await assertRateLimit(
        `auth:ratelimit:verify:${params.ipAddress}`,
        { windowSeconds: 600, maxRequests: 15 },
        "Too many verification attempts. Please try again later.",
      );
    }

    // 2. Load and validate challenge
    const challenge = await findChallengeById(this.pool, params.challengeId);
    if (!challenge) {
      throw new NotFoundError("Verification challenge not found or expired.");
    }

    if (challenge.status !== "PENDING") {
      throw new UnauthorizedError(
        `Challenge is no longer valid (status: ${challenge.status}). Please request a new code.`,
      );
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError(
        "Verification code has expired. Please request a new code.",
      );
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedError(
        "Maximum verification attempts exceeded. Please request a new code.",
      );
    }

    // 3. Verify code using constant-time hash comparison
    const isCodeValid = verifyOtpCode(
      params.code,
      challenge.codeHash,
      env.JWT_SECRET,
    );

    if (!isCodeValid) {
      const { attempts, maxAttempts, isFailed } = await incrementOtpAttempts(
        this.pool,
        challenge.id,
      );

      await recordSecurityEvent(this.pool, {
        eventType: "OTP_FAILED",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          challengeId: challenge.id,
          phone: maskPhoneNumber(challenge.phone),
          attempts,
          maxAttempts,
        },
      });

      if (isFailed) {
        throw new UnauthorizedError(
          "Maximum verification attempts exceeded. Challenge has been locked.",
        );
      }

      const remaining = maxAttempts - attempts;
      throw new UnauthorizedError(
        `Invalid verification code. ${remaining} attempt(s) remaining.`,
      );
    }

    // 4. Atomically consume the challenge (concurrency guard against duplicate submissions)
    const consumed = await consumeOtpChallenge(this.pool, challenge.id);
    if (!consumed) {
      throw new UnauthorizedError(
        "Verification code was already consumed or is no longer pending.",
      );
    }

    // 5. Lookup or register user
    let user = await findIdentityByPhone(this.pool, challenge.phone);
    let isNewUser = false;

    if (!user) {
      user = await createIdentity(this.pool, {
        phone: challenge.phone,
        role: "USER",
      });
      await createUserProfile(this.pool, {
        userId: user.id,
      });
      isNewUser = true;
    }

    // 6. Check user account status
    if (user.status === "SUSPENDED") {
      throw new InvalidAccountStateError(
        "Your account has been suspended. Please contact support.",
      );
    }

    if (user.status === "DELETED") {
      throw new InvalidAccountStateError("This account has been deleted.");
    }

    // 7. Create authenticated session and token pair
    const sessionExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    // Initial dummy hash to create session record and obtain session ID
    const initialSession = await createSession(this.pool, {
      userId: user.id,
      refreshTokenHash: hashToken(challenge.id + Date.now().toString()),
      deviceInfo: params.deviceInfo,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt: sessionExpiresAt,
    });

    const { tokens, refreshTokenHash } = createTokenPair(
      { id: user.id, role: user.role },
      initialSession.id,
      env.JWT_SECRET,
      env.ACCESS_TOKEN_EXPIRY_SECONDS,
    );

    // Update with real refresh token hash
    await rotateSessionToken(
      this.pool,
      initialSession.id,
      initialSession.refreshTokenHash,
      refreshTokenHash,
      sessionExpiresAt,
    );

    // 8. Record audit events
    await recordSecurityEvent(this.pool, {
      eventType: "OTP_VERIFIED",
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        challengeId: challenge.id,
        phone: maskPhoneNumber(challenge.phone),
        isNewUser,
      },
    });

    await recordSecurityEvent(this.pool, {
      eventType: "SESSION_CREATED",
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        sessionId: initialSession.id,
        deviceInfo: params.deviceInfo,
      },
    });

    return {
      user,
      tokens,
      isNewUser,
    };
  }

  /**
   * Refreshes an expired access token using an active refresh token with rotation.
   */
  async refreshSession(params: {
    refreshToken: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<{ tokens: UserTokens }> {
    if (!params.refreshToken || typeof params.refreshToken !== "string") {
      throw new UnauthorizedError("Refresh token is required.");
    }

    const tokenHash = hashToken(params.refreshToken.trim());
    const session = await findSessionByTokenHash(this.pool, tokenHash);

    if (!session) {
      // Possible token replay attack or invalid token
      throw new UnauthorizedError("Invalid or expired session.");
    }

    if (session.revokedAt) {
      // Token reuse detection: if a revoked token is used, log suspicious activity
      await recordSecurityEvent(this.pool, {
        eventType: "SUSPICIOUS_ACTIVITY",
        userId: session.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          sessionId: session.id,
          reason: "Attempted use of revoked refresh token",
        },
      });

      throw new UnauthorizedError(
        "Session has been revoked. Please log in again.",
      );
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Session has expired. Please log in again.");
    }

    const user = await findIdentityById(this.pool, session.userId);
    if (!user || user.status !== "ACTIVE") {
      throw new InvalidAccountStateError("Account is inactive or suspended.");
    }

    // Rotate refresh token: generate new pair
    const sessionExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const { tokens, refreshTokenHash: newTokenHash } = createTokenPair(
      { id: user.id, role: user.role },
      session.id,
      env.JWT_SECRET,
      env.ACCESS_TOKEN_EXPIRY_SECONDS,
    );

    const rotated = await rotateSessionToken(
      this.pool,
      session.id,
      tokenHash,
      newTokenHash,
      sessionExpiresAt,
    );

    if (!rotated) {
      throw new UnauthorizedError(
        "Session update conflict. Please log in again.",
      );
    }

    return { tokens };
  }

  /**
   * Logs out the current session.
   */
  async logout(params: {
    sessionId: string;
    userId: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<void> {
    await revokeSession(this.pool, params.sessionId, "LOGOUT");

    await recordSecurityEvent(this.pool, {
      eventType: "SESSION_REVOKED",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { sessionId: params.sessionId, reason: "LOGOUT" },
    });
  }

  /**
   * Logs out all sessions for the user across all devices.
   */
  async logoutAll(params: {
    userId: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<void> {
    await revokeAllUserSessions(this.pool, params.userId, "LOGOUT_ALL");

    await recordSecurityEvent(this.pool, {
      eventType: "LOGOUT_ALL",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }
}
