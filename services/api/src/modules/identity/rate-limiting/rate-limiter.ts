import { RateLimitedError } from "../../../common/errors/index.js";

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeSeconds: number;
}

export interface RateLimiter {
  consume(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

interface WindowBucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter.
 * Provides fallback and test support when standalone Redis is unavailable.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, WindowBucket>();

  async consume(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const newBucket: WindowBucket = {
        count: 1,
        resetAt: now + options.windowSeconds,
      };
      this.buckets.set(key, newBucket);

      return {
        allowed: true,
        remaining: options.maxRequests - 1,
        resetTimeSeconds: newBucket.resetAt,
      };
    }

    if (existing.count >= options.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTimeSeconds: existing.resetAt,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: options.maxRequests - existing.count,
      resetTimeSeconds: existing.resetAt,
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }
}

// Global active rate limiter instance
let activeRateLimiter: RateLimiter = new InMemoryRateLimiter();

export { RedisRateLimiter } from "./redis-rate-limiter.js";
import { RedisRateLimiter } from "./redis-rate-limiter.js";

export interface RateLimiterFactoryOptions {
  nodeEnv?: string | undefined;
  redisUrl?: string | undefined;
  redisClient?: any | undefined;
}

/**
 * Creates a rate limiter instance appropriate for the environment.
 * Enforces distributed Redis limiting in production, strictly prohibiting
 * silent in-memory fallback.
 */
export function createConfiguredRateLimiter(
  options: RateLimiterFactoryOptions = {},
): RateLimiter {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;

  if (options.redisClient) {
    return new RedisRateLimiter({ client: options.redisClient });
  }

  if (redisUrl) {
    return new RedisRateLimiter({ url: redisUrl });
  }

  if (nodeEnv === "production") {
    throw new Error(
      "Production configuration error: Distributed rate limiting requires REDIS_URL or a Redis client. " +
        "Silent fallback to in-memory rate limiting is prohibited in production.",
    );
  }

  // Local development / testing fallback strictly
  return new InMemoryRateLimiter();
}

export function setRateLimiter(limiter: RateLimiter): void {
  activeRateLimiter = limiter;
}

export function getRateLimiter(): RateLimiter {
  return activeRateLimiter;
}

/**
 * Asserts rate limit quota. Throws RateLimitedError if exceeded.
 */
export async function assertRateLimit(
  key: string,
  options: RateLimitOptions,
  errorMessage = "Too many requests. Please try again later.",
): Promise<void> {
  const result = await activeRateLimiter.consume(key, options);

  if (!result.allowed) {
    throw new RateLimitedError(errorMessage);
  }
}
