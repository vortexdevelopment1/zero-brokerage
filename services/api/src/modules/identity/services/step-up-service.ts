import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { withTransaction } from "@zero-brokerage/database";
import {
  ForbiddenError,
  NotFoundError,
  SecurityChallengeRequiredError,
  UnauthorizedError,
} from "../../../common/errors/index.js";
import { env } from "../../../config/env.js";
import type { RedisClientLike } from "../rate-limiting/redis-rate-limiter.js";
import type { OtpDeliveryProvider } from "../providers/otp-provider.js";
import { findIdentityById } from "../repositories/identity-repository.js";
import {
  consumeOtpChallenge,
  createOtpChallenge,
  findChallengeById,
  incrementOtpAttempts,
} from "../repositories/otp-repository.js";
import { recordSecurityEvent } from "../repositories/security-event-repository.js";
import type { OtpRequestResult } from "../types.js";
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from "../utils/crypto.js";

export interface StepUpTokenPayload {
  sub: string;
  sessionId: string;
  challengeId: string;
  nonce: string;
  purpose: "STEP_UP";
  exp: number;
}

export interface StepUpVerificationResult {
  stepUpToken: string;
  expiresInSeconds: number;
}

export interface StepUpNonceStore {
  consume(nonce: string, expiryTimestampSeconds: number): Promise<boolean>;
  clear?(): Promise<void> | void;
}

export interface RedisStepUpNonceStoreOptions {
  client: RedisClientLike;
  keyPrefix?: string | undefined;
}

/**
 * Production distributed step-up nonce store backed by Redis.
 * Uses atomic `SET <key> 1 EX <ttl> NX` command to guarantee single-use
 * replay protection across horizontally scaled API instances.
 * Automatically purges consumed keys using native Redis key TTL.
 */
export class RedisStepUpNonceStore implements StepUpNonceStore {
  private client: RedisClientLike;
  private keyPrefix: string;

  constructor(options: RedisStepUpNonceStoreOptions) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? "stepup:nonce:";
  }

  async consume(
    nonce: string,
    expiryTimestampSeconds: number,
  ): Promise<boolean> {
    const key = `${this.keyPrefix}${nonce}`;
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = Math.max(1, expiryTimestampSeconds - now);

    try {
      // Atomic NX ensures only the first attempt to set the key succeeds
      const result = await this.client.set(key, "1", "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (error) {
      if (error instanceof SecurityChallengeRequiredError) {
        throw error;
      }
      // Production fail closed: block operation if distributed Redis store is unreachable
      throw new SecurityChallengeRequiredError(
        "Step-up verification service is temporarily unavailable. Request blocked for safety.",
      );
    }
  }

  async clear(): Promise<void> {
    // Optional maintenance/testing hook
  }
}

/**
 * Local in-memory step-up nonce store used strictly for development and tests.
 * Prohibited in production by createConfiguredStepUpNonceStore.
 */
export class InMemoryStepUpNonceStore implements StepUpNonceStore {
  private consumedNonces = new Map<string, number>();

  async consume(
    nonce: string,
    expiryTimestampSeconds: number,
  ): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    this.cleanup(now);

    if (this.consumedNonces.has(nonce)) {
      return false; // Already consumed
    }

    this.consumedNonces.set(nonce, expiryTimestampSeconds);
    return true;
  }

  isConsumed(nonce: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    this.cleanup(now);
    return this.consumedNonces.has(nonce);
  }

  private cleanup(nowSeconds: number): void {
    if (this.consumedNonces.size > 1000) {
      for (const [nonce, exp] of this.consumedNonces.entries()) {
        if (exp <= nowSeconds) {
          this.consumedNonces.delete(nonce);
        }
      }
    }
  }

  clear(): void {
    this.consumedNonces.clear();
  }
}

/**
 * Fail-closed nonce store used when Redis is unavailable or unconfigured in production.
 */
export class FailingStepUpNonceStore implements StepUpNonceStore {
  constructor(
    public readonly reason: string = "Distributed step-up replay protection requires a functioning Redis store.",
  ) {}

  async consume(
    _nonce: string,
    _expiryTimestampSeconds: number,
  ): Promise<boolean> {
    throw new SecurityChallengeRequiredError(
      "Step-up verification service is temporarily unavailable. Request blocked for safety.",
    );
  }
}

let activeStepUpNonceStore: StepUpNonceStore = new InMemoryStepUpNonceStore();

export function getStepUpNonceStore(): StepUpNonceStore {
  return activeStepUpNonceStore;
}

export function setStepUpNonceStore(store: StepUpNonceStore): void {
  activeStepUpNonceStore = store;
}

export function createConfiguredStepUpNonceStore(options: {
  nodeEnv?: string | undefined;
  redisClient?: RedisClientLike | undefined;
  keyPrefix?: string | undefined;
}): StepUpNonceStore {
  const isProduction = options.nodeEnv === "production";

  if (options.redisClient) {
    return new RedisStepUpNonceStore({
      client: options.redisClient,
      keyPrefix: options.keyPrefix,
    });
  }

  if (isProduction) {
    // Production MUST fail closed: never allow silent local in-memory fallback
    return new FailingStepUpNonceStore(
      "Redis client not configured for distributed step-up replay protection in production.",
    );
  }

  // Development and test fallback only
  return new InMemoryStepUpNonceStore();
}

/**
 * Singleton proxy allowing transparent backwards-compatibility for existing consumers
 */
export const stepUpNonceStore: StepUpNonceStore = {
  consume: (nonce: string, exp: number) =>
    activeStepUpNonceStore.consume(nonce, exp),
  clear: () => activeStepUpNonceStore.clear?.(),
};

export class StepUpService {
  private nonceStore: StepUpNonceStore;

