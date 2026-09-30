# Database & Repository Test Coverage Documentation

## Purpose

This document provides a comprehensive audit of test coverage, test environments, execution strategies, and verification evidence across the database and persistence layers of the Zero Brokerage platform.

---

## 1. Test Strategy & Architectural Principles

1. **Real PostgreSQL & PostGIS Verification**:
   - Mocks are strictly prohibited for database behavior. All schema constraints, unique indexes, transactions, savepoints, advisory locks, coordinate triggers, and PostGIS spatial queries execute against real instances of **PostgreSQL 18.6** and **PostGIS 3.6**.
2. **Deterministic Test Database Isolation**:
   - Tests execute against a dedicated test database (`zero_brokerage_test`).
   - Connection resolution is handled dynamically via `test-config.ts` (supporting direct host localhost:5432, WSL2 bridged virtual environments, or `TEST_DATABASE_URL`).
   - Clean slate isolation: Test suites execute clean database resets using `TRUNCATE ... CASCADE` in `beforeEach` hooks or schema drop/re-migration in migration lifecycle suites.
3. **Connection Lifecycle Safety**:
   - Connection pools are created with bounded sizes and closed in `after()` teardown hooks to eliminate connection and socket leaks.

---

## 2. Test Suites Inventory & Coverage Breakdown

