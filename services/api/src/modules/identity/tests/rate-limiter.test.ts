import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryRateLimiter,
  assertRateLimit,
  setRateLimiter,
} from "../rate-limiting/rate-limiter.js";

describe("Rate Limiting and Abuse Prevention", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter();
    setRateLimiter(limiter);
  });

  it("permits requests within quota and decrements remaining quota", async () => {
    const key = "test:key:1";
    const options = { windowSeconds: 60, maxRequests: 3 };

    const res1 = await limiter.consume(key, options);
    assert.equal(res1.allowed, true);
    assert.equal(res1.remaining, 2);

    const res2 = await limiter.consume(key, options);
    assert.equal(res2.allowed, true);
    assert.equal(res2.remaining, 1);

    const res3 = await limiter.consume(key, options);
    assert.equal(res3.allowed, true);
    assert.equal(res3.remaining, 0);
  });

  it("blocks requests once quota is exhausted", async () => {
    const key = "test:key:2";
    const options = { windowSeconds: 60, maxRequests: 2 };

    await limiter.consume(key, options);
    await limiter.consume(key, options);

    const res3 = await limiter.consume(key, options);
    assert.equal(res3.allowed, false);
    assert.equal(res3.remaining, 0);
  });

  it("assertRateLimit throws RateLimitedError when quota exceeded", async () => {
    const key = "test:key:3";
    const options = { windowSeconds: 60, maxRequests: 1 };

    await assertRateLimit(key, options);

    await assert.rejects(
      async () => {
        await assertRateLimit(key, options);
      },
      { name: "RateLimitedError" },
    );
  });

  it("resets key counter when explicitly cleared", async () => {
    const key = "test:key:4";
    const options = { windowSeconds: 60, maxRequests: 1 };

    await limiter.consume(key, options);
    await limiter.reset(key);

    const res = await limiter.consume(key, options);
    assert.equal(res.allowed, true);
  });
});