  constructor(
    private pool: Pool,
    private otpProvider: OtpDeliveryProvider,
    private tokenSecret: string = env.JWT_SECRET,
    nonceStore?: StepUpNonceStore,
  ) {
    this.nonceStore = nonceStore ?? getStepUpNonceStore();
  }

  /**
   * Initiates a step-up challenge for an active Super Admin.
   * Generates a single-use OTP with purpose 'SENSITIVE_ACTION'.
   */
  async requestStepUp(params: {
    userId: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<OtpRequestResult> {
    const user = await findIdentityById(this.pool, params.userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Step-up challenge is restricted to Super Admin actors.",
      );
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenError(
        `Account status "${user.status}" does not permit administrative step-up.`,
      );
    }

    const rawOtp = generateOtpCode();
    const codeHash = hashOtpCode(rawOtp, this.tokenSecret);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    const challenge = await createOtpChallenge(this.pool, {
      phone: user.phone,
      purpose: "SENSITIVE_ACTION",
      codeHash,
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await this.otpProvider.sendOtp(user.phone, rawOtp, "SENSITIVE_ACTION");

    await recordSecurityEvent(this.pool, {
      eventType: "OTP_REQUESTED",
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        purpose: "SENSITIVE_ACTION",
        challengeId: challenge.id,
      },
    });

    return {
      challengeId: challenge.id,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  /**
   * Verifies the step-up OTP challenge and mints a single-use, short-lived step-up token.
   */
  async verifyStepUp(params: {
    userId: string;
    sessionId: string;
    challengeId: string;
    code: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<StepUpVerificationResult> {
    const challenge = await findChallengeById(this.pool, params.challengeId);
    if (!challenge || challenge.purpose !== "SENSITIVE_ACTION") {
      throw new NotFoundError("Step-up challenge not found or invalid.");
    }

    if (
      challenge.status !== "PENDING" ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedError(
        "Step-up verification code has expired. Please request a new code.",
      );
    }

    const isMatch = verifyOtpCode(
      params.code,
      challenge.codeHash,
      this.tokenSecret,
    );

    if (!isMatch) {
      const { isFailed } = await incrementOtpAttempts(this.pool, challenge.id);
      if (isFailed) {
        throw new UnauthorizedError(
          "Maximum step-up verification attempts exceeded. Challenge locked.",
        );
      }
      throw new UnauthorizedError("Invalid step-up verification code.");
    }

    await withTransaction(this.pool, async (tx) => {
      const consumed = await consumeOtpChallenge(tx, challenge.id);
      if (!consumed) {
        throw new UnauthorizedError("Challenge has already been consumed.");
      }

      await recordSecurityEvent(tx, {
        eventType: "OTP_VERIFIED",
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          purpose: "SENSITIVE_ACTION",
          challengeId: challenge.id,
        },
      });
    });

    // Step-up tokens are strictly short-lived (5 minutes / 300 seconds)
    const expiresInSeconds = 300;
    const now = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString("hex");

    const payload: StepUpTokenPayload = {
      sub: params.userId,
      sessionId: params.sessionId,
      challengeId: challenge.id,
      nonce,
      purpose: "STEP_UP",
      exp: now + expiresInSeconds,
    };

    const stepUpToken = this.signStepUpToken(payload);

    return {
      stepUpToken,
      expiresInSeconds,
    };
  }

  /**
   * Cryptographically signs a step-up token using HMAC-SHA256.
   */
  private signStepUpToken(payload: StepUpTokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const signature = createHmac("sha256", this.tokenSecret)
      .update(`stepup.${encodedPayload}`)
      .digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Validates and single-use consumes a step-up token against the authenticated user and session.
   * Throws SecurityChallengeRequiredError on any validation failure.
   */
  async validateAndConsumeStepUpToken(
    rawToken: string | undefined | null,
    expected: { userId: string; sessionId: string },
  ): Promise<StepUpTokenPayload> {
    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      throw new SecurityChallengeRequiredError(
        "Step-up security verification is required for this action. Please complete the security challenge.",
      );
    }

    const trimmed = rawToken.trim();
    const parts = trimmed.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new SecurityChallengeRequiredError(
        "Invalid step-up challenge token format.",
      );
    }

    const [encodedPayload, providedSignature] = parts;

    // Verify cryptographic signature
    const expectedSignature = createHmac("sha256", this.tokenSecret)
      .update(`stepup.${encodedPayload}`)
      .digest("base64url");

    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature),
      )
    ) {
      throw new SecurityChallengeRequiredError(
        "Step-up token cryptographic verification failed.",
      );
    }

    let payload: StepUpTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf-8"),
      );
    } catch {
      throw new SecurityChallengeRequiredError(
        "Malformed step-up token payload.",
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Verify expiration
    if (!payload.exp || payload.exp <= now) {
      throw new SecurityChallengeRequiredError(
        "Step-up challenge token has expired.",
      );
    }

    // Verify token purpose
    if (payload.purpose !== "STEP_UP") {
      throw new SecurityChallengeRequiredError(
        "Invalid token purpose for step-up challenge.",
      );
    }

    // Verify binding to expected user and session
    if (payload.sub !== expected.userId) {
      throw new SecurityChallengeRequiredError(
        "Step-up token is not valid for the current user.",
      );
    }

    if (payload.sessionId !== expected.sessionId) {
      throw new SecurityChallengeRequiredError(
        "Step-up token is not valid for the current session.",
      );
    }

    // Enforce single-use consumption (distributed replay protection)
    const consumed = await this.nonceStore.consume(payload.nonce, payload.exp);
    if (!consumed) {
      throw new SecurityChallengeRequiredError(
        "Step-up token has already been consumed.",
      );
    }

    return payload;
  }
}
