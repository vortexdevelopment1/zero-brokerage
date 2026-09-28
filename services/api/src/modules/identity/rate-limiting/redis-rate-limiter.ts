import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { RateLimitedError } from "../../../common/errors/index.js";
import type {
  RateLimiter,
  RateLimitOptions,
  RateLimitResult,
} from "./rate-limiter.js";

export interface RedisClientLike {
  eval(
    script: string,
    numkeys: number,
    ...args: (string | number)[]
  ): Promise<any>;
  del(...keys: string[]): Promise<number>;
  set(key: any, value: any, ...args: any[]): Promise<any>;
  quit?(): Promise<any>;
  disconnect?(): void;
}

export interface RedisRateLimiterOptions {
  client?: RedisClientLike | undefined;
  url?: string | undefined;
  keyPrefix?: string | undefined;
  failClosed?: boolean | undefined;
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local member = ARGV[4]
local clearBefore = now - windowMs

-- 1. Purge requests outside the active sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- 2. Count requests in active window
local currentCount = redis.call('ZCARD', key)

if currentCount < maxRequests then
    -- Record this request
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, windowMs)
    local remaining = maxRequests - currentCount - 1
    return {1, remaining, math.ceil(windowMs / 1000)}
else
    -- Over quota: compute reset time from oldest element in window
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local resetMs = windowMs
    if oldest and #oldest >= 2 then
        local oldestScore = tonumber(oldest[2])
        resetMs = math.max(0, (oldestScore + windowMs) - now)
    end
    return {0, 0, math.ceil(resetMs / 1000)}
end
`;

/**
 * Production-ready distributed sliding-window rate limiter backed by Redis.
 * Uses atomic Lua script execution to guarantee cross-instance quota safety
 * and prevent race conditions.
 */
export class RedisRateLimiter implements RateLimiter {
  private client: RedisClientLike;
  private keyPrefix: string;
  private failClosed: boolean;
  private isOwnedClient = false;

  constructor(options: RedisRateLimiterOptions = {}) {
    if (options.client) {
      this.client = options.client;
    } else if (options.url) {
      this.client = new Redis(options.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
      this.isOwnedClient = true;
    } else {
      throw new Error(
        "RedisRateLimiter requires either a Redis client instance or a Redis connection URL.",
      );
    }

    this.keyPrefix = options.keyPrefix ?? "ratelimit:";
    this.failClosed = options.failClosed ?? true;
  }

  private formatKey(rawKey: string): string {
    if (rawKey.startsWith(this.keyPrefix)) {
      return rawKey;
    }
    return `${this.keyPrefix}${rawKey}`;
  }

  async consume(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const formattedKey = this.formatKey(key);
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;
    const member = `${now}-${randomUUID()}`;

    try {
      const result = (await this.client.eval(
        SLIDING_WINDOW_LUA,
        1,
        formattedKey,
        now,
        windowMs,
        options.maxRequests,
        member,
      )) as [number, number, number];

      const allowed = result[0] === 1;
      const remaining = Number(result[1]);
      const resetTimeSeconds = Math.floor(now / 1000) + Number(result[2]);

      return {
        allowed,
        remaining,
        resetTimeSeconds,
      };
    } catch (error) {
      if (this.failClosed) {
        // Safe distributed failure mode: block abuse when rate limiter cluster is unreachable
        return {
          allowed: false,
          remaining: 0,
          resetTimeSeconds: Math.floor(now / 1000) + options.windowSeconds,
        };
      }
      throw error;
    }
  }

  async reset(key: string): Promise<void> {
    const formattedKey = this.formatKey(key);
    await this.client.del(formattedKey);
  }

  getClient(): RedisClientLike {
    return this.client;
  }

  async close(): Promise<void> {
    if (this.isOwnedClient && this.client.quit) {
      await this.client.quit();
    }
  }
}