### 2.1 Migration Safety & Concurrency Tests
- **Test File**: `packages/database/tests/migrations.integration.test.ts`
- **Scope**: 14 tests verifying migration runner, locking, and checksum integrity.
- **Specific Coverage**:
  - `TEST 1`: Fresh migration application on an empty database (verifies tables, extensions, and checksum persistence).
  - `TEST 2`: Strict idempotency of consecutive migration runs without duplicate execution.
  - `TEST 3`: SHA-256 checksum calculation matching persisted database records.
  - `TEST 4`: Physical file tampering detection (simulates on-disk code modification post-apply).
  - `TEST 5`: Forward-only execution of new migrations in sequential order.
  - `TEST 6`: DDL rollback behavior upon migration failure (preserves clean metadata state).
  - `TEST 7`: Immediate failure on duplicate migration IDs prior to database acquisition.
  - `TEST 8`: Advisory lock mutual exclusion preventing concurrent migration runners from colliding.
  - `TEST 9`: Unconditional release of advisory lock upon successful completion.
  - `TEST 10`: Unconditional release of advisory lock upon unhandled runner error.
  - `TEST 11`: Cross-platform checksum determinism across Windows (CRLF), Linux (LF), and UTF-8 BOM.
  - `TEST 12`: Advisory lock session ownership semantics (proves Session B cannot release Session A's lock).
  - `TEST 13`: Automatic advisory lock release by PostgreSQL upon abrupt client socket termination.
  - `TEST 14`: Deadlock prevention under severely constrained connection pool (`max: 2`).

---

### 2.2 Persistence Engine Hardening Tests
- **Test File**: `packages/database/tests/persistence.integration.test.ts`
- **Scope**: 19 tests verifying error mapping, transactions, outbox persistence, atomicity, and keyset pagination.
- **Specific Coverage**:
  - **Section A (Error Mapping)**:
    - SQLSTATE `23505` (`unique_violation`) → `UniqueConstraintViolationError` with metadata.
    - SQLSTATE `23503` (`foreign_key_violation`) and `23001` (`restrict_violation`) → `ForeignKeyViolationError`.
    - SQLSTATE `23502` (`not_null_violation`) → `NotNullConstraintViolationError`.
    - SQLSTATE `23514` (`check_violation`) → `CheckConstraintViolationError`.
  - **Section B (Transaction Infrastructure & Savepoints)**:
    - Atomic multi-write commit on successful callback completion.
    - Complete rollback of all writes when callback throws.
    - Unconditional pool client release in success and failure branches.
    - Nested savepoint support: Inner savepoint failure rolls back locally while outer transaction commits.
    - Backend PID verification proving root and nested savepoint contexts share the exact same PostgreSQL connection.
    - Multi-level nested savepoints (Root → L1 → L2 → L3) with granular rollback handling.
    - Savepoint identifier SQL injection prevention.
  - **Section D (Transactional Outbox)**:
    - Atomic insertion in same transaction context as business mutation.
    - Outbox event rollback when business mutation fails.
    - Concurrent worker claims using `FOR UPDATE SKIP LOCKED` without double-claiming.
    - Transition to `PUBLISHED` upon external dispatch confirmation.
    - Bounded retry backoff and transition to `DEAD_LETTER` when `max_attempts` is reached.
    - Stale lease recovery resetting abandoned processing locks.
    - Guarded status transitions preventing invalid state jumps.
    - Worker claim ownership enforcement preventing cross-worker state overwrites.
  - **Section E (Multi-Write Atomicity)**:
    - Failure injection test: Proves `auth_identities` and `user_profiles` are rolled back together if profile creation fails.
  - **Section F (Keyset Pagination)**:
    - Tuple comparison `(created_at, id)` verification under mid-feed insertions on real PostgreSQL.

---

### 2.3 Geospatial Utility Unit Tests
- **Test File**: `packages/database/tests/geospatial.test.ts`
- **Scope**: 18 unit tests validating coordinate bounds, bounding box contracts, and SQL generators.
- **Specific Coverage**:
  - `validateCoordinates`: Valid range validation, rejection of out-of-range latitude/longitude, rejection of `NaN`, `Infinity`, and non-numeric types.
  - `validateBoundingBox`: Normal boxes, single-meridian/parallel degenerate boxes, deterministic rejection of antimeridian crossing (`minLon > maxLon`).
  - `buildRadiusCondition`: Parameterized `ST_DWithin` SQL construction in meters, column identifier injection prevention.
  - `buildBoundingBoxCondition`: Parameterized `ST_Covers` SQL generation.
  - `buildDistanceSelect`: Parameterized `ST_Distance` SELECT clause generation.
  - WKT format and parser validation (`POINT(lon lat)`).

---

### 2.4 Agencies, Properties, Listings & PostGIS Integration Tests
- **Test File**: `packages/database/tests/agencies-properties-listings.integration.test.ts`
- **Scope**: 25 tests verifying real PostGIS queries, coordinate synchronization, monetary minor units, and ownership rules.
- **Specific Coverage**:
  - **Section A (Agencies)**: Agency creation, UUID generation, slug uniqueness (`agencies_slug_key`).
  - **Section B (Agency Memberships & Owner Invariants)**:
    - Single active owner invariant: `uq_agency_active_owner` partial unique index allows at most one active owner; blocks concurrent duplicate owners.
    - Ownerless draft agency creation permitted.
    - Multiple historical / terminated owners permitted.
    - Single active membership invariant: `uq_user_active_membership` blocks user from joining two agencies concurrently.
  - **Section C (Properties & PostGIS Coordinate Consistency)**:
    - PostGIS Point creation with correct `(longitude, latitude)` coordinate ordering.
    - Divergence prevention on `INSERT`: Mismatched coordinates and PostGIS point rejected with `23514`.
    - Divergence prevention on `UPDATE`: Trigger `trg_properties_sync_coordinates` derives missing coordinates or enforces consistency.
    - Latitude `[-90, 90]` and Longitude `[-180, 180]` boundary enforcement.
  - **Section D (Listings, Monetary Storage & Ownership)**:
    - `BIGINT` minor units persistence with exact precision preservation.
    - Zero price accepted; negative price rejected on both `INSERT` and `UPDATE` (`price_minor >= 0`).
    - Broker boundary: FK `listings.broker_id -> auth_identities.id` proves identity existence only.
    - Ownership type consistency: CHECK constraint `chk_listings_owner_type_consistency` validates all three owner models (`INDEPENDENT_BROKER`, `AGENCY`, `DIRECT_OWNER`).
  - **Section E (PostGIS Spatial Queries & GiST Index)**:
    - Radius query: `ST_DWithin` correctly includes properties within radius in meters and excludes distant properties.
    - Bounding box query: `ST_Covers` filters properties inside geographical envelope.
    - Spatial index execution capability: Query planner `EXPLAIN` with sequential scans disabled proves `idx_properties_location_gist` is utilized by PostgreSQL.
  - **Section F (Retention & Deletion Safety)**:
    - `agencies` deletion blocked by referencing listings or memberships (`ON DELETE RESTRICT`).
    - `properties` deletion blocked by referencing listings (`ON DELETE RESTRICT`).

---

### 2.5 API Repositories & Pagination Tests
- **Test Files**:
  - `services/api/src/modules/listings/tests/property-listing-repository.integration.test.ts`
  - `services/api/src/common/pagination/pagination.test.ts`
- **Scope**: 14 repository integration tests + 12 pagination unit tests.
- **Specific Coverage**:
  - `PropertyRepository`: End-to-end entity creation, point retrieval, radius search in meters, bounding-box search, degenerate box acceptance, and antimeridian crossing rejection.
  - `ListingRepository`: Independent broker listings, agency-managed listings, foreign key validation, keyset cursor pagination (`listListings`), status transitions, and BigInt round-trip fidelity.
  - Pagination utilities: Cursor encoding/decoding, Base64URL structure, version check (`v: 1`), sort field allowlisting, query-context validation, limit normalization.

---

## 3. Verified Test Execution Summary

Current verified test execution metrics across workspaces:

| Workspace / Package | Test Suites | Total Tests | Passed | Failed | Skipped | Test Execution Result |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`@zero-brokerage/database`** | **21** | **76** | **76** | **0** | **0** | **76/76 Passed** |
| **`@zero-brokerage/api`** | **27** | **118** | **118** | **0** | **0** | **118/118 Passed** |
| **Total Platform Test Suite** | **48** | **194** | **194** | **0** | **0** | **194/194 Passed** |

### Code Coverage Distinction Note
Passing all 194 reported tests proves that the implemented features, edge cases, and failure paths satisfy their integration assertions. However, **passing tests must not be equated with 100% code coverage**. Formal line/branch coverage reporting tooling (e.g. `c8` / Istanbul) is not configured in Step 03; therefore, no quantitative code coverage percentage is claimed.

### Static Quality Verification
- **Typecheck (`tsc --noEmit`)**: 0 errors across `@zero-brokerage/database` and `@zero-brokerage/api`.
- **Build (`tsc`)**: 0 errors across `@zero-brokerage/database` and `@zero-brokerage/api`.
- **Lint (`eslint .`)**: 0 errors.

