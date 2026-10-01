import type { FastifyRequest } from "fastify";

export type RateLimitScopeStrategy = "ip" | "actor" | "agency_actor" | "custom";

export interface RateLimitPolicy {
  /** Unique identifier for the rate limit policy (e.g. 'auth:request-otp') */
  id: string;

  /** Maximum requests allowed within the sliding window */
  maxRequests: number;

  /** Sliding window duration in seconds */
  windowSeconds: number;

  /** Scope resolution strategy: 'ip' | 'actor' | 'agency_actor' | 'custom' */
  scopeStrategy: RateLimitScopeStrategy;

  /** Optional custom key generator for specialized endpoints */
  keyGenerator?: (request: FastifyRequest) => string | undefined;

  /** Safe, public message returned to clients when rate limit is exceeded */
  errorMessage?: string;

  /** Master toggle for policy (defaults to true) */
  enabled?: boolean;
}

export interface RateLimitHeaders {
  "RateLimit-Limit": number;
  "RateLimit-Remaining": number;
  "RateLimit-Reset": number;
  "Retry-After"?: number;
}
