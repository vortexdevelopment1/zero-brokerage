import type { FastifyReply, FastifyRequest } from "fastify";
import { withTransaction, type QueryExecutor } from "@zero-brokerage/database";
import {
  BadRequestError,
  IdempotencyConflictError,
  IdempotencyMismatchError,
} from "../../errors/index.js";
import { computeRequestFingerprint } from "./fingerprint.js";
import type { IdempotencyContext, IdempotencyStore } from "./types.js";

export const IDEMPOTENCY_HEADER = "idempotency-key";
export const IDEMPOTENCY_REPLAYED_HEADER = "idempotency-replayed";

// Regex: alphanumeric, dashes, underscores, dots; between 16 and 128 characters
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.-]{16,128}$/;

export interface IdempotencyOptions {
  store?: IdempotencyStore;
  ttlMs?: number; // default 24 hours
  required?: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    idempotencyContext?: IdempotencyContext | undefined;
  }
  interface FastifyInstance {
    idempotencyStore: IdempotencyStore;
  }
}

export function validateIdempotencyKey(key: string): void {
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new BadRequestError(
      "Malformed Idempotency-Key. Expected 16-128 alphanumeric characters, dashes, dots, or underscores.",
    );
  }
}

/**
 * Derives the security isolation scope for the idempotency key.
 * If user is authenticated, scoped to their actor ID and agency ID (if present).
 * If unauthenticated, uses client IP or global fallback.
 */
export function deriveIdempotencyScope(request: FastifyRequest): string {
  const actorId = request.user?.id;
  const agencyId = request.agencyId;

  if (agencyId && actorId) {
    return `agency:${agencyId}:actor:${actorId}`;
  }
  if (actorId) {
    return `actor:${actorId}`;
  }
  return `ip:${request.ip}`;
}

/**
 * Creates an idempotency preHandler hook for Fastify routes.
 * Validates the key, verifies trusted scope and fingerprint, and checks for replay.
 * Attaches IdempotencyContext to the request so application commands can claim and complete
 * inside their business mutation transaction.
 *
 * NOTE: Does NOT claim or complete inside middleware; transactions are owned by the service layer.
 */
export function createIdempotencyHandler(options: IdempotencyOptions = {}) {
  const ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000;
  const required = options.required ?? true;

  return async function handleIdempotency(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const rawKey = request.headers[IDEMPOTENCY_HEADER];

    if (!rawKey) {
      if (required) {
        throw new BadRequestError("Missing required Idempotency-Key header.");
      }
      return;
    }

    if (Array.isArray(rawKey)) {
      throw new BadRequestError(
        "Multiple Idempotency-Key headers are not permitted.",
      );
    }

    const key = String(rawKey).trim();
    validateIdempotencyKey(key);

    const store = options.store ?? request.server.idempotencyStore;
    if (!store) {
      throw new Error(
        "IdempotencyStore is not configured. Production requires PostgresIdempotencyStore; silent in-memory fallback is strictly prohibited.",
      );
    }

    const scope = deriveIdempotencyScope(request);
    const fingerprint = computeRequestFingerprint({
      method: request.method,
      route: request.routeOptions?.url ?? request.url,
      body: request.body,
      query: request.query,
      params: request.params,
    });

    // Fast pre-transaction replay check
    const existing = await store.getRecord({ key, scope });

    if (existing && existing.expiresAt > Date.now()) {
      // 1. Check if same key was used for a different request payload
      if (existing.fingerprint !== fingerprint) {
        throw new IdempotencyMismatchError(
          "This idempotency key was previously used with a different request payload.",
        );
      }

      // 2. Check if first request is still in progress
      if (existing.status === "IN_PROGRESS") {
        throw new IdempotencyConflictError(
          "An operation with this idempotency key is currently in progress. Please retry after it completes.",
        );
      }

      // 3. If completed, replay the response directly without opening a transaction
      if (
        existing.status === "COMPLETED" &&
        existing.statusCode !== undefined
      ) {
        reply.header(IDEMPOTENCY_REPLAYED_HEADER, "true");

        // Adapt response body to carry the current request's requestId if it is a canonical envelope
        let replayedBody = existing.responseBody;
        if (
          typeof replayedBody === "object" &&
          replayedBody !== null &&
          "meta" in replayedBody &&
          typeof (replayedBody as Record<string, unknown>).meta === "object"
        ) {
          replayedBody = {
            ...replayedBody,
            meta: {
              ...((replayedBody as Record<string, unknown>).meta as Record<
                string,
                unknown
              >),
              requestId: request.id,
            },
          };
        }

        return reply.status(existing.statusCode).send(replayedBody);
      }

      // If previous attempt was FAILED with same fingerprint, fall through to allow retry
    }

    // Attach verified idempotency context to the request for transaction ownership
    request.idempotencyContext = {
      key,
      scope,
      fingerprint,
      ttlMs,
      store,
    };
  };
}

/**
 * Standard transaction coordinator ensuring atomic:
 * 1. Idempotency claim
 * 2. Business mutation
 * 3. Outbox event insertion
 * 4. Idempotency completion
 *
 * If the business mutation or outbox fails, everything rolls back atomically.
 */
export async function withIdempotentTransaction<T>(
  pool: QueryExecutor,
  context: IdempotencyContext | undefined,
  operation: (
    tx: QueryExecutor,
  ) => Promise<{ statusCode: number; responseBody: T }>,
): Promise<{ statusCode: number; responseBody: T }> {
  if (!context) {
    return withTransaction(pool as any, async (tx) => {
      return operation(tx);
    });
  }

  return withTransaction(pool as any, async (tx) => {
    // 1. Atomic claim inside the caller's transaction
    const claim = await context.store.claimKey({
      key: context.key,
      scope: context.scope,
      fingerprint: context.fingerprint,
      ttlMs: context.ttlMs,
      executor: tx,
    });

    if (!claim.claimed && claim.existingRecord) {
      if (claim.existingRecord.fingerprint !== context.fingerprint) {
        throw new IdempotencyMismatchError(
          "This idempotency key was previously used with a different request payload.",
        );
      }
      throw new IdempotencyConflictError(
        "An operation with this idempotency key is currently in progress. Please retry after it completes.",
      );
    }

    // 2. Execute business mutation (and outbox event if called within operation)
    const result = await operation(tx);

    // 3. Complete idempotency state inside the same transaction
    await context.store.completeKey({
      key: context.key,
      scope: context.scope,
      statusCode: result.statusCode,
      responseBody: result.responseBody,
      executor: tx,
    });

    return result;
  });
}
