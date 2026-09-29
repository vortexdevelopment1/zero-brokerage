import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RedisRateLimiter,
  type RedisClientLike,
} from "../rate-limiting/redis-rate-limiter.js";
import {
  createConfiguredRateLimiter,
  InMemoryRateLimiter,
  assertRateLimit,
  setRateLimiter,
} from "../rate-limiting/rate-limiter.js";

/**
 * High-fidelity in-memory Redis client mock executing the exact sliding-window
 * semantics of the production Lua script.
 */
class MockRedisClient implements RedisClientLike {
  private store = new Map<string, { score: number; member: string }[]>();

  async eval(
    _script: string,
    _numkeys: number,
    ...args: (string | number)[]
  ): Promise<[number, number, number]> {
    const key = String(args[0]);
    const now = Number(args[1]);
    const windowMs = Number(args[2]);
    const maxRequests = Number(args[3]);
    const member = String(args[4]);
    const clearBefore = now - windowMs;

    let entries = this.store.get(key) ?? [];
    entries = entries.filter((e) => e.score > clearBefore);

    if (entries.length < maxRequests) {
      entries.push({ score: now, member });
      this.store.set(key, entries);
      const remaining = maxRequests - entries.length;
      return [1, remaining, Math.ceil(windowMs / 1000)];
    } else {
      const oldest = entries[0];
      const resetMs = oldest
        ? Math.max(0, oldest.score + windowMs - now)
        : windowMs;
      return [0, 0, Math.ceil(resetMs / 1000)];
    }
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async set(
    _key: string,
    _value: string | number,
    _mode?: string,
    _duration?: number,
    _flag?: string,
  ): Promise<string | null> {
    return "OK";
  }

  getEntryCount(key: string): number {
    return this.store.get(key)?.length ?? 0;
  }
}

describe("Distributed Rate Limiter (Redis-backed)", () => {
  it("enforces quota limit correctly and decrements remaining headroom", async () => {
    const mockClient = new MockRedisClient();
    const limiter = new RedisRateLimiter({ client: mockClient });

    const key = "user-123:otp";
    const options = { windowSeconds: 60, maxRequests: 3 };

    // Request 1
    const r1 = await limiter.consume(key, options);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    // Request 2
    const r2 = await limiter.consume(key, options);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    // Request 3
    const r3 = await limiter.consume(key, options);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    // Request 4 (quota exhausted)
    const r4 = await limiter.consume(key, options);
    assert.equal(r4.allowed, false);
    assert.equal(r4.remaining, 0);
  });

  it("resets key counter when explicitly cleared", async () => {
    const mockClient = new MockRedisClient();
    const limiter = new RedisRateLimiter({ client: mockClient });

    const key = "ip-10.0.0.1";
    const options = { windowSeconds: 60, maxRequests: 2 };

    await limiter.consume(key, options);
    await limiter.consume(key, options);

    const blocked = await limiter.consume(key, options);
    assert.equal(blocked.allowed, false);

    // Reset
    await limiter.reset(key);

    const afterReset = await limiter.consume(key, options);
    assert.equal(afterReset.allowed, true);
    assert.equal(afterReset.remaining, 1);
  });

  it("handles concurrent consumption atomically across parallel requests", async () => {
    const mockClient = new MockRedisClient();
    const limiter = new RedisRateLimiter({ client: mockClient });

    const key = "concurrent-burst";
    const options = { windowSeconds: 60, maxRequests: 5 };

    // Issue 10 concurrent requests
    const results = await Promise.all(
      Array.from({ length: 10 }, () => limiter.consume(key, options)),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;

    assert.equal(allowedCount, 5);
    assert.equal(blockedCount, 5);
  });

  it("shares quota state across multiple API instances connected to same Redis store", async () => {
    const sharedRedis = new MockRedisClient();

    // Two distinct API instance limiter instances
    const instanceA = new RedisRateLimiter({ client: sharedRedis });
    const instanceB = new RedisRateLimiter({ client: sharedRedis });

    const key = "shared-cluster-key";
    const options = { windowSeconds: 60, maxRequests: 3 };

    // Instance A consumes 2 tokens
    const r1 = await instanceA.consume(key, options);
    const r2 = await instanceA.consume(key, options);
    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);

    // Instance B consumes 1 token
    const r3 = await instanceB.consume(key, options);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    // Instance B tries again -> blocked
    const r4 = await instanceB.consume(key, options);
    assert.equal(r4.allowed, false);

    // Instance A also sees quota exhausted
    const r5 = await instanceA.consume(key, options);
    assert.equal(r5.allowed, false);
  });

  it("createConfiguredRateLimiter returns InMemoryRateLimiter only in development/test fallback", () => {
    const devLimiter = createConfiguredRateLimiter({
      nodeEnv: "development",
      redisUrl: undefined,
    });
    assert.ok(devLimiter instanceof InMemoryRateLimiter);

    const testLimiter = createConfiguredRateLimiter({
      nodeEnv: "test",
      redisUrl: undefined,
    });
    assert.ok(testLimiter instanceof InMemoryRateLimiter);
  });

  it("createConfiguredRateLimiter prohibits silent in-memory fallback in production", () => {
    assert.throws(
      () =>
        createConfiguredRateLimiter({
          nodeEnv: "production",
          redisUrl: undefined,
        }),
      /Production configuration error: Distributed rate limiting requires REDIS_URL/,
    );
  });

  it("createConfiguredRateLimiter returns RedisRateLimiter when client or URL is provided", () => {
    const mockClient = new MockRedisClient();
    const prodLimiter = createConfiguredRateLimiter({
      nodeEnv: "production",
      redisClient: mockClient,
    });
    assert.ok(prodLimiter instanceof RedisRateLimiter);
  });

  it("fails closed safely when Redis cluster errors during consume", async () => {
    const brokenClient: RedisClientLike = {
      async eval() {
        throw new Error("ECONNREFUSED: Redis cluster unreachable");
      },
      async del() {
        return 0;
      },
      async set() {
        throw new Error("ECONNREFUSED: Redis cluster unreachable");
      },
    };

    const limiter = new RedisRateLimiter({
      client: brokenClient,
      failClosed: true,
    });

    const result = await limiter.consume("any-key", {
      windowSeconds: 60,
      maxRequests: 5,
    });

    // Fails closed for protection against unbounded brute-force
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });
});
