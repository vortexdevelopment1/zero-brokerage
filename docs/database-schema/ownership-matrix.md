# Database Ownership Matrix

## Purpose

This document establishes the authoritative database ownership matrix for the Zero Brokerage platform. In alignment with the modular-monolith architectural principle (Step 02) and persistence standards (Step 03), every database entity has exactly one owning module responsible for schema evolution, repository access, data integrity invariants, and lifecycle transitions.

---

## 1. Ownership Principles & Boundaries

1. **Strict Single-Module Ownership**:
   - Every database table is owned exclusively by one domain module or core technical foundation.
   - Only the owning module's repositories may execute write operations (`INSERT`, `UPDATE`, `DELETE`) against its tables.
2. **Foreign Keys Do Not Transfer Ownership**:
   - A foreign key establishes referential integrity, not shared data stewardship.
   - For example, `listings.broker_id` references `auth_identities.id` to guarantee identity existence; this does NOT grant the Listings module permission to mutate identity records, nor does it transfer broker verification authority into the Listings module.
3. **No Direct Cross-Module Mutation**:
   - Modules must interact via published application service interfaces or asynchronous domain events. Direct SQL mutations across module boundaries are strictly prohibited.
4. **Historical Migration Placement vs. Logical Ownership**:
   - In applied migration `20260928_002_create_identity_and_auth_tables.ts`, `agency_memberships` and `broker_verifications` were physically introduced alongside identity tables.
   - Logical ownership is strictly assigned:
     - `agency_memberships` is owned by the **Agencies** module.
     - `broker_verifications` is owned by the **Brokers** module.
   - Physical placement in migration `002` is preserved immutably for migration integrity, while repository code and domain logic remain segregated in their respective modules.

---

## 2. Table Ownership Catalog (Current Implemented Slice)

| Table Name | Owning Module | Primary Key | Foreign Keys & Target | Sensitivity Classification | Lifecycle / Deletion Governance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`schema_migrations`** | **Core Database Infrastructure** | `id` (VARCHAR) | None | Internal | Append-only. Historical applied migration records are strictly immutable. |
| **`auth_identities`** | **Identity & Auth** | `id` (UUID) | None | Restricted / PII (phone number) | Soft-lifecycle: `ACTIVE` → `SUSPENDED` → `DELETION_PENDING` → `DELETED`. Governed by user deletion workflows. |
| **`auth_sessions`** | **Identity & Auth** | `id` (UUID) | `user_id` → `auth_identities.id` (`ON DELETE CASCADE`) | Confidential (session tokens, client IPs) | Ephemeral / Expiring: `ACTIVE` → `REVOKED` / `EXPIRED`. Cascade deleted on identity purge. |
| **`auth_otp_challenges`** | **Identity & Auth** | `id` (UUID) | None | Confidential / Cryptographic (code hashes) | Ephemeral: Short-lived expiration (`expires_at`, `status` = `EXPIRED`/`VERIFIED`/`FAILED`). |
| **`auth_security_events`** | **Identity & Auth** | `id` (UUID) | `user_id` → `auth_identities.id` (`ON DELETE SET NULL`) | Confidential / Audit (IPs, user agents, action metadata) | Append-only audit log. Anonymized on user purge (`ON DELETE SET NULL`). |
| **`user_profiles`** | **Users** | `user_id` (UUID) | `user_id` → `auth_identities.id` (`ON DELETE CASCADE`) | Restricted / PII (names, email, avatar, preferences) | Owned by user lifecycle. Deleted when parent identity is deleted (`ON DELETE CASCADE`). |
| **`agencies`** | **Agencies** | `id` (UUID) | None | Internal / Business Identity (legal entity details) | Governed lifecycle: `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `TERMINATED`. Hard deletion blocked by referencing listings/memberships (`RESTRICT`). |
| **`agency_memberships`** | **Agencies** | `id` (UUID) | `agency_id` → `agencies.id` (`ON DELETE RESTRICT`)<br>`user_id` → `auth_identities.id` (`ON DELETE CASCADE`) | Internal (role, status) | Historical retention: Terminated or resigned memberships are preserved for compliance. Single active membership per user enforced. |
| **`broker_verifications`** | **Brokers** | `id` (UUID) | `user_id` → `auth_identities.id` (`ON DELETE CASCADE`)<br>`reviewed_by` → `auth_identities.id` (`ON DELETE SET NULL`) | Restricted / Compliance (license numbers, document URLs) | Verification lifecycle: `UNSUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, `REVERIFICATION_REQUIRED`. Retained for regulatory audit. |
| **`outbox_events`** | **Core Database Infrastructure** | `id` (UUID) | None | Internal (event payload, metadata) | State-driven dispatch: `PENDING` → `PROCESSING` → `PUBLISHED` / `FAILED` → `DEAD_LETTER`. Retained for event delivery auditing. |
| **`properties`** | **Listings & Properties** | `id` (UUID) | None | Internal / Operational (physical address, coordinates) | Physical asset catalog. Hard deletion blocked if referenced by listings (`ON DELETE RESTRICT`). Coordinates exact internally; fuzzed on public API. |
| **`listings`** | **Listings & Properties** | `id` (UUID) | `property_id` → `properties.id` (`ON DELETE RESTRICT`)<br>`agency_id` → `agencies.id` (`ON DELETE RESTRICT`)<br>`broker_id` → `auth_identities.id` (`ON DELETE RESTRICT`)<br>`created_by` → `auth_identities.id` (`ON DELETE RESTRICT`)<br>`updated_by` → `auth_identities.id` (`ON DELETE RESTRICT`) | Public / Commercial (pricing in minor units, commercial terms) | Commercial offer lifecycle: `DRAFT`, `PENDING_VERIFICATION`, `PENDING_MODERATION`, `PUBLISHED`, `SUSPENDED`, `EXPIRED`, `ARCHIVED`, `REJECTED`, `WITHDRAWN`. Soft-archival preserves history. |


