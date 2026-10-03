import { executeQuery, type QueryExecutor } from "@zero-brokerage/database";
import type {
  ClaimResult,
  IdempotencyRecord,
  IdempotencyStatus,
  IdempotencyStore,
} from "./types.js";

interface IdempotencyRow {
  id: string;
  scope: string;
  key: string;
  fingerprint: string;
  status: IdempotencyStatus;
  status_code: number | null;
  response_body: unknown;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

function mapRowToRecord(row: IdempotencyRow): IdempotencyRecord {
  return {
    key: row.key,
    scope: row.scope,
    fingerprint: row.fingerprint,
    status: row.status,
    statusCode: row.status_code ?? undefined,
    responseBody: row.response_body ?? undefined,
    createdAt: row.created_at.getTime(),
    expiresAt: row.expires_at.getTime(),
  };
}

/**
 * Production-Grade PostgreSQL-Backed Idempotency Store.
 * Participates directly in caller-provided TransactionContext or QueryExecutor.
 * Uses atomic INSERT ... ON CONFLICT (scope, key) primitives to guarantee zero race conditions.
 */
export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly defaultExecutor: QueryExecutor) {}

  async getRecord(params: {
    key: string;
    scope: string;
    executor?: QueryExecutor | undefined;
  }): Promise<IdempotencyRecord | undefined> {
    const executor = params.executor ?? this.defaultExecutor;
    const result = await executeQuery<IdempotencyRow>(
      executor,
      `SELECT * FROM idempotency_keys
       WHERE scope = $1 AND key = $2;`,
      [params.scope, params.key],
    );

    const row = result.rows[0];
    return row ? mapRowToRecord(row) : undefined;
  }

  async claimKey(params: {
    key: string;
    scope: string;
    fingerprint: string;
    ttlMs: number;
    executor?: QueryExecutor | undefined;
  }): Promise<ClaimResult> {
    const executor = params.executor ?? this.defaultExecutor;
    const expiresAt = new Date(Date.now() + params.ttlMs);

    // Atomic claim via PostgreSQL INSERT ... ON CONFLICT (scope, key)
    // 1. If key is new: INSERT succeeds in IN_PROGRESS state.
    // 2. If key exists and is expired: updates created_at to NOW() and reclaims in IN_PROGRESS.
    // 3. If key exists and previously FAILED with the exact same fingerprint: allows safe retry by re-claiming in IN_PROGRESS.
    // 4. If key exists and is active (IN_PROGRESS or COMPLETED): DO NOTHING, returning 0 rows.
    const insertResult = await executeQuery<IdempotencyRow>(
      executor,
      `INSERT INTO idempotency_keys (
         scope,
         key,
         fingerprint,
         status,
         created_at,
         updated_at,
         expires_at
       )
       VALUES ($1, $2, $3, 'IN_PROGRESS', NOW(), NOW(), $4)
       ON CONFLICT (scope, key) DO UPDATE
         SET status = 'IN_PROGRESS',
             fingerprint = EXCLUDED.fingerprint,
             status_code = NULL,
             response_body = NULL,
             created_at = NOW(),
             updated_at = NOW(),
             expires_at = EXCLUDED.expires_at
         WHERE idempotency_keys.expires_at <= NOW()
            OR (idempotency_keys.status = 'FAILED' AND idempotency_keys.fingerprint = EXCLUDED.fingerprint)
       RETURNING *;`,
      [params.scope, params.key, params.fingerprint, expiresAt],
    );

    if (insertResult.rows.length > 0 && insertResult.rows[0]) {
      // Successfully claimed a new or reclaimed slot
      return {
        claimed: true,
        existingRecord: undefined,
      };
    }

    // Key exists and is currently active or mismatched. Fetch existing record.
    const existingRecord = await this.getRecord({
      key: params.key,
      scope: params.scope,
      executor,
    });

    if (!existingRecord) {
      // Edge case: row was deleted concurrently; fallback to retryable claim
      return {
        claimed: false,
        existingRecord: undefined,
      };
    }

    return {
      claimed: false,
      existingRecord,
    };
  }

  async completeKey(params: {
    key: string;
    scope: string;
    statusCode: number;
    responseBody: unknown;
    executor?: QueryExecutor | undefined;
  }): Promise<void> {
    const executor = params.executor ?? this.defaultExecutor;

    await executeQuery(
      executor,
      `UPDATE idempotency_keys
       SET status = 'COMPLETED',
           status_code = $1,
           response_body = $2,
           updated_at = NOW()
       WHERE scope = $3 AND key = $4 AND status IN ('IN_PROGRESS', 'FAILED');`,
      [
        params.statusCode,
        params.responseBody !== undefined
          ? JSON.stringify(params.responseBody)
          : null,
        params.scope,
        params.key,
      ],
    );
  }

  async failKey(params: {
    key: string;
    scope: string;
    errorReason?: string;
    executor?: QueryExecutor | undefined;
  }): Promise<void> {
    const executor = params.executor ?? this.defaultExecutor;

    await executeQuery(
      executor,
      `UPDATE idempotency_keys
       SET status = 'FAILED',
           updated_at = NOW()
       WHERE scope = $1 AND key = $2 AND status = 'IN_PROGRESS';`,
      [params.scope, params.key],
    );
  }
}
