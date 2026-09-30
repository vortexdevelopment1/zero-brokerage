# Concurrency Control Inventory

## Purpose

This document catalogs all race-prone workflows in the Zero Brokerage platform and details the concurrency control mechanisms, database constraints, locking strategies, and test evidence protecting them.

---

## 1. Concurrency Control Principles

1. **Defense in Depth**: Critical invariants are guarded at the database engine level (unique indexes, check constraints, foreign keys) and reinforced at the application domain layer.
2. **Explicit Enforcement Boundaries**:
   - **Database-Enforced**: Violations produce transactional rollbacks and PostgreSQL SQLSTATE errors (`23505`, `23514`, `23503`), mapped to domain errors by `mapDatabaseError`.
   - **Service-Enforced**: Pre-flight validation, orchestration logic, and lifecycle checks executed before database commands.
   - **Operational-Enforced**: Background workers, lease reclamation jobs, and cluster coordination.
3. **No Blind Updates**: Mutations must use atomic compare-and-swap (CAS) SQL conditions or participate in ACID transactions.

---

## 2. Race-Prone Workflows & Protection Matrix

### 2.1 Database Migration Execution
- **Invariant**: Exactly one migration runner may execute schema migrations at any time; concurrent runners must serialize without applying duplicate migrations or deadlocking.
- **Race Condition**: Multiple backend instances booting simultaneously in a containerized cluster attempting to execute `runMigrations` concurrently.
- **Protection Mechanism**: PostgreSQL 64-bit session advisory lock:
  ```sql
  SELECT pg_advisory_lock(2253708588080840845::bigint);
  ```
- **Enforcement Level**: Database engine (Session-level advisory lock).
- **Lock / Guard Strategy**: Single dedicated client acquired from pool; released unconditionally in `finally` block via `pg_advisory_unlock`. Automatic OS socket teardown drops session locks if the runner crashes.
- **Idempotency**: `schema_migrations` table records applied IDs and SHA-256 checksums; runner filters pending migrations inside the locked critical section.
- **Test Evidence**:
  - `TEST 8`: Concurrent runner simulation in `packages/database/tests/migrations.integration.test.ts`.
  - `TEST 14`: Constrained connection pool deadlock prevention test.

---

### 2.2 Agency Active Owner Invariant
- **Invariant**: An agency may have **at most one** active owner (`role = 'AGENCY_OWNER' AND status = 'ACTIVE'`).
- **Race Condition**: Two administrators or concurrent API requests attempting to assign two different users as active agency owners simultaneously.
- **Protection Mechanism**: PostgreSQL Partial Unique B-Tree Index:
  ```sql
  CREATE UNIQUE INDEX uq_agency_active_owner
    ON agency_memberships (agency_id)
    WHERE role = 'AGENCY_OWNER' AND status = 'ACTIVE';
  ```
- **Enforcement Level**: Database engine.
- **Failure Behavior**: The second write fails immediately with SQLSTATE `23505` (`unique_violation`), mapped to `UniqueConstraintViolationError`.
- **Lifecycle Distinction**: Ownerless draft agencies are permitted; exactly-one active owner is an onboarding/activation lifecycle invariant enforced at the service level.
- **Test Evidence**: `Agencies, Properties, Listings Integration Tests` (Section B.1–B.3).

---

### 2.3 Single Active Agency Membership per User
- **Invariant**: A user/broker may belong to **at most one** agency in an active state (`status = 'ACTIVE'`) across the platform.
- **Race Condition**: A broker accepting invitations from two separate agencies simultaneously in parallel browser tabs.
- **Protection Mechanism**: PostgreSQL Partial Unique B-Tree Index:
  ```sql
  CREATE UNIQUE INDEX uq_user_active_membership
    ON agency_memberships (user_id)
    WHERE status = 'ACTIVE';
  ```
