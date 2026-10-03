# Index & Query Performance Plan

## Purpose

This document provides the authoritative index inventory, query optimization patterns, indexing conventions, and performance guidelines for the Zero Brokerage PostgreSQL database.

---

## 1. Indexing Conventions & Naming Standards

| Index Category | Naming Pattern | Purpose / Rationale |
| :--- | :--- | :--- |
| **Primary Key** | `pk_<table_name>` (default `<table_name>_pkey`) | Unique B-Tree index on UUID `id`. Guarantees entity uniqueness and supports fast point lookups. |
| **Unique Index** | `uq_<table_name>_<column(s)>` | Enforces domain uniqueness (e.g. phone, slug) and supports deterministic exact-match lookups. |
| **Partial Unique Index** | `uq_<table_name>_<rule>` | Enforces conditional uniqueness over a filtered subset (e.g. active owner, active membership). |
| **Foreign Key Supporting** | `idx_<table_name>_<fk_column>` | Accelerates relational joins and prevents full-table locks during referential integrity checks on referenced tables. |
| **Query / Lifecycle Filter** | `idx_<table_name>_<purpose>` | Accelerates frequent filtering paths (e.g. status + availability, phone + purpose). |
| **Spatial Index (GiST)** | `idx_<table_name>_<geom_column>_gist` | Accelerates PostGIS bounding-box (`ST_Covers`, `&&`) and radius queries (`ST_DWithin`). |
| **Full-Text Search (GIN)** | `idx_<table_name>_<column>_gin` | Reserved for future `tsvector` keyword searches on listing titles and descriptions (Step 10). |

---

## 2. Complete Index Inventory (Current Implemented Slice)

### 2.1 Core Infrastructure & Migrations
- **`schema_migrations`**:
  - `schema_migrations_pkey`: Primary key B-Tree index on `id` (VARCHAR).

### 2.2 Identity & Auth Module
- **`auth_identities`**:
  - `auth_identities_pkey`: Primary key B-Tree index on `id` (UUID).
  - `auth_identities_phone_key` (`UNIQUE`): B-Tree index on `phone`. Enforces single account per phone number and supports exact-match lookups.
- **`user_profiles`**:
  - `user_profiles_pkey`: Primary key B-Tree index on `user_id` (UUID). Enforces 1:1 relationship with `auth_identities`.
- **`auth_sessions`**:
  - `auth_sessions_pkey`: Primary key B-Tree index on `id` (UUID).
  - `auth_sessions_refresh_token_hash_key` (`UNIQUE`): B-Tree index on `refresh_token_hash`. Supports session token verification.
  - `idx_auth_sessions_token_hash`: B-Tree index on `refresh_token_hash`.
  - `idx_auth_sessions_user_id`: B-Tree index on `user_id`. Supports session lookup and revocation by user ID.
- **`auth_otp_challenges`**:
  - `auth_otp_challenges_pkey`: Primary key B-Tree index on `id` (UUID).
  - `idx_otp_phone_status`: Composite B-Tree index on `(phone, status)`. Supports challenge status lookups by phone.
  - `idx_otp_expires_at`: B-Tree index on `expires_at`. Supports expiration queries.
- **`auth_security_events`**:
  - `auth_security_events_pkey`: Primary key B-Tree index on `id` (UUID).
  - `idx_security_events_user`: B-Tree index on `user_id`. Supports security audit history retrieval by user ID.
  - `idx_security_events_type`: B-Tree index on `event_type`.
  - `idx_security_events_created`: B-Tree index on `created_at`.

### 2.3 Agencies & Brokers Modules
- **`agencies`**:
  - `agencies_pkey`: Primary key B-Tree index on `id` (UUID).
  - `agencies_slug_key` (`UNIQUE`): B-Tree index on `slug`. Guarantees unique agency vanity URLs and supports slug lookups.
- **`agency_memberships`**:
  - `agency_memberships_pkey`: Primary key B-Tree index on `id` (UUID).
  - `idx_agency_user_unique` (`UNIQUE`): Composite B-Tree index on `(agency_id, user_id)`. Prevents duplicate memberships for the same agency-user pair.
  - `idx_agency_memberships_user`: B-Tree index on `user_id`. Supports retrieving agency memberships for a user.
  - `idx_agency_memberships_agency_status`: Composite B-Tree index on `(agency_id, status)`. Supports listing members by agency and status.
  - `uq_agency_active_owner` (`PARTIAL UNIQUE`): B-Tree index on `agency_id` WHERE `(role = 'AGENCY_OWNER' AND status = 'ACTIVE')`. Enforces at most one active owner per agency.
  - `uq_user_active_membership` (`PARTIAL UNIQUE`): B-Tree index on `user_id` WHERE `(status = 'ACTIVE')`. Enforces that a user belongs to at most one active agency at a time.
- **`broker_verifications`**:
  - `broker_verifications_pkey`: Primary key B-Tree index on `id` (UUID).
  - `broker_verifications_user_id_key` (`UNIQUE`): B-Tree index on `user_id`. Guarantees single verification record per broker user.

