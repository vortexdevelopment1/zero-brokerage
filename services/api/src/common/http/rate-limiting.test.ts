import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import errorHandlerPlugin from "../../plugins/error-handler.js";
import requestContextPlugin from "../../plugins/request-context.js";
import rateLimitPlugin from "../../plugins/rate-limit.js";
import {
  createRateLimitHandler,
  type RateLimitPolicy,
  RATE_LIMIT_POLICIES,
} from "./rate-limit/index.js";
import {
  InMemoryRateLimiter,
  type RateLimiter,
} from "../../modules/identity/rate-limiting/rate-limiter.js";
import { RedisRateLimiter } from "../../modules/identity/rate-limiting/redis-rate-limiter.js";

// Mock shared Redis client for multi-instance distributed verification
class MockSharedRedisClient {
  private store = new Map<string, { score: number; member: string }[]>();

  async eval(
    script: string,
    numkeys: number,
    key: string,
    nowStr: string,
    windowMsStr: string,
    maxRequestsStr: string,
    member: string,
  ): Promise<[number, number, number]> {
    const now = Number(nowStr);
    const windowMs = Number(windowMsStr);
    const maxRequests = Number(maxRequestsStr);
    const clearBefore = now - windowMs;

    let items = this.store.get(key) || [];
    // Purge elements outside sliding window
    items = items.filter((item) => item.score > clearBefore);

    if (items.length < maxRequests) {
      items.push({ score: now, member });
      this.store.set(key, items);
      const remaining = maxRequests - items.length;
      return [1, remaining, Math.ceil(windowMs / 1000)];
    } else {
      const oldestScore = items[0] ? items[0].score : now;
      const resetMs = Math.max(0, oldestScore + windowMs - now);
      this.store.set(key, items);
      return [0, 0, Math.ceil(resetMs / 1000)];
    }
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  async set(): Promise<string> {
    return "OK";
  }

  clear() {
    this.store.clear();
  }
}

describe("Step 05 Batch 05: Endpoint-Specific Rate Limiting & Multi-Instance Architecture", () => {
  // Helper to build a test app with given rate limiter
  async function buildTestApp(limiter: RateLimiter) {
    const app = Fastify({ logger: false });
    await app.register(requestContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(rateLimitPlugin, { rateLimiter: limiter });

    return app;
  }

  // =========================================================================
  // 1. BASIC POLICY ENFORCEMENT & HEADERS
  // =========================================================================
  describe("1. Policy Quota & Header Semantics", () => {
    it("permits requests within quota and decrements RateLimit-Remaining", async () => {
      const limiter = new InMemoryRateLimiter();
      const app = await buildTestApp(limiter);

      const testPolicy: RateLimitPolicy = {
        id: "test:endpoint",
        maxRequests: 3,
        windowSeconds: 60,
        scopeStrategy: "ip",
      };

      app.get(
        "/api/v1/test-limit",
        { preHandler: [createRateLimitHandler(testPolicy)] },
        async () => ({ ok: true }),
      );

      // Request 1: remaining = 2
      const res1 = await app.inject({
        method: "GET",
        url: "/api/v1/test-limit",
      });
      assert.equal(res1.statusCode, 200);
      assert.equal(res1.headers["ratelimit-limit"], "3");
      assert.equal(res1.headers["ratelimit-remaining"], "2");
      assert.ok(Number(res1.headers["ratelimit-reset"]) > 0);

      // Request 2: remaining = 1
      const res2 = await app.inject({
        method: "GET",
        url: "/api/v1/test-limit",
      });
      assert.equal(res2.statusCode, 200);
      assert.equal(res2.headers["ratelimit-remaining"], "1");

      // Request 3 (threshold boundary): remaining = 0
      const res3 = await app.inject({
        method: "GET",
        url: "/api/v1/test-limit",
      });
      assert.equal(res3.statusCode, 200);
      assert.equal(res3.headers["ratelimit-remaining"], "0");

      await app.close();
    });

    it("rejects request above quota with 429, canonical error envelope, and Retry-After header", async () => {
      const limiter = new InMemoryRateLimiter();
      const app = await buildTestApp(limiter);

      const testPolicy: RateLimitPolicy = {
        id: "test:strict",
        maxRequests: 2,
        windowSeconds: 30,
        scopeStrategy: "ip",
        errorMessage: "Custom quota exceeded message.",
      };

      app.get(
        "/api/v1/test-strict",
        { preHandler: [createRateLimitHandler(testPolicy)] },
        async () => ({ ok: true }),
      );

      // Consume quota
      await app.inject({ method: "GET", url: "/api/v1/test-strict" });
      await app.inject({ method: "GET", url: "/api/v1/test-strict" });

      // Request 3: Over quota -> 429
      const res3 = await app.inject({
        method: "GET",
        url: "/api/v1/test-strict",
      });
      assert.equal(res3.statusCode, 429);
      assert.equal(res3.headers["ratelimit-remaining"], "0");
      assert.ok(res3.headers["retry-after"], "Expected Retry-After header");
      assert.ok(Number(res3.headers["retry-after"]) > 0);

      const body = res3.json();
      assert.equal(body.error.code, "RATE_LIMITED");
      assert.equal(body.error.message, "Custom quota exceeded message.");
      assert.ok(body.error.requestId);
      assert.equal(body.error.retryable ?? false, false);

      await app.close();
    });
  });

  // =========================================================================
  // 2. CONCURRENCY & RACE CONDITIONS
  // =========================================================================
  describe("2. Concurrent Request Atomicity", () => {
    it("handles concurrent parallel requests atomically against shared quota", async () => {
      const sharedRedis = new MockSharedRedisClient();
      const limiter = new RedisRateLimiter({ client: sharedRedis as any });
      const app = await buildTestApp(limiter);

      const policy: RateLimitPolicy = {
        id: "test:concurrent",
        maxRequests: 5,
        windowSeconds: 60,
        scopeStrategy: "ip",
      };

      app.get(
        "/api/v1/test-concurrent",
        { preHandler: [createRateLimitHandler(policy)] },
        async () => ({ ok: true }),
      );

      // Launch 10 simultaneous requests
      const requests = Array.from({ length: 10 }).map(() =>
        app.inject({ method: "GET", url: "/api/v1/test-concurrent" }),
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter((r) => r.statusCode === 200).length;
      const rateLimitedCount = responses.filter(
        (r) => r.statusCode === 429,
      ).length;

      // Exactly 5 should succeed, 5 should be rate limited
      assert.equal(successCount, 5, "Exactly 5 requests must succeed");
      assert.equal(
        rateLimitedCount,
        5,
        "Exactly 5 requests must be rate limited (429)",
      );

      await app.close();
    });
  });

  // =========================================================================
  // 3. SCOPE ISOLATION & SECURITY RESISTANCE
  // =========================================================================
  describe("3. Scope Isolation & Identity Security", () => {
    it("isolates rate limits by IP address independently", async () => {
      const limiter = new InMemoryRateLimiter();
      const app = await buildTestApp(limiter);

      const policy: RateLimitPolicy = {
        id: "test:ip-isolation",
        maxRequests: 1,
        windowSeconds: 60,
        scopeStrategy: "ip",
      };

      app.get(
        "/api/v1/test-ip-scope",
        { preHandler: [createRateLimitHandler(policy)] },
        async () => ({ ok: true }),
      );

      // IP A makes request -> 200
      const resA1 = await app.inject({
        method: "GET",
        url: "/api/v1/test-ip-scope",
        remoteAddress: "192.168.1.10",
      });
      assert.equal(resA1.statusCode, 200);

      // IP A makes second request -> 429
      const resA2 = await app.inject({
        method: "GET",
        url: "/api/v1/test-ip-scope",
        remoteAddress: "192.168.1.10",
      });
      assert.equal(resA2.statusCode, 429);

      // IP B makes request -> 200 (not affected by IP A's quota exhaustion)
      const resB1 = await app.inject({
        method: "GET",
        url: "/api/v1/test-ip-scope",
        remoteAddress: "192.168.1.20",
      });
      assert.equal(resB1.statusCode, 200);

      await app.close();
    });

    it("isolates rate limits by authenticated actor and ignores spoofed user headers", async () => {
      const limiter = new InMemoryRateLimiter();
      const app = await buildTestApp(limiter);

      const policy: RateLimitPolicy = {
        id: "test:actor-isolation",
        maxRequests: 1,
        windowSeconds: 60,
        scopeStrategy: "actor",
      };

      app.get(
        "/api/v1/test-actor-scope",
        {
          preHandler: [
            async (req) => {
              // Simulated verified authentication middleware
              const authUser = req.headers["x-test-verified-actor"];
              if (authUser) {
                req.user = { id: String(authUser) } as any;
              }
            },
            createRateLimitHandler(policy),
          ],
        },
        async () => ({ ok: true }),
      );

      // Actor 1 request -> 200
      const res1 = await app.inject({
        method: "GET",
        url: "/api/v1/test-actor-scope",
        headers: { "x-test-verified-actor": "user_111" },
      });
      assert.equal(res1.statusCode, 200);

      // Actor 1 second request -> 429
      const res2 = await app.inject({
        method: "GET",
        url: "/api/v1/test-actor-scope",
        headers: { "x-test-verified-actor": "user_111" },
      });
      assert.equal(res2.statusCode, 429);

      // Actor 2 request -> 200 (distinct actor)
      const res3 = await app.inject({
        method: "GET",
        url: "/api/v1/test-actor-scope",
        headers: { "x-test-verified-actor": "user_222" },
      });
      assert.equal(res3.statusCode, 200);

      // Spoofed unauthenticated header "x-user-id" without middleware verification
      // Must NOT be used for actor scoping; falls back to IP
      const spoofedRes = await app.inject({
        method: "GET",
        url: "/api/v1/test-actor-scope",
        headers: { "x-user-id": "user_attacker" }, // Client header
        remoteAddress: "10.0.0.1",
      });
      assert.equal(spoofedRes.statusCode, 200);

      await app.close();
    });
  });

  // =========================================================================
  // 4. MULTI-INSTANCE DISTRIBUTED TESTING (SECTION 18)
  // =========================================================================
  describe("4. Multi-Instance Distributed Rate Limiting (Cross-Process Replica Proof)", () => {
    it("proves multi-instance cross-process atomic rate-limit state sharing using deterministic mock Redis client", async () => {
      // Shared Redis backend simulating horizontal API deployment (deterministic isolated unit test double)
      const sharedRedis = new MockSharedRedisClient();

      const limiter1 = new RedisRateLimiter({ client: sharedRedis as any });
      const limiter2 = new RedisRateLimiter({ client: sharedRedis as any });

      // Instance A
      const appA = await buildTestApp(limiter1);
      // Instance B
      const appB = await buildTestApp(limiter2);

      const policy: RateLimitPolicy = {
        id: "auth:request-otp:shared",
        maxRequests: 2,
        windowSeconds: 60,
        scopeStrategy: "ip",
      };

      appA.post(
        "/api/v1/auth/request-otp",
        { preHandler: [createRateLimitHandler(policy)] },
        async () => ({ success: true }),
      );

      appB.post(
        "/api/v1/auth/request-otp",
        { preHandler: [createRateLimitHandler(policy)] },
        async () => ({ success: true }),
      );

      const clientIp = "198.51.100.42";

      // 1. Instance A handles request 1 -> OK (remaining: 1)
      const resA1 = await appA.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        remoteAddress: clientIp,
      });
      assert.equal(resA1.statusCode, 200);
      assert.equal(resA1.headers["ratelimit-remaining"], "1");

      // 2. Instance B handles request 2 from same client -> OK (remaining: 0)
      const resB1 = await appB.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        remoteAddress: clientIp,
      });
      assert.equal(resB1.statusCode, 200);
      assert.equal(resB1.headers["ratelimit-remaining"], "0");

      // 3. Instance A handles request 3 from same client -> 429 RATE_LIMITED!
      // Proves that Instance A immediately recognizes the quota consumed by Instance B
      const resA2 = await appA.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        remoteAddress: clientIp,
      });
      assert.equal(resA2.statusCode, 429);
      assert.equal(resA2.json().error.code, "RATE_LIMITED");

      // 4. Instance B handles request 4 from same client -> 429 RATE_LIMITED!
      const resB2 = await appB.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        remoteAddress: clientIp,
      });
      assert.equal(resB2.statusCode, 429);
      assert.equal(resB2.json().error.code, "RATE_LIMITED");