- **Enforcement Level**: Database engine.
- **Failure Behavior**: The second transaction aborts with SQLSTATE `23505` (`unique_violation`).
- **Historical Retention**: Inactive, suspended, or terminated memberships are retained for compliance without violating uniqueness.
- **Test Evidence**: `Agencies, Properties, Listings Integration Tests` (Section B.4).

---

### 2.4 Listing Ownership Structure Integrity
- **Invariant**: A listing must strictly conform to its declared `owner_type`:
  - `INDEPENDENT_BROKER`: `broker_id` NOT NULL, `agency_id` NULL.
  - `AGENCY`: `agency_id` NOT NULL, `broker_id` NOT NULL (listing agent).
  - `DIRECT_OWNER`: `agency_id` NULL, `broker_id` NULL.
- **Race Condition**: Concurrent update mutating `owner_type` without providing matching agency/broker references, or vice versa.
- **Protection Mechanism**: Database CHECK Constraint:
  ```sql
  CONSTRAINT chk_listings_owner_type_consistency
    CHECK (
      (owner_type = 'INDEPENDENT_BROKER' AND broker_id IS NOT NULL AND agency_id IS NULL) OR
      (owner_type = 'AGENCY' AND agency_id IS NOT NULL AND broker_id IS NOT NULL) OR
      (owner_type = 'DIRECT_OWNER' AND agency_id IS NULL AND broker_id IS NULL)
    );
  ```
- **Enforcement Level**: Database engine. Tested across both `INSERT` and `UPDATE` mutation paths.
- **Test Evidence**: `Agencies, Properties, Listings Integration Tests` (Section D.4).

---

### 2.5 Multi-Write Entity Creation (Identity + Profile)
- **Invariant**: An auth identity and its user profile must be created atomically. An identity must never exist without an initialized profile, nor can an orphaned profile exist.
- **Race Condition**: Network partition or unhandled exception occurring after inserting `auth_identities` but before inserting `user_profiles`.
- **Protection Mechanism**: Atomic database transaction via `withTransaction`:
  ```typescript
  await withTransaction(pool, async (tx) => {
    const identity = await identityRepo.create(tx, params);
    await profileRepo.create(tx, { userId: identity.id, ...params });
  });
  ```
- **Enforcement Level**: Database transaction (`BEGIN ... COMMIT / ROLLBACK`).
- **Failure Behavior**: Any failure during profile creation triggers automatic `ROLLBACK`; zero partial state remains in PostgreSQL.
- **Test Evidence**: `Persistence Engine Hardening Tests` (Section E: Failure Injection Test).

---

### 2.6 Outbox Atomic Event Insertion
- **Invariant**: A business state mutation and its corresponding outbox event MUST be committed in the same database transaction.
- **Race Condition**: Process crashes immediately after business table write but before outbox event write.
- **Protection Mechanism**: Unified `QueryExecutor` context. `insertOutboxEvent` accepts the active `TransactionContext`.
- **Enforcement Level**: Database transaction. If business mutation fails, outbox event is rolled back; if outbox insertion fails, business mutation is rolled back.
- **Test Evidence**: `Persistence Engine Hardening Tests` (Section D.1 & D.2).

---

### 2.7 Concurrent Outbox Event Claiming
- **Invariant**: Multiple distributed outbox workers polling the outbox table must never process the same event concurrently.
- **Race Condition**: Worker A and Worker B simultaneously query for pending events and both claim event #101.
- **Protection Mechanism**: Row-level locking with `FOR UPDATE SKIP LOCKED`:
  ```sql
  WITH eligible AS (
    SELECT id FROM outbox_events
    WHERE (status = 'PENDING' OR (status = 'FAILED' AND attempt_count < max_attempts))
      AND available_at <= NOW()
    ORDER BY available_at ASC, id ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE outbox_events
  SET status = 'PROCESSING', claimed_at = NOW(), claimed_by = $2, attempt_count = attempt_count + 1
  FROM eligible WHERE outbox_events.id = eligible.id
  RETURNING outbox_events.*;
  ```
