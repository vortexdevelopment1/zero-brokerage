import type { FastifyReply, FastifyRequest } from "fastify";
import { RateLimitedError } from "../../errors/index.js";
import type { RateLimitPolicy } from "./types.js";

/**
 * Derives a secure, non-spoofable rate-limiting key based on the declared policy strategy.
 *
 * Security Invariants:
 * 1. Authenticated actor identity is strictly read from verified `request.user.id` (set by authentication middleware).
 *    Client-supplied headers (e.g. `X-User-Id`) or body attributes are NEVER trusted.
 * 2. IP resolution relies on Fastify's native `request.ip`, which strictly honors the configured `trustProxy`.
 *    Spoofed `X-Forwarded-For` headers are ignored unless explicitly originating from a trusted proxy hop.
 */
export function resolveRateLimitKey(
  request: FastifyRequest,
  policy: RateLimitPolicy,
): string {
  if (policy.scopeStrategy === "custom" && policy.keyGenerator) {
    const customKey = policy.keyGenerator(request);
    if (customKey) {
      return `${policy.id}:custom:${customKey}`;
    }
  }

  if (policy.scopeStrategy === "agency_actor") {
    const actorId = request.user?.id;
    const agencyId = (request as any).agencyId;
    if (agencyId && actorId) {
      return `${policy.id}:agency:${agencyId}:actor:${actorId}`;
    }
    if (actorId) {
      return `${policy.id}:actor:${actorId}`;
    }
    return `${policy.id}:ip:${request.ip}`;
  }

  if (policy.scopeStrategy === "actor") {
    const actorId = request.user?.id;
    if (actorId) {
      return `${policy.id}:actor:${actorId}`;
    }
    return `${policy.id}:ip:${request.ip}`;
  }

  // Default to IP strategy
  return `${policy.id}:ip:${request.ip}`;
}

/**
 * Creates a Fastify preHandler hook implementing endpoint-specific rate limiting.
 * Participates in the distributed Redis-backed sliding-window quota system.
 * Emits standard RateLimit headers and flows into the canonical error pipeline upon exhaustion.
 */
export function createRateLimitHandler(policy: RateLimitPolicy) {
  return async function handleRateLimit(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (policy.enabled === false) {
      return;
    }

    const limiter = request.server.rateLimiter;
    if (!limiter) {
      throw new Error(
        "RateLimiter is not registered on Fastify server. Rate limiting plugin must be registered before route handlers.",
      );
    }

    const key = resolveRateLimitKey(request, policy);
    const result = await limiter.consume(key, {
      maxRequests: policy.maxRequests,
      windowSeconds: policy.windowSeconds,
    });

    const now = Math.floor(Date.now() / 1000);
    const retryAfterSeconds = Math.max(1, result.resetTimeSeconds - now);

    // Standard IETF / Fastify RateLimit metadata headers
    reply.header("ratelimit-limit", policy.maxRequests);
    reply.header("ratelimit-remaining", Math.max(0, result.remaining));
    reply.header("ratelimit-reset", result.resetTimeSeconds);

    if (!result.allowed) {
      reply.header("retry-after", String(retryAfterSeconds));

      throw new RateLimitedError(
        policy.errorMessage ?? "Too many requests. Please try again later.",
        { retryAfterSeconds },
      );
    }
  };
}