---

## 3. Detailed Entity Profiles

### 3.1 `schema_migrations`
- **Owning Module**: Core Database Infrastructure (`packages/database`).
- **Purpose**: Persists history of applied schema migrations, deterministic SHA-256 content checksums, and execution timestamps.
- **Access Policy**: Accessible exclusively by the migration runner during deployment or test setup. Bypassed by application runtime repositories.

### 3.2 `auth_identities`
- **Owning Module**: Identity & Auth (`services/api/src/modules/identity`).
- **Purpose**: Root account record representing a natural person or agent authenticated by verified phone number. Holds authentication status (`ACTIVE`, `SUSPENDED`, `DELETION_PENDING`, `DELETED`) and base platform role (`USER`, `INDEPENDENT_BROKER`, `AGENCY_BROKER`, `AGENCY_ADMIN`, `SUPER_ADMIN`).
- **Referential Integrity**: Referenced by `user_profiles`, `auth_sessions`, `auth_security_events`, `agency_memberships`, `broker_verifications`, and `listings` (`broker_id`).

### 3.3 `user_profiles`
- **Owning Module**: Users.
- **Purpose**: Domain profile metadata associated with an account (full name, email, avatar URL, seeker preferences).
- **Referential Integrity**: 1:1 relationship with `auth_identities` (`user_id UNIQUE`).

### 3.4 `auth_sessions`
- **Owning Module**: Identity & Auth.
- **Purpose**: Durable record of issued refresh sessions. Identified by CSPRNG SHA-256 token hash (`refresh_token_hash UNIQUE`).
- **Referential Integrity**: Cascades with `auth_identities`.

### 3.5 `auth_otp_challenges`
- **Owning Module**: Identity & Auth.
- **Purpose**: Ephemeral one-time passwords for authentication, phone modification, sensitive step-up verification, and account deletion. Stores cryptographic hash (`code_hash`), attempt counters, and expiration.

