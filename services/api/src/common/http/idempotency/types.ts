import type { QueryExecutor } from "@zero-brokerage/database";

export type IdempotencyStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface IdempotencyRecord {
  key: string;
  scope: string; // e.g. actorId or agencyId:actorId
  fingerprint: string;
  status: IdempotencyStatus;
  statusCode?: number | undefined;
  responseBody?: unknown | undefined;
  createdAt: number;
  expiresAt: number;
}

export interface ClaimResult {
  claimed: boolean;
  existingRecord?: IdempotencyRecord | undefined;
}

export interface IdempotencyContext {
  key: string;
  scope: string;
  fingerprint: string;
  ttlMs: number;
  store: IdempotencyStore;
}

export interface IdempotencyStore {
  /**
   * Retrieves an existing idempotency record by key and scope.
   * Used for replay and conflict detection prior to opening a mutation transaction.
   */
  getRecord(params: {
    key: string;
    scope: string;
    executor?: QueryExecutor | undefined;
  }): Promise<IdempotencyRecord | undefined>;

  /**
   * Atomically claims an idempotency key.
   * If the key already exists and has not expired, returns claimed: false and the existing record.
   * If the key does not exist or has expired, creates/overwrites record in IN_PROGRESS state and returns claimed: true.
   * Accepts an optional QueryExecutor (TransactionContext or Pool) to participate in atomic business transactions.
   */
  claimKey(params: {
    key: string;
    scope: string;
    fingerprint: string;
    ttlMs: number;
    executor?: QueryExecutor | undefined;
  }): Promise<ClaimResult>;

  /**
   * Completes an in-progress idempotency operation by persisting the final status code and response payload.
   * Accepts an optional QueryExecutor (TransactionContext or Pool).
   */
  completeKey(params: {
    key: string;
    scope: string;
    statusCode: number;
    responseBody: unknown;
    executor?: QueryExecutor | undefined;
  }): Promise<void>;

  /**
   * Marks an in-progress idempotency operation as failed (or clears it if retryable).
   * Accepts an optional QueryExecutor (TransactionContext or Pool).
   */
  failKey(params: {
    key: string;
    scope: string;
    errorReason?: string;
    executor?: QueryExecutor | undefined;
  }): Promise<void>;
}
