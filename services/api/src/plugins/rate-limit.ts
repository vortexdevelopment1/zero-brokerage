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

declare module "fastify" {
  interface FastifyInstance {
    rateLimiter: RateLimiter;
    assertRateLimit: typeof assertRateLimit;
    stepUpNonceStore: StepUpNonceStore;
  }
}

const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  const limiter = createConfiguredRateLimiter({
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

  app.addHook("onClose", async () => {
    if (limiter instanceof RedisRateLimiter) {
      await limiter.close();
    }
  });
};

export default fp(rateLimitPlugin, {
  name: "rate-limit",
});
