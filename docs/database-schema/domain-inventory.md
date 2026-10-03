# Domain Inventory & Persistence Architecture

## Purpose
Authoritative catalog of domain entities, ownership boundaries, referential integrity rules, monetary standards, geospatial specifications, and retention strategies for the Zero Brokerage platform.

---

## 1. Domain Ownership Matrix

| Domain Module | Owning Tables | Logical Boundaries & Responsibilities |
| :--- | :--- | :--- |
| **Identity & Auth** | `auth_identities`<br>`auth_sessions`<br>`auth_otp_challenges`<br>`auth_security_events` | Authentication credentials, phone normalization, session lifecycles, cryptographic challenge tokens, administrative step-up nonces. |
| **Users** | `user_profiles` | User profile details, avatars, display names, seeker preferences. |
| **Agencies** | `agencies`<br>`agency_memberships` (logical) | Agency business identity, legal entity status, registration details, brokerage organization memberships. |
| **Brokers** | `broker_verifications` (logical)<br>*(future `broker_profiles`)* | Broker government license verification, real estate authority accreditation, compliance state. |
| **Listings & Properties** | `properties`<br>`listings` | Physical real estate asset catalog, PostGIS geospatial points, commercial listing offers, listing-to-property relationships, ownership links. |

### Historical Migration Placement vs Logical Ownership Note
In applied migration `20260928_002_create_identity_and_auth_tables.ts`, `agency_memberships` and `broker_verifications` were physically introduced alongside identity structures.
- **Logical Ownership**:
  - `agency_memberships` is owned by the **Agencies** module.
  - `broker_verifications` is owned by the **Brokers** module.
- **Physical Placement**:
  - Retained immutably in migration `002` to preserve historical integrity.
  - Foreign key referential integrity (`agency_memberships.agency_id -> agencies.id`) and domain invariants were established forward-compatibly in migration `20260930_004_create_agencies_properties_listings.ts` and hardened in migration `20260930_005_harden_agencies_properties_listings.ts`.
  - A foreign key does NOT transfer table ownership; cross-module repositories must never directly mutate another domain's tables.

---

## 2. Core Entities & Distinctions

### Property vs. Listing Distinction
- **Property (`properties`)**:
  - Represents the immutable/underlying physical real-world real estate asset.
  - Contains physical attributes: address line, locality, city, state, postal code, country code, built-up area, carpet area, bedrooms, bathrooms, furnishings, and geographic location coordinates (`geography(Point, 4326)`).
  - Can exist independently of commercial market offerings.
  - Embedded address structure ensures atomic updates and applies spatial GiST indexing directly to `properties.location`.
- **Listing (`listings`)**:
  - Represents a commercial offer or marketing placement on the platform for a property (e.g., for SALE, RENT, or LEASE).
  - References `property_id -> properties.id` (normalized relationship; does NOT duplicate property physical data).
  - Contains commercial terms: pricing (stored as `BIGINT` minor units per P0-001), price period, security deposit, maintenance fees, negotiation flags, and publication status.
  - Maintains explicit ownership context (`owner_type`):
    - `INDEPENDENT_BROKER`: Broker-owned listing (`broker_id` NOT NULL, `agency_id` NULL).
    - `AGENCY`: Agency-owned or agency-managed listing (`agency_id` NOT NULL).
    - `DIRECT_OWNER`: Direct owner listing (`agency_id` NULL, `broker_id` NULL).

---

## 3. Monetary Representation Standard (P0-001)

- **Authoritative Representation**: All monetary values are strictly persisted as **`BIGINT` minor units** with an explicit 3-character ISO currency code (e.g. `INR`).
  - Example: `₹1,499.00` is persisted as `149900` in `price_minor` with `currency = 'INR'`.
  - Columns: `price_minor BIGINT NOT NULL`, `security_deposit_minor BIGINT NULL`, `maintenance_fee_minor BIGINT NULL`, `currency VARCHAR(3) NOT NULL DEFAULT 'INR'`.
- **Prohibitions**:
  - `NUMERIC`, `DECIMAL`, `FLOAT`, and `DOUBLE` are strictly prohibited as authoritative persisted monetary fields.
  - JavaScript floating point arithmetic must never be used for financial storage or transitions.
- **Constraints**: Non-negative database check constraints:
  - `CHECK (price_minor >= 0)`
  - `CHECK (security_deposit_minor IS NULL OR security_deposit_minor >= 0)`
  - `CHECK (maintenance_fee_minor IS NULL OR maintenance_fee_minor >= 0)`
  - `CHECK (length(currency) = 3)`

---

## 4. Agency Invariants & Membership Boundary

1. **Active Owner Invariant (At Most One)**:
   - The database partial unique index guarantees **AT MOST ONE** active `AGENCY_OWNER` per agency:
     ```sql
     CREATE UNIQUE INDEX uq_agency_active_owner
       ON agency_memberships (agency_id)
       WHERE role = 'AGENCY_OWNER' AND status = 'ACTIVE';
     ```
   - **Lifecycle Enforcement**: An agency may initially exist in an ownerless state pending owner invitation/onboarding. The requirement for **exactly one active owner** is a lifecycle/service-level invariant enforced during agency activation/onboarding workflows in future service modules.
   - Historical or non-active owners (`status != 'ACTIVE'`) remain intact for auditability without violating the unique constraint.
