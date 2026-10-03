# Reliable Event Publication Architecture (Transactional Outbox)

## Purpose

This document details the reliable event publication architecture for the Zero Brokerage platform based on the authoritative transactional outbox pattern implemented in `packages/database/src/outbox` and migration `20260929_003_create_outbox_table.ts`.

---

## 1. Problem Statement: The Dual-Write Hazard

In a distributed backend, business state changes frequently require downstream asynchronous actions:
- Notifying seekers of a new listing.
- Dispatching SMS verification codes.
- Triggering background fraud scoring.
- Synchronizing search projections.

Publishing messages directly to an external message broker (e.g. RabbitMQ, Kafka, Redis) or calling third-party APIs during a request creates the classic **dual-write problem**:
1. **Network failure before message publication**: The database commits successfully, but the network call to the broker fails or the server process crashes. The event is permanently lost, causing state desynchronization.
2. **Database failure after message publication**: If an event is published before the database commits, and the database transaction subsequently rolls back due to a constraint violation, consumers process a **phantom event** for a mutation that never actually happened.

---

## 2. Architecture & Design

Zero Brokerage eliminates the dual-write hazard by using PostgreSQL as the durable source of truth and recording domain events atomically within the exact same database transaction as the business mutation:

- **Durable Source of Truth**: PostgreSQL is the single durable source of truth. Redis and external queues are transient delivery channels, not durable stores.
- **Single DB Transaction**: The business entity mutation (INSERT/UPDATE/DELETE) and the outbox event insertion (`INSERT INTO outbox_events`) occur within the same database transaction boundary. If either fails, the entire transaction rolls back.
- **Dispatch After Commit**: Dispatch to external brokers, webhooks, or messaging systems happens strictly *after* the database transaction has durably committed. At no point is an event dispatched prior to commit.
- **Single Authoritative Architecture**: The PostgreSQL `outbox_events` table and associated persistence engine (`packages/database/src/outbox`) represents the sole authoritative outbox architecture across all services. There is no second or competing outbox architecture in the platform.

```text
HTTP Request / Application Command
             │
             ▼
┌───────────────────────────────────────────────┐
│              Database Transaction             │
│                                               │
│   1. Business Mutation (INSERT/UPDATE/DELETE) │
│      e.g. INSERT INTO listings (...)          │
│                      │                        │
│   2. Outbox Event Record                      │
│      INSERT INTO outbox_events (...)          │
│                      │                        │
│   3. COMMIT                                   │
└───────────────────────────────────────────────┘
                       │
                       ▼ (Transaction Durably Committed - Dispatch Strictly After Commit)
┌───────────────────────────────────────────────┐
│     Asynchronous Dispatcher Daemon            │
│     (Step 06 Worker Infrastructure)           │
│                                               │
│   1. Claim Batch via FOR UPDATE SKIP LOCKED   │
│   2. Dispatch to Broker / Webhook / Queue     │
│   3. Mark Status = 'PUBLISHED'                │
└───────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Idempotent Consumers             │
│   De-duplicate on event.id / aggregateId      │
└───────────────────────────────────────────────┘
```

---

## 3. Implemented Outbox Event Envelope

Every event is persisted in `outbox_events` with a structured envelope containing full correlation and contextual metadata:

| Field Name | Data Type | Nullability | Purpose & Description |
| :--- | :--- | :--- | :--- |
| **`id`** | `UUID` | `NOT NULL PK` | Stable unique identifier for the event. Used as an idempotency key by consumers. |
| **`event_name`** | `VARCHAR(100)` | `NOT NULL` | Domain event type descriptor (e.g., `IdentityCreated`, `ListingPublished`). |
| **`schema_version`** | `INTEGER` | `NOT NULL DEFAULT 1` | Payload schema version. Enables forward-compatible consumer evolution. |
| **`aggregate_id`** | `VARCHAR(100)` | `NOT NULL` | Root identifier of the affected domain aggregate (e.g. listing UUID). |
| **`correlation_id`** | `VARCHAR(100)` | `NOT NULL` | End-to-end request tracing identifier across distributed service hops. |
| **`causation_id`** | `VARCHAR(100)` | `NULL` | Identifier of the command or parent event that directly caused this event. |
| **`actor`** | `JSONB` | `NULL` | Metadata identifying the initiating subject (user ID, client IP, role). |
| **`ownership`** | `JSONB` | `NULL` | Multi-tenant ownership context (agency ID, organization ID). |
| **`payload`** | `JSONB` | `NOT NULL` | Durable event payload containing the business attributes of the change. |
| **`status`** | `VARCHAR(30)` | `NOT NULL` | State machine: `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`, `DEAD_LETTER`. |
| **`attempt_count`** | `INTEGER` | `NOT NULL DEFAULT 0` | Counter tracking the number of dispatch attempts. |
| **`max_attempts`** | `INTEGER` | `NOT NULL DEFAULT 5` | Maximum delivery attempts before moving event to `DEAD_LETTER`. |
| **`available_at`** | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`| Earliest instant at which the event may be claimed for dispatch. |
| **`claimed_at`** | `TIMESTAMPTZ` | `NULL` | Instant when an asynchronous worker locked the event. |
| **`claimed_by`** | `VARCHAR(100)` | `NULL` | Instance identifier of the worker currently holding the claim lease. |
| **`processed_at`** | `TIMESTAMPTZ` | `NULL` | Instant when external publication was confirmed. |
| **`last_error`** | `TEXT` | `NULL` | Error message and diagnostic trace from the last failed attempt. |
| **`occurred_at`** | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`| Exact business instant when the domain change occurred in application logic. |
| **`created_at`** | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`| Database row insertion timestamp UTC. |
| **`updated_at`** | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`| Last state transition timestamp UTC. |