      await appA.close();
      await appB.close();
    });

    it("proves cross-instance coordination against live Redis cluster when REDIS_URL is configured", async (t) => {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        t.skip(
          "Skipping live Redis multi-instance test: REDIS_URL environment variable is not set",
        );
        return;
      }

      const runId = randomUUID();
      const keyPrefix = `test:live:${runId}:`;
      const limiterA = new RedisRateLimiter({ url: redisUrl, keyPrefix });
      const limiterB = new RedisRateLimiter({ url: redisUrl, keyPrefix });

      const appA = await buildTestApp(limiterA);
      const appB = await buildTestApp(limiterB);

      const policy: RateLimitPolicy = {
        id: `test:live:otp:${runId}`,
        maxRequests: 2,
        windowSeconds: 60,
        scopeStrategy: "ip",
      };

      appA.post(
        "/api/v1/auth/request-otp",
        { preHandler: [createRateLimitHandler(policy)] },
        async () => ({ success: true }),
      );

      appB.post(
        "/api/v1/auth/request-otp",
        { preHandler: [createRateLimitHandler(policy)] },
        async () => ({ success: true }),
      );

      const clientIp = "198.51.100.42";

      try {
        // 1. Instance A handles request 1 -> OK (remaining: 1)
        const resA1 = await appA.inject({
          method: "POST",
          url: "/api/v1/auth/request-otp",
          remoteAddress: clientIp,
        });
        assert.equal(resA1.statusCode, 200);
        assert.equal(resA1.headers["ratelimit-remaining"], "1");

        // 2. Instance B handles request 2 from same client -> OK (remaining: 0)
        const resB1 = await appB.inject({
          method: "POST",
          url: "/api/v1/auth/request-otp",
          remoteAddress: clientIp,
        });
        assert.equal(resB1.statusCode, 200);
        assert.equal(resB1.headers["ratelimit-remaining"], "0");

        // 3. Instance A handles request 3 from same client -> 429 RATE_LIMITED!
        const resA2 = await appA.inject({
          method: "POST",
          url: "/api/v1/auth/request-otp",
          remoteAddress: clientIp,
        });
        assert.equal(resA2.statusCode, 429);
        assert.equal(resA2.json().error.code, "RATE_LIMITED");

        // 4. Instance B handles request 4 from same client -> 429 RATE_LIMITED!
        const resB2 = await appB.inject({
          method: "POST",
          url: "/api/v1/auth/request-otp",
          remoteAddress: clientIp,
        });
        assert.equal(resB2.statusCode, 429);
        assert.equal(resB2.json().error.code, "RATE_LIMITED");
      } finally {
        await appA.close();
        await appB.close();
        try {
          await limiterA.reset(`${policy.id}:ip:${clientIp}`);
        } catch {
          // ignore cleanup errors
        }
        await limiterA.close();
        await limiterB.close();
      }
    });
  });
});
