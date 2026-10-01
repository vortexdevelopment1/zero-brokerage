import type {
  ClaimResult,
  IdempotencyRecord,
  IdempotencyStore,
} from "./types.js";

/**
 * Thread-safe In-Memory Idempotency Store (Test Double).
 * Retained strictly for unit tests and local non-database testing.
 * Prohibited from being the implicit default in production environments.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  private makeKey(scope: string, key: string): string {
    return `${scope}::${key}`;
  }

  async getRecord(params: {
    key: string;
    scope: string;
  }): Promise<IdempotencyRecord | undefined> {
    const compositeKey = this.makeKey(params.scope, params.key);
    const existing = this.records.get(compositeKey);
    return existing ? { ...existing } : undefined;
  }

  async claimKey(params: {
    key: string;
    scope: string;
    fingerprint: string;
    ttlMs: number;
  }): Promise<ClaimResult> {
    const compositeKey = this.makeKey(params.scope, params.key);
    const now = Date.now();

    const existing = this.records.get(compositeKey);

    // Active unexpired record that is NOT an eligible retry for FAILED
    if (
      existing &&
      existing.expiresAt > now &&
      (existing.status !== "FAILED" ||
        existing.fingerprint !== params.fingerprint)
    ) {
      return {
        claimed: false,
        existingRecord: { ...existing },
      };
    }

    // Key is either new, expired, or a valid retry for FAILED; claim it
    const newRecord: IdempotencyRecord = {
      key: params.key,
      scope: params.scope,
      fingerprint: params.fingerprint,
      status: "IN_PROGRESS",
      createdAt: now,
      expiresAt: now + params.ttlMs,
    };

    this.records.set(compositeKey, newRecord);

    return {
      claimed: true,
      existingRecord: undefined,
    };
  }

  async completeKey(params: {
    key: string;
    scope: string;
    statusCode: number;
    responseBody: unknown;
  }): Promise<void> {
    const compositeKey = this.makeKey(params.scope, params.key);
    const existing = this.records.get(compositeKey);

    if (existing) {
      existing.status = "COMPLETED";
      existing.statusCode = params.statusCode;
      existing.responseBody = params.responseBody;
    }
  }

  async failKey(params: {
    key: string;
    scope: string;
    errorReason?: string;
  }): Promise<void> {
    const compositeKey = this.makeKey(params.scope, params.key);
    const existing = this.records.get(compositeKey);

    if (existing) {
      existing.status = "FAILED";
    }
  }

  clear(): void {
    this.records.clear();
  }
}
