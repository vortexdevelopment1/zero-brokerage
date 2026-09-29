import { executeQuery, type QueryExecutor } from "../query/index.js";

export type OutboxStatus =
  | "PENDING"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED"
  | "DEAD_LETTER";

export interface OutboxEventRecord {
  id: string;
  eventName: string;
  schemaVersion: number;
  aggregateId: string;
  correlationId: string;
  causationId: string | null;
  actor: Record<string, unknown> | null;
  ownership: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attemptCount: number;
  maxAttempts: number;
  availableAt: Date;
  claimedAt: Date | null;
  claimedBy: string | null;
  processedAt: Date | null;
  lastError: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertOutboxEventParams {
  eventName: string;
  schemaVersion?: number | undefined;
  aggregateId: string;
  correlationId: string;
  causationId?: string | null | undefined;
  actor?: Record<string, unknown> | null | undefined;
  ownership?: Record<string, unknown> | null | undefined;
  payload: Record<string, unknown>;
  maxAttempts?: number | undefined;
  occurredAt?: Date | undefined;
}

interface OutboxRow {
  id: string;
  event_name: string;
  schema_version: number;
  aggregate_id: string;
  correlation_id: string;
  causation_id: string | null;
  actor: Record<string, unknown> | null;
  ownership: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempt_count: number;
  max_attempts: number;
  available_at: Date;
  claimed_at: Date | null;
  claimed_by: string | null;
  processed_at: Date | null;
  last_error: string | null;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
}

function mapOutboxRow(row: OutboxRow): OutboxEventRecord {
  return {
    id: row.id,
    eventName: row.event_name,
    schemaVersion: row.schema_version,
    aggregateId: row.aggregate_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    actor: row.actor,
    ownership: row.ownership,
    payload: row.payload,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by,
    processedAt: row.processed_at,
    lastError: row.last_error,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Inserts an event into the transactional outbox table.
 * MUST be executed within the same database transaction as the business mutation.
 */
export async function insertOutboxEvent(
  executor: QueryExecutor,
  params: InsertOutboxEventParams,
): Promise<OutboxEventRecord> {
  const result = await executeQuery<OutboxRow>(
    executor,
    `INSERT INTO outbox_events (
       event_name,
       schema_version,
       aggregate_id,
       correlation_id,
       causation_id,
       actor,
       ownership,
       payload,
       max_attempts,
       occurred_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *;`,
    [
      params.eventName,
      params.schemaVersion ?? 1,
      params.aggregateId,
      params.correlationId,
      params.causationId ?? null,
      params.actor ? JSON.stringify(params.actor) : null,
      params.ownership ? JSON.stringify(params.ownership) : null,
      JSON.stringify(params.payload),
      params.maxAttempts ?? 5,
      params.occurredAt ?? new Date(),
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to insert outbox event record.");
  }

  return mapOutboxRow(row);
}

export interface ClaimOutboxEventsOptions {
  workerId: string;
  limit?: number | undefined;
}

/**
 * Atomically claims eligible outbox events for processing using FOR UPDATE SKIP LOCKED.
 * Safe for concurrent dispatch workers running horizontally.
 */
export async function claimOutboxEvents(
  executor: QueryExecutor,
  options: ClaimOutboxEventsOptions,
): Promise<OutboxEventRecord[]> {
  const limit = options.limit ?? 10;

  const result = await executeQuery<OutboxRow>(
    executor,
    `WITH eligible AS (
       SELECT id
       FROM outbox_events
       WHERE (status = 'PENDING' OR (status = 'FAILED' AND attempt_count < max_attempts))
         AND available_at <= NOW()
       ORDER BY available_at ASC, id ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE outbox_events
     SET status = 'PROCESSING',
         claimed_at = NOW(),
         claimed_by = $2,
         attempt_count = attempt_count + 1,
         updated_at = NOW()
     FROM eligible
     WHERE outbox_events.id = eligible.id
     RETURNING outbox_events.*;`,
    [limit, options.workerId],
  );

  return result.rows.map(mapOutboxRow);
}

export class OutboxStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboxStateTransitionError";
  }
}

export interface MarkOutboxPublishedOptions {
  workerId?: string | undefined;
}

/**
 * Marks an outbox event as successfully published.
 * Requires the event to currently be in PROCESSING status.
 * If workerId is provided, requires the caller to hold the active claim.
 */
export async function markOutboxEventPublished(
  executor: QueryExecutor,
  id: string,
  options?: MarkOutboxPublishedOptions | string | undefined,
): Promise<void> {
  const workerId = typeof options === "string" ? options : options?.workerId;

  const result = await executeQuery(
    executor,
    `UPDATE outbox_events
     SET status = 'PUBLISHED',
         processed_at = NOW(),
         claimed_at = NULL,
         claimed_by = NULL,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'PROCESSING'
       AND ($2::VARCHAR IS NULL OR claimed_by = $2);`,
    [id, workerId ?? null],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new OutboxStateTransitionError(
      `Cannot transition outbox event ${id} to PUBLISHED: event is not in PROCESSING status or claim ownership was lost.`,
    );
  }
}

export interface MarkOutboxFailedOptions {
  workerId?: string | undefined;
  retryDelaySeconds?: number | undefined;
}

/**
 * Marks an outbox event as failed with retry delay, transitioning to DEAD_LETTER
 * once max_attempts has been reached.
 * Requires the event to currently be in PROCESSING status.
 * If workerId is provided, requires the caller to hold the active claim.
 */
export async function markOutboxEventFailed(
  executor: QueryExecutor,
  id: string,
  error: string,
  retryDelayOrOptions?: number | MarkOutboxFailedOptions | undefined,
  maybeWorkerId?: string | undefined,
): Promise<void> {
  let retryDelaySeconds = 30;
  let workerId: string | undefined;

  if (typeof retryDelayOrOptions === "number") {
    retryDelaySeconds = retryDelayOrOptions;
    workerId = maybeWorkerId;
  } else if (
    typeof retryDelayOrOptions === "object" &&
    retryDelayOrOptions !== null
  ) {
    retryDelaySeconds = retryDelayOrOptions.retryDelaySeconds ?? 30;
    workerId = retryDelayOrOptions.workerId;
  }

  const result = await executeQuery(
    executor,
    `UPDATE outbox_events
     SET status = CASE
           WHEN attempt_count >= max_attempts THEN 'DEAD_LETTER'::VARCHAR(30)
           ELSE 'FAILED'::VARCHAR(30)
         END,
         available_at = NOW() + ($2 || ' seconds')::INTERVAL,
         last_error = $3,
         claimed_at = NULL,
         claimed_by = NULL,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'PROCESSING'
       AND ($4::VARCHAR IS NULL OR claimed_by = $4);`,
    [id, retryDelaySeconds, error, workerId ?? null],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new OutboxStateTransitionError(
      `Cannot transition outbox event ${id} to FAILED/DEAD_LETTER: event is not in PROCESSING status or claim ownership was lost.`,
    );
  }
}

/**
 * Reclaims stale outbox event leases abandoned by crashed workers.
 */
export async function reclaimStaleOutboxLeases(
  executor: QueryExecutor,
  leaseTimeoutSeconds = 300,
): Promise<number> {
  const result = await executeQuery(
    executor,
    `UPDATE outbox_events
     SET status = 'PENDING',
         claimed_at = NULL,
         claimed_by = NULL,
         available_at = NOW(),
         updated_at = NOW()
     WHERE status = 'PROCESSING'
       AND claimed_at < NOW() - ($1 || ' seconds')::INTERVAL;`,
    [leaseTimeoutSeconds],
  );

  return result.rowCount ?? 0;
}