### 3.6 `auth_security_events`
- **Owning Module**: Identity & Auth.
- **Purpose**: Security audit trail capturing logins, step-up requests, phone changes, privilege escalations, and suspicious activities.
- **Referential Integrity**: References `auth_identities` with `ON DELETE SET NULL` to preserve historical security logs when accounts are scrubbed.

### 3.7 `agencies`
- **Owning Module**: Agencies.
- **Purpose**: Corporate real estate brokerage organizations, legal entities, tax/registration details, office addresses, and verified slug.
- **Referential Integrity**: Target of foreign keys from `agency_memberships` and `listings`. Protected from cascade deletion via `ON DELETE RESTRICT`.

### 3.8 `agency_memberships`
- **Owning Module**: Agencies.
- **Purpose**: Association between a user and an agency with a specific role (`AGENCY_OWNER`, `ADMIN`, `MANAGER`, `BROKER`, `MEMBER`).
- **Integrity Invariants**:
  - `uq_agency_active_owner`: At most one active owner per agency at the database level (`role = 'AGENCY_OWNER' AND status = 'ACTIVE'`).
  - `uq_user_active_membership`: At most one active membership per user across the platform (`status = 'ACTIVE'`).
  - Historical memberships (`TERMINATED`, `RESIGNED`) retained for audit compliance.

### 3.9 `broker_verifications`
- **Owning Module**: Brokers.
- **Purpose**: Government real estate license verification, RERA accreditation status, compliance documentation, and verification decisions.
- **Boundary Clarification**: Proves broker accreditation status. Existence of an identity in `auth_identities` does not imply approval or verification in this table.

### 3.10 `outbox_events`
- **Owning Module**: Core Database Infrastructure (`packages/database/src/outbox`).
- **Purpose**: Authoritative transactional outbox persistence ensuring atomic domain mutation and message dispatch.
- **Concurrency**: Processed concurrently using `FOR UPDATE SKIP LOCKED` with explicit lease ownership (`claimed_by`, `claimed_at`) and retry limits (`max_attempts`).

### 3.11 `properties`
- **Owning Module**: Listings & Properties.
- **Purpose**: Physical real estate asset catalog storing physical characteristics, embedded address components, and geographic coordinates.
- **Authoritative Geometry**: PostGIS `location geography(Point, 4326)` synchronized strictly with `latitude` and `longitude` via database CHECK constraint `chk_properties_coordinate_consistency` and trigger `trg_properties_sync_coordinates`.

### 3.12 `listings`
- **Owning Module**: Listings & Properties.
- **Purpose**: Commercial offering / placement of a property for SALE, RENT, or LEASE.
- **Monetary Integrity**: Financial figures stored strictly as `BIGINT` minor units (`price_minor`, `security_deposit_minor`, `maintenance_fee_minor`) with an explicit 3-character currency (`currency`).
- **Ownership Invariants**: Database CHECK constraints `chk_listings_agency_owner_requires_agency` and `chk_listings_broker_owner_requires_broker` strictly enforce valid relationships for `INDEPENDENT_BROKER`, `AGENCY`, and `DIRECT_OWNER`.

---

## 4. Deferred Domain Tables (Future Steps)

The following tables are specified in later blueprint steps and are intentionally deferred from Step 03 persistence:
- **Visits & Scheduling (Step 06/08)**: `visits`, `visit_slots`, `agent_availability`.
- **Furniture Rentals & E-Commerce (Step 08)**: `furniture_items`, `furniture_orders`, `furniture_rentals`.
- **Payments & Subscriptions (Step 09)**: `payment_transactions`, `subscriptions`, `entitlements`, `invoices`.
- **Reviews & Ratings (Step 11)**: `reviews`, `ratings`, `moderation_flags`.
- **Leads & Inquiries (Step 07/10)**: `leads`, `inquiries`, `saved_searches`.