- **Enforcement Level**: PostgreSQL row-level lock manager.
- **Test Evidence**: `Persistence Engine Hardening Tests` (Section D.3: Concurrent Worker Claim Test).

---

### 2.8 Outbox Claim Ownership & Stale Lease Recovery
- **Invariant**: Worker B cannot acknowledge or fail an event currently claimed by Worker A. If Worker A crashes, its claim lease must expire and be reclaimed safely.
- **Race Condition**: Worker A experiences a network freeze. The lease expires, and Worker B claims the event. Worker A unfreezes and attempts to mark the event `PUBLISHED`.
- **Protection Mechanism**:
  - Ownership Guard: `WHERE id = $id AND status = 'PROCESSING' AND claimed_by = $workerId`. If `rowCount === 0`, throws `OutboxStateTransitionError`.
  - Lease Reclaim: `reclaimStaleOutboxLeases` resets status to `PENDING` when `claimed_at < NOW() - leaseTimeout`.
- **Enforcement Level**: Conditional SQL update (CAS) + database lease timeout.
- **Test Evidence**: `Persistence Engine Hardening Tests` (Section D.4, D.6, D.8).

---

### 2.9 Keyset Pagination Stability Under Mid-Feed Insertions
- **Invariant**: Keyset pagination feeds must not skip records or return duplicate records when new rows are inserted between page fetches.
- **Race Condition**: New listing inserted while a seeker is scrolling from page 1 to page 2 using traditional offset pagination (`OFFSET 20`).
- **Protection Mechanism**: Keyset comparison tuple `(sort_col, id)`:
  ```sql
  WHERE (created_at < $1 OR (created_at = $1 AND id < $2))
  ORDER BY created_at DESC, id DESC
  LIMIT $3;
  ```
- **Enforcement Level**: Deterministic SQL query logic with unique tie-breaker (`id`).
- **Test Evidence**: `Persistence Engine Hardening Tests` (Section F: Keyset Pagination Tuple Comparison on Real PostgreSQL).

---

### 2.10 Geographic Coordinate Divergence Prevention
- **Invariant**: `latitude` and `longitude` numeric coordinates must match PostGIS `location geography(Point, 4326)` within 0.000001 degrees.
- **Race Condition**: Concurrent update updating only `latitude` while leaving `location` unchanged, creating diverging spatial data.
- **Protection Mechanism**:
  - Synchronization Trigger: `trg_properties_sync_coordinates` derives missing values on `BEFORE INSERT OR UPDATE`.
  - Database Constraint: `chk_properties_coordinate_consistency` verifies `abs(ST_Y(location::geometry) - latitude) < 0.000001 AND abs(...) < 0.000001`.
- **Enforcement Level**: Database engine (PL/pgSQL Trigger + CHECK Constraint).
- **Test Evidence**: `Agencies, Properties, Listings Integration Tests` (Section C.1–C.4).

---

### 2.11 Account Phone Registration Uniqueness
- **Invariant**: Only one account may exist per phone number.
- **Race Condition**: Two concurrent registration requests for the same phone number arriving in parallel.
- **Protection Mechanism**: PostgreSQL Unique B-Tree Index on `auth_identities(phone)`.
- **Enforcement Level**: Database engine (`23505 unique_violation`).
- **Test Evidence**: `Identity and Authentication E2E Integration Flow` (`services/api`).

---

### 2.12 Super Admin Single-Use Step-Up Nonce Replay
- **Invariant**: A high-privilege administrative step-up authentication token/nonce must be strictly single-use and cannot be replayed.
- **Race Condition**: Attacker attempting concurrent duplicate submissions of an intercepted step-up token across two API instances.
- **Protection Mechanism**: Distributed atomic consumption via Redis single-use nonce store (`SET ... NX` / `DEL` CAS) with fail-closed semantics.
- **Enforcement Level**: Distributed Infrastructure Layer.
- **Test Evidence**: `Distributed Step-Up Replay Protection (Redis-backed)` unit and integration tests.