2. **Single Active Membership Invariant**:
   - A user/broker can belong to only one agency at a time in an active state:
     ```sql
     CREATE UNIQUE INDEX uq_user_active_membership
       ON agency_memberships (user_id)
       WHERE status = 'ACTIVE';
     ```
   - Historical memberships (`SUSPENDED`, `TERMINATED`, `RESIGNED`) remain intact for audit and legal compliance.
3. **Broker Relationship Boundary**:
   - `listings.broker_id` references `auth_identities.id` (`ON DELETE RESTRICT`).
   - **Boundary Definition**: The foreign key guarantees identity existence only. It does not certify that the identity has a completed broker profile, verified RERA license, or active accreditation. Broker verification lifecycle and role eligibility remain strictly within the Brokers domain and application authorization policies.

---

## 5. Property Taxonomy Decision (Case B)

- **Taxonomy Status**: Case B (Unresolved / Open Taxonomy Specification).
  - The approved project scope and blueprints define broad real-estate categories (residential, commercial, land) and sample property types (apartments, penthouses, villas, offices, plots) but do NOT define a formal, closed mathematical compatibility matrix between `property_type` and `sub_type`.
- **Database Boundary**:
  - Independent check constraints are enforced for valid `property_type` and `sub_type` enums.
  - Cross-field taxonomy compatibility (e.g. prohibiting `property_type = 'RESIDENTIAL'` with `sub_type = 'OFFICE'`) is maintained at the application validation boundary until a formal taxonomy decision is finalized in product specifications.
  - Decision Reference: `TODO(taxonomy-matrix): Finalize closed property_type <-> sub_type compatibility matrix in Step 07`.

---

## 6. Geospatial Architecture (PostGIS)

### Authoritative Representation & Coordinate Consistency
- **Authoritative Source**: PostGIS `location geography(Point, 4326)` using WGS 84 coordinate reference system (SRID 4326).
- **Coordinate Order**: **(Longitude, Latitude)** strictly enforced.
  - In PostGIS: `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`.
  - Longitude: East/West axis, valid range `[-180.0, 180.0]`.
  - Latitude: North/South axis, valid range `[-90.0, 90.0]`.
- **Database Divergence Protection**:
  - `properties` enforces a database CHECK constraint:
    ```sql
    CONSTRAINT chk_properties_coordinate_consistency
      CHECK (
        abs(ST_Y(location::geometry) - latitude) < 0.000001
        AND abs(ST_X(location::geometry) - longitude) < 0.000001
      );
    ```
  - A database trigger `trg_properties_sync_coordinates` automatically derives missing coordinates and rejects mismatched coordinate writes on both `INSERT` and `UPDATE`.

### Spatial Indexing (GiST)
- A GiST index is defined on `properties(location)`:
  ```sql
  CREATE INDEX idx_properties_location_gist ON properties USING GIST (location);
  ```
- GiST index exists on the geography column and the spatial queries are index-capable. Production latency and throughput must be validated separately with representative data and workload benchmarking. Verified via query planner EXPLAIN tests on seeded data.

### Query Primitives, Units & Bounding Box Contract
- **Radius Search**:
  - Distance query: `ST_DWithin(location, ST_SetSRID(ST_MakePoint($lon, $lat), 4326)::geography, $radiusMeters)`.
  - **Units**: Explicitly in **meters**. Negative or non-finite radius values are rejected at validation boundary.
- **Bounding Box Contract (Antimeridian)**:
  - Bounding box query: `ST_Covers(ST_MakeEnvelope($minLon, $minLat, $maxLon, $maxLat, 4326)::geography, location)`.
  - **Contract**: Queries strictly support standard, non-wrapping ranges where `minLongitude <= maxLongitude`.
  - Antimeridian-crossing bounding boxes (`minLongitude > maxLongitude`) are explicitly unsupported in this batch and are deterministically rejected with `GeospatialValidationError`.
  - Degenerate bounding boxes (single meridian `minLon == maxLon` or single parallel `minLat == maxLat`) are accepted.
- **Parameterized SQL**: All spatial helper functions strictly parameterize coordinates and reject raw user interpolation.

### Location Privacy & Obfuscation
- Exact property geographic coordinates are stored in the database for accurate spatial search calculations.
- Storage precision and public exposure are separate concerns:
  - Exact coordinates MUST NOT be exposed through public seeker APIs by default.
  - Privacy/fuzzing layers belong to the API application boundary, preserving raw precision in persistence for spatial analytics and verified visits.

---

## 7. Identifier Strategy & Timestamps

- **Primary Identifiers**: Stable UUIDs generated via `gen_random_uuid()` in PostgreSQL. Sequential integer counters are strictly forbidden for public entities.
- **Timestamps**: All timestamps use PostgreSQL `TIMESTAMPTZ` (UTC-aware).
  - Mutable entities include `created_at` and `updated_at`.
  - Lifecycle timestamps (`published_at`, `archived_at`, `deleted_at`) record explicit domain state changes.

---

## 8. Governed Retention & Deletion Policy (P0-006)

- **Destructive Deletes Forbidden**: Blanket `ON DELETE CASCADE` is prohibited on business-critical domain assets.
  - Deleting an `agency` referenced by `agency_memberships` or `listings` is strictly blocked (`ON DELETE RESTRICT`).
  - Deleting a `property` referenced by `listings` is strictly blocked (`ON DELETE RESTRICT`).
- **Audit & Historical Integrity**: Listings and properties will later be referenced by visits, leads, bookings, contracts, and financial ledgers. Soft-deletion / archiving (`deleted_at`, `archived_at`, `status = 'ARCHIVED'`) is utilized to govern lifecycle transitions while preserving audit integrity.
