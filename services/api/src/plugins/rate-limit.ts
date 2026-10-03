import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env.js";
import {
  type RateLimiter,
  setRateLimiter,
  assertRateLimit,
  createConfiguredRateLimiter,
  RedisRateLimiter,
} from "../modules/identity/rate-limiting/rate-limiter.js";
import {
  createConfiguredStepUpNonceStore,
  setStepUpNonceStore,
  type StepUpNonceStore,
} from "../modules/identity/services/step-up-service.js";

import {
  createRateLimitHandler,
  RATE_LIMIT_POLICIES,
} from "../common/http/rate-limit/index.js";

declare module "fastify" {
  interface FastifyInstance {
    rateLimiter: RateLimiter;
    assertRateLimit: typeof assertRateLimit;
    stepUpNonceStore: StepUpNonceStore;
    createRateLimitHandler: typeof createRateLimitHandler;
    rateLimitPolicies: typeof RATE_LIMIT_POLICIES;
  }
}

export interface RateLimitPluginOptions {
  rateLimiter?: RateLimiter;
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitPluginOptions> = async (
  app,
  options = {},
) => {
  const limiter =
    options.rateLimiter ??
    createConfiguredRateLimiter({
      nodeEnv: env.NODE_ENV,
      redisUrl: env.REDIS_URL,
    });

  setRateLimiter(limiter);

  // Wire Redis-backed distributed nonce store using shared Redis client
  const redisClient =
    limiter instanceof RedisRateLimiter ? limiter.getClient() : undefined;
  const nonceStore = createConfiguredStepUpNonceStore({
    nodeEnv: env.NODE_ENV,
    redisClient,
  });

  setStepUpNonceStore(nonceStore);

  app.decorate("rateLimiter", limiter);
  app.decorate("assertRateLimit", assertRateLimit);
  app.decorate("stepUpNonceStore", nonceStore);
  app.decorate("createRateLimitHandler", createRateLimitHandler);
  app.decorate("rateLimitPolicies", RATE_LIMIT_POLICIES);

  app.addHook("onClose", async () => {
    if (limiter instanceof RedisRateLimiter) {
      await limiter.close();
    }
  });
};

export default fp(rateLimitPlugin, {
  name: "rate-limit",
});
