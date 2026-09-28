import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import {
  StepUpService,
  stepUpNonceStore,
  RedisStepUpNonceStore,
  createConfiguredStepUpNonceStore,
} from "../services/step-up-service.js";
import type { RedisClientLike } from "../rate-limiting/redis-rate-limiter.js";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import { createMockDbPool } from "./mock-db-pool.js";
import { SecurityChallengeRequiredError } from "../../../common/errors/index.js";

describe("Super Admin Step-Up Authentication", () => {
  let pool: Pool;
  let mockState: any;
  let otpProvider: MockOtpDeliveryProvider;
  let stepUpService: StepUpService;

  const adminUser = {
    id: "admin-super-1",
    phone: "+919876500001",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const regularUser = {
    id: "regular-user-1",
    phone: "+919876500002",
    role: "USER",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sessionId = "session-admin-1";

  beforeEach(() => {
    pool = createMockDbPool();
    mockState = (pool as any)._state;
    otpProvider = new MockOtpDeliveryProvider();
    stepUpService = new StepUpService(
      pool,
      otpProvider,
      "test-super-secret-key-32-chars-long",
    );
    stepUpNonceStore.clear?.();

    mockState.identities.set(adminUser.id, { ...adminUser });
    mockState.identities.set(regularUser.id, { ...regularUser });
  });

  it("prohibits non-SUPER_ADMIN actors from requesting step-up", async () => {
    await assert.rejects(
      () => stepUpService.requestStepUp({ userId: regularUser.id }),
      { name: "ForbiddenError" },
    );
  });

  it("initiates step-up challenge, dispatches OTP, and records OTP_REQUESTED security event", async () => {
    const res = await stepUpService.requestStepUp({
      userId: adminUser.id,
      ipAddress: "192.168.1.1",
      userAgent: "AdminPortal/1.0",
    });

    assert.ok(res.challengeId);
    assert.equal(res.expiresInSeconds, 300);

    const sentOtp = otpProvider.getLastOtp(adminUser.phone);
    assert.ok(sentOtp);
    assert.match(sentOtp, /^\d{6}$/);

    // Verify security event
    const event = mockState.securityEvents.find(
      (e: any) => e.eventType === "OTP_REQUESTED" && e.userId === adminUser.id,
    );
    assert.ok(event);
    assert.equal(event.metadata.purpose, "SENSITIVE_ACTION");
    assert.equal(event.metadata.challengeId, res.challengeId);
    // Secrets must NOT be logged
    assert.equal(event.metadata.code, undefined);
  });

  it("verifies OTP and mints short-lived single-use step-up token", async () => {
    const challengeRes = await stepUpService.requestStepUp({
      userId: adminUser.id,
    });
    const code = otpProvider.getLastOtp(adminUser.phone)!;

    const verifyRes = await stepUpService.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    assert.ok(verifyRes.stepUpToken);
    assert.equal(verifyRes.expiresInSeconds, 300);

    // Verify challenge consumed
    const challenge = mockState.challenges.get(challengeRes.challengeId);
    assert.equal(challenge.status, "VERIFIED");
    assert.ok(challenge.consumed_at);

    // Verify security event
    const event = mockState.securityEvents.find(
      (e: any) => e.eventType === "OTP_VERIFIED" && e.userId === adminUser.id,
    );
    assert.ok(event);
    assert.equal(event.metadata.purpose, "SENSITIVE_ACTION");
  });

  it("throws SecurityChallengeRequiredError when step-up token is missing", async () => {
    await assert.rejects(
      () =>
        stepUpService.validateAndConsumeStepUpToken(undefined, {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.code === "SECURITY_CHALLENGE_REQUIRED",
    );
  });

  it("throws SecurityChallengeRequiredError when step-up token is corrupted or invalid", async () => {
    await assert.rejects(
      () =>
        stepUpService.validateAndConsumeStepUpToken("invalid.token.structure", {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.code === "SECURITY_CHALLENGE_REQUIRED",
    );
  });

  it("throws SecurityChallengeRequiredError when step-up token has expired", async () => {
    const expiredService = new StepUpService(
      pool,
      otpProvider,
      "test-super-secret-key-32-chars-long",
    );

    const challengeRes = await expiredService.requestStepUp({
      userId: adminUser.id,
    });
    const code = otpProvider.getLastOtp(adminUser.phone)!;

    const { stepUpToken } = await expiredService.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    // Manually forge payload with past exp
    const parts = stepUpToken.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[0]!, "base64url").toString("utf-8"),
    );
    payload.exp = Math.floor(Date.now() / 1000) - 100; // in the past

    // Re-sign with expired service
    const expiredToken = (expiredService as any).signStepUpToken(payload);

    await assert.rejects(
      () =>
        expiredService.validateAndConsumeStepUpToken(expiredToken, {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.message.includes("expired"),
    );
  });

  it("throws SecurityChallengeRequiredError when step-up token is used by wrong user or session", async () => {
    const challengeRes = await stepUpService.requestStepUp({
      userId: adminUser.id,
    });
    const code = otpProvider.getLastOtp(adminUser.phone)!;

    const { stepUpToken } = await stepUpService.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    // Attempt to use with wrong user
    await assert.rejects(
      () =>
        stepUpService.validateAndConsumeStepUpToken(stepUpToken, {
          userId: "attacker-user-id",
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.message.includes("current user"),
    );

    // Attempt to use with wrong session
    await assert.rejects(
      () =>
        stepUpService.validateAndConsumeStepUpToken(stepUpToken, {
          userId: adminUser.id,
          sessionId: "unrelated-session-id",
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.message.includes("current session"),
    );
  });

  it("allows single-use consumption and strictly prevents replay attempts", async () => {
    const challengeRes = await stepUpService.requestStepUp({
      userId: adminUser.id,
    });
    const code = otpProvider.getLastOtp(adminUser.phone)!;

    const { stepUpToken } = await stepUpService.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    // 1st consumption: succeeds
    const payload = await stepUpService.validateAndConsumeStepUpToken(
      stepUpToken,
      {
        userId: adminUser.id,
        sessionId,
      },
    );
    assert.equal(payload.sub, adminUser.id);
    assert.equal(payload.purpose, "STEP_UP");

    // 2nd consumption (replay attempt): must fail with SecurityChallengeRequiredError
    await assert.rejects(
      () =>
        stepUpService.validateAndConsumeStepUpToken(stepUpToken, {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.message.includes("already been consumed"),
    );
  });
});

class MockRedisStoreClient implements RedisClientLike {
  public store = new Map<string, { value: string; expiresAtMs: number }>();
  public failNext = false;
  public mockNowOffsetMs = 0;

  private getNow(): number {
    return Date.now() + this.mockNowOffsetMs;
  }

  async eval(
    _script: string,
    _numkeys: number,
    ..._args: (string | number)[]
  ): Promise<any> {
    return [1, 10, 60];
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async set(
    key: string,
    value: string | number,
    mode?: string,
    duration?: number,
    flag?: string,
  ): Promise<string | null> {
    if (this.failNext) {
      throw new Error("Redis cluster node disconnected");
    }

    const now = this.getNow();
    const existing = this.store.get(key);
    const isAlive = existing !== undefined && existing.expiresAtMs > now;

    if (flag === "NX" && isAlive) {
      return null;
    }

    const ttlMs =
      mode === "EX" && duration !== undefined ? duration * 1000 : 86400000;
    this.store.set(key, { value: String(value), expiresAtMs: now + ttlMs });
    return "OK";
  }
}

describe("Distributed Step-Up Replay Protection (Redis-backed)", () => {
  const adminUser = {
    id: "admin-super-dist-1",
    phone: "+919876500001",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sessionId = "session-admin-dist-1";

  let redisClient: MockRedisStoreClient;
  let redisNonceStore: RedisStepUpNonceStore;
  let pool: Pool;
  let otpProvider: MockOtpDeliveryProvider;
  let serviceA: StepUpService;
  let serviceB: StepUpService;

  beforeEach(() => {
    pool = createMockDbPool();
    const mockState = (pool as any)._state;
    mockState.identities.set(adminUser.id, { ...adminUser });
    otpProvider = new MockOtpDeliveryProvider();

    redisClient = new MockRedisStoreClient();
    redisNonceStore = new RedisStepUpNonceStore({ client: redisClient });

    // Both instances share the exact same Redis backing store
    serviceA = new StepUpService(
      pool,
      otpProvider,
      "test-super-secret-key-32-chars-long",
      redisNonceStore,
    );
    serviceB = new StepUpService(
      pool,
      otpProvider,
      "test-super-secret-key-32-chars-long",
      redisNonceStore,
    );
  });

  it("A & B: first nonce consumption succeeds and second consumption fails (single-use)", async () => {
    const challengeRes = await serviceA.requestStepUp({ userId: adminUser.id });
    const code = otpProvider.getLastOtp(adminUser.phone)!;
    const { stepUpToken } = await serviceA.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    // 1st consumption: succeeds
    const payload = await serviceA.validateAndConsumeStepUpToken(stepUpToken, {
      userId: adminUser.id,
      sessionId,
    });
    assert.equal(payload.sub, adminUser.id);
    assert.equal(payload.purpose, "STEP_UP");

    // 2nd consumption: fails
    await assert.rejects(
      () =>
        serviceA.validateAndConsumeStepUpToken(stepUpToken, {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.message.includes("already been consumed"),
    );
  });

  it("C: two distinct StepUpService instances sharing Redis cannot both consume the same nonce", async () => {
    const challengeRes = await serviceA.requestStepUp({ userId: adminUser.id });
    const code = otpProvider.getLastOtp(adminUser.phone)!;
    const { stepUpToken } = await serviceA.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    // API Instance A consumes token -> succeeds
    const payloadA = await serviceA.validateAndConsumeStepUpToken(stepUpToken, {
      userId: adminUser.id,
      sessionId,
    });
    assert.equal(payloadA.sub, adminUser.id);

    // Horizontally scaled API Instance B attempts to consume same token -> strictly fails
    await assert.rejects(
      () =>
        serviceB.validateAndConsumeStepUpToken(stepUpToken, {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.message.includes("already been consumed"),
    );
  });

  it("D: Redis failure causes fail-closed behavior without leaking internal errors", async () => {
    const challengeRes = await serviceA.requestStepUp({ userId: adminUser.id });
    const code = otpProvider.getLastOtp(adminUser.phone)!;
    const { stepUpToken } = await serviceA.verifyStepUp({
      userId: adminUser.id,
      sessionId,
      challengeId: challengeRes.challengeId,
      code,
    });

    // Simulate Redis connectivity failure
    redisClient.failNext = true;

    await assert.rejects(
      () =>
        serviceA.validateAndConsumeStepUpToken(stepUpToken, {
          userId: adminUser.id,
          sessionId,
        }),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.code === "SECURITY_CHALLENGE_REQUIRED" &&
        err.message.includes("temporarily unavailable") &&
        !err.message.includes("cluster node disconnected"), // Does NOT expose Redis internals
    );
  });

  it("E: expired nonce key disappears automatically after Redis TTL expiration", async () => {
    const nonce = "test-nonce-deterministic-ttl";
    const nowSec = Math.floor(Date.now() / 1000);

    // Consume nonce with a 2-second TTL
    const firstConsume = await redisNonceStore.consume(nonce, nowSec + 2);
    assert.equal(firstConsume, true);

    // Immediate replay is blocked
    const replayAttempt = await redisNonceStore.consume(nonce, nowSec + 2);
    assert.equal(replayAttempt, false);

    // Advance clock past Redis TTL (+3000ms)
    redisClient.mockNowOffsetMs = 3000;

    // After TTL expiration, key is cleared and can be consumed again
    const postTtlConsume = await redisNonceStore.consume(nonce, nowSec + 10);
    assert.equal(postTtlConsume, true);
  });

  it("createConfiguredStepUpNonceStore strictly enforces fail-closed in production", async () => {
    // In production without Redis: must fail closed immediately
    const prodStore = createConfiguredStepUpNonceStore({
      nodeEnv: "production",
      redisClient: undefined,
    });

    await assert.rejects(
      () =>
        prodStore.consume("test-nonce", Math.floor(Date.now() / 1000) + 300),
      (err: any) =>
        err instanceof SecurityChallengeRequiredError &&
        err.code === "SECURITY_CHALLENGE_REQUIRED",
    );

    // In development without Redis: falls back to in-memory store
    const devStore = createConfiguredStepUpNonceStore({
      nodeEnv: "development",
      redisClient: undefined,
    });
    const devConsume = await devStore.consume(
      "dev-nonce",
      Math.floor(Date.now() / 1000) + 300,
    );
    assert.equal(devConsume, true);
  });
});