### 2.4 Transactional Outbox Infrastructure
- **`outbox_events`**:
  - `outbox_events_pkey`: Primary key B-Tree index on `id` (UUID).
  - `idx_outbox_events_status_available_at`: Composite B-Tree index on `(status, available_at)`. Supports the worker claim query (`WHERE (status = 'PENDING' OR ...) AND available_at <= NOW() ORDER BY available_at ASC, id ASC`).

### 2.5 Listings & Properties Modules
- **`properties`**:
  - `properties_pkey`: Primary key B-Tree index on `id` (UUID).
  - `idx_properties_location_gist` (`GIST`): Generalized Search Tree index on `location` (`geography(Point, 4326)`). Supports geospatial bounding-box (`ST_Covers`, `&&`) and distance-radius searches (`ST_DWithin`).
  - `idx_properties_type_sub_type`: Composite B-Tree index on `(property_type, sub_type)`.
  - `idx_properties_city_locality`: Composite B-Tree index on `(city, locality)`.
  - `idx_properties_created_at`: Composite B-Tree index on `(created_at DESC, id DESC)`.
- **`listings`**:
  - `listings_pkey`: Primary key B-Tree index on `id` (UUID).
  - `idx_listings_property_id`: B-Tree index on `property_id`. Supports retrieving listing offers for a property.
  - `idx_listings_agency_id`: Partial B-Tree index on `agency_id` WHERE `agency_id IS NOT NULL`.
  - `idx_listings_broker_id`: Partial B-Tree index on `broker_id` WHERE `broker_id IS NOT NULL`.
  - `idx_listings_status`: B-Tree index on `status`.
  - `idx_listings_intent_status`: Composite B-Tree index on `(listing_intent, status)`.
  - `idx_listings_price`: Composite B-Tree index on `(price, id)` (or `(price_minor, id)`).
  - `idx_listings_created_at`: Composite B-Tree index on `(created_at DESC, id DESC)`. Supports keyset pagination.

---

## 3. Critical Query Optimization Patterns

### 3.1 PostGIS Spatial Queries & Index Capability
- **Radius Search (`ST_DWithin`)**:
  ```sql
  SELECT id, title, ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
  FROM properties
  WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
  ORDER BY distance_meters ASC;
  ```
  - **Index Capability**: The `idx_properties_location_gist` index is capable of evaluating `ST_DWithin` on `geography` without full-table scans.
  - **Verification Note**: Automated test suites verify index capability using `EXPLAIN` with sequential scans disabled (`SET LOCAL enable_seqscan = off`) against seeded test fixtures. Production throughput and latency must be empirically measured under representative production workloads. No sub-millisecond or scale guarantees are asserted without production benchmark evidence.

- **Bounding Box Search (`ST_Covers`)**:
  ```sql
  SELECT id, title
  FROM properties
  WHERE ST_Covers(ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography, location);
  ```
  - Uses the 2D bounding envelope to index-filter candidates. Non-wrapping bounding boxes (`minLon <= maxLon`) are supported; antimeridian crossing is rejected at application validation.

### 3.2 Keyset / Cursor Pagination on Real PostgreSQL
- **Pagination Pattern**:
  ```sql
  SELECT *
  FROM listings
  WHERE (status = $1)
    AND (created_at < $2 OR (created_at = $2 AND id < $3))
  ORDER BY created_at DESC, id DESC
  LIMIT $4;
  ```
  - **Advantage Over Offset Pagination**: Keyset pagination eliminates the `O(N)` cost of discarding offset rows (`OFFSET 10000`).
  - **Index Support**: Composite index `(created_at DESC, id DESC)` and `idx_listings_status` allow PostgreSQL to evaluate candidates via index scan.

### 3.3 Outbox Claiming (`FOR UPDATE SKIP LOCKED`)
- **Query Pattern**:
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
  - **Concurrency Characteristics**: `SKIP LOCKED` instructs PostgreSQL to skip any rows currently locked by concurrent worker transactions. This avoids worker serialization and lock-wait contention when multiple workers claim concurrently. Scale limits and optimal worker pool size must be empirically validated against actual load.

---

## 4. Query Performance Guidelines for Engineers

1. **Avoid Unbounded Queries**:
   - Every list query must specify an explicit `LIMIT` bounded by application constants (`DEFAULT_PAGE_LIMIT = 20`, `MAX_PAGE_LIMIT = 100`).
2. **Prevent N+1 Queries**:
   - Relational joins or batch queries using `WHERE id = ANY($1::uuid[])` must be used instead of executing queries in loops.
3. **Keep Transactions Short**:
   - Connection pool starvation occurs when transactions hold clients while waiting on slow application logic. Do not perform external network calls, file hashing, or heavy formatting inside an open database transaction.
4. **Empirical Benchmarking Standard**:
   - Query planner `EXPLAIN (ANALYZE, BUFFERS)` must be evaluated on staging environments with realistic data volume before asserting production SLAs.
   - Engineering documentation must never claim specific latency numbers (e.g. "sub-millisecond") unless verified by reproducible benchmarks on representative datasets.