---

## 4. Concurrency & Claiming Protocol

### 4.1 Horizontal Safe Claiming (`FOR UPDATE SKIP LOCKED`)
Multiple worker processes running horizontally poll for pending events without lock contention:
```sql
WITH eligible AS (
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
RETURNING outbox_events.*;
```
- `FOR UPDATE SKIP LOCKED` guarantees that each worker claims disjoint sets of rows without blocking each other or waiting on row locks.

### 4.2 Claim Ownership Verification
When acknowledging or failing an event, the worker MUST provide its worker identifier. The update is guarded by conditional SQL:
```sql
UPDATE outbox_events
SET status = 'PUBLISHED',
    processed_at = NOW(),
    claimed_at = NULL,
    claimed_by = NULL,
    updated_at = NOW()
WHERE id = $1
  AND status = 'PROCESSING'
  AND ($2::VARCHAR IS NULL OR claimed_by = $2);
```
- If the worker took too long and its lease was reclaimed, `rowCount === 0` and the repository throws `OutboxStateTransitionError`, preventing stale workers from overwriting subsequent claims.

### 4.3 Stale Lease Recovery
If a worker crashes while processing an event, the lease will eventually expire. The recovery utility resets abandoned rows:
```sql
UPDATE outbox_events
SET status = 'PENDING',
    claimed_at = NULL,
    claimed_by = NULL,
    available_at = NOW(),
    updated_at = NOW()
WHERE status = 'PROCESSING'
  AND claimed_at < NOW() - ($1 || ' seconds')::INTERVAL;
```

### 4.4 Bounded Retries & Dead-Letter State
- When an external dispatch fails, `markOutboxEventFailed` calculates an exponential or fixed retry backoff:
  `available_at = NOW() + (retryDelaySeconds || ' seconds')::INTERVAL`
- Once `attempt_count >= max_attempts`, the event status is automatically set to `'DEAD_LETTER'`. Dead-lettered events cease automatic retries, preventing poison-pill messages from saturating workers, and trigger administrative alerts for manual investigation.

---

## 5. Delivery Guarantees & Consumer Idempotency

### 5.1 Authoritative Guarantees
1. **At-Least-Once Processing**:
   - The transactional outbox persistence foundation supports **at-least-once processing semantics** once a dispatcher/consumer daemon is active.
   - If a worker successfully delivers a message to a broker but crashes before updating `status = 'PUBLISHED'`, the lease reclaim job will re-claim the event and re-dispatch it.
2. **No Exactly-Once Delivery Claim**:
   - Exactly-once delivery across distributed systems with arbitrary network failures is mathematically impossible without end-to-end consensus. The platform does NOT claim exactly-once delivery.
3. **No Global Ordering Claim**:
   - Events for the same aggregate root are processed chronologically where possible (`ORDER BY available_at ASC, id ASC`), but global chronological ordering across different aggregates is not guaranteed in a concurrent multi-worker topology.
4. **Single Outbox Architecture**:
   - No competing, alternate, or shadow outbox mechanism exists. All reliable asynchronous event publication across all domain modules flows strictly through `outbox_events`.

### 5.2 Mandatory Consumer Idempotency
Because messages may be delivered more than once during failover or network retries, all downstream event consumers MUST be designed to be idempotent:
- **Deduplication by `id`**: Consumers should record processed event IDs in an idempotency table (`processed_events`).
- **Entity State Check**: Verify whether the entity state has already advanced past the event version before applying mutations.

---

## 6. Implementation Scope Boundaries

- **Step 03 Scope (Completed)**: Database schema (`outbox_events`), envelope structure, transactional insertion API (`insertOutboxEvent`), concurrency claiming engine (`claimOutboxEvents`), lease reclamation (`reclaimStaleOutboxLeases`), status transition protection, and real PostgreSQL integration tests.
- **Step 06 Scope (Future)**: Active background dispatcher daemons, Redis/BullMQ worker queues, email/SMS provider notification drivers, and event consumer handlers.
