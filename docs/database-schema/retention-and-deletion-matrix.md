# Retention & Deletion Matrix

## Purpose

This document establishes the data retention, deletion, archival, and governance principles for entities in the Zero Brokerage database. It balances consumer privacy, right-to-be-forgotten lifecycles, regulatory compliance, and referential integrity across module boundaries.

---

## 1. Governance Principles & Policies

1. **Governed Lifecycle over Blanket Physical Deletion**:
   - Business-critical entities (agencies, properties, listings, broker verifications) must never be subject to uncoordinated hard `DELETE` operations.
   - Blanket `ON DELETE CASCADE` is strictly prohibited on core business assets to prevent catastrophic cascading data destruction.
2. **Referential Deletion Protection (`ON DELETE RESTRICT`)**:
   - Foreign keys referencing business assets enforce `ON DELETE RESTRICT` (SQLSTATE `23001` / `23503`). Deleting an agency or property that is referenced by active or historical listings is strictly blocked at the database engine level.
3. **Audit & Regulatory Preservation**:
   - Security events, financial transactions, and verification decisions must be preserved for compliance and fraud investigation even when parent user accounts are anonymized or soft-deleted.
4. **Explicit Distinction: Approved Policy vs. Implementation Mechanism vs. Open Policy**:
   - **Implemented Technical Mechanisms**: The database schema provides the columns (`deleted_at`, `deletion_scheduled_at`, `status = 'DELETED'`), check constraints, and referential actions.
   - **Approved Retention Durations**: Retention durations (e.g. grace periods, audit log preservation windows) are **OPEN / TBD** until formally finalized by legal, compliance, and product stakeholders.
   - **Prohibition on Fabricating Policies**: Engineering documentation must not present arbitrary test parameters or implementation defaults (such as a 30-day grace period) as approved business or compliance policy.

---

## 2. Retention & Deletion Catalog

| Entity / Category | Storage Table | Implemented Lifecycle Statuses | Technical Deletion Mechanism | Historical Data Retained? | Exposed on Public APIs? | Automated Cleanup Job Status | Approved Retention Policy Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **User Identity** | `auth_identities` | `ACTIVE`, `SUSPENDED`, `DELETION_PENDING`, `DELETED` | Soft-delete with scheduled purge timestamp (`deletion_scheduled_at`) | Anonymized ID retained for audit FKs | No | Scheduled daemon (Step 12 operational scope) | **OPEN / TBD** (Deletion grace period duration is unfinalized). |
| **User Profiles** | `user_profiles` | None (1:1 with identity) | Hard delete via cascade (`ON DELETE CASCADE` from `auth_identities`) | No (PII scrubbed on user deletion) | No (filtered by identity status) | Cascades on identity purge | **OPEN / TBD** (Tied to user identity purge execution). |
| **Auth Sessions** | `auth_sessions` | Derived (`revoked_at IS NOT NULL` / `expires_at < NOW()`) | Soft revocation (`revoked_at`), hard delete of expired tokens | Minimal (token hash and IP) | No | Expired session purge job (Step 12) | **OPEN / TBD** (Post-expiration retention window is unfinalized). |
| **OTP Challenges** | `auth_otp_challenges` | `PENDING`, `VERIFIED`, `EXPIRED`, `FAILED`, `SUPERSEDED` | Ephemeral TTL expiration (`expires_at`), status transition | No (cryptographic hash only) | No | Periodic cleanup daemon (Step 12) | **OPEN / TBD** (Post-challenge retention window is unfinalized). |
| **Security Audit Events** | `auth_security_events` | Append-only audit events | Permanent retention; user reference anonymized (`ON DELETE SET NULL`) | Yes (Full immutable audit trail) | Admin-only | No purge currently implemented | **OPEN / TBD** (Statutory audit retention period is unfinalized). |
| **Agencies** | `agencies` | `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `TERMINATED` | Soft-lifecycle termination. Hard delete blocked by `RESTRICT` | Yes (Corporate history preserved) | Active only | None (hard deletes blocked) | **OPEN / TBD** (Corporate dissolution retention is unfinalized). |
| **Agency Memberships** | `agency_memberships` | `ACTIVE`, `INVITED`, `SUSPENDED`, `TERMINATED` | Soft-termination. Hard delete blocked by `RESTRICT` on agency | Yes (Historical association retained for audit) | Active members only | None | **OPEN / TBD** (Employment / affiliation history retention is unfinalized). |
| **Broker Verifications** | `broker_verifications` | `UNSUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, `REVERIFICATION_REQUIRED` | Governed lifecycle. Hard delete blocked by `RESTRICT` on referencing listings | Yes (RERA compliance documentation) | No (Internal / Compliance only) | None | **OPEN / TBD** (Statutory real estate license recordkeeping is unfinalized). |
| **Properties** | `properties` | Physical asset catalog (`deleted_at` timestamp) | Governed retention. Hard delete blocked by `RESTRICT` | Yes (Physical real estate record) | Yes (fuzzed location) | None | **OPEN / TBD** (Catalog preservation duration is unfinalized). |
| **Listings** | `listings` | `DRAFT`, `PENDING_VERIFICATION`, `PENDING_MODERATION`, `PUBLISHED`, `SUSPENDED`, `EXPIRED`, `ARCHIVED`, `REJECTED`, `WITHDRAWN` | Soft-archival (`archived_at`, `status = 'ARCHIVED'`). Hard delete blocked by `RESTRICT` | Yes (Historical offerings preserved) | Published listings only | Expiry daemon (Step 07) | **OPEN / TBD** (Historical market listing retention is unfinalized). |
| **Transactional Outbox** | `outbox_events` | `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`, `DEAD_LETTER` | State-driven dispatch. Dispatched events eligible for archival | Audited until dispatched | No (Internal infrastructure) | Archival / purge job (Step 06/12) | **OPEN / TBD** (Published event retention window is unfinalized). |

---

## 3. Account Deletion Technical Workflow

The persistence schema implements the following structural mechanism to support future user deletion workflows:

1. **Initiation (`DELETION_PENDING`)**:
   - `auth_identities.status` is updated to `'DELETION_PENDING'`.
   - `auth_identities.deletion_scheduled_at` is populated with a future timestamp (the specific interval is a configurable runtime parameter, not an approved policy).
   - In existing test/mock fixtures, a 30-day offset has been used for demonstration purposes. This interval is an **implementation placeholder** and must not be construed as approved policy.
   - All active `auth_sessions` for the user are revoked.
2. **Cancellation**:
   - If the user re-authenticates before `deletion_scheduled_at`, `status` is restored to `'ACTIVE'` and `deletion_scheduled_at` is cleared.
3. **Purge Execution (Future Daemon)**:
   - Once `NOW() > deletion_scheduled_at`:
     - `user_profiles` is deleted (`ON DELETE CASCADE`), purging personal display names, email, avatar URL, and preferences.
     - `auth_identities.phone` is scrubbed / anonymized to remove PII while preserving the surrogate UUID key.
     - `auth_identities.deleted_at` is stamped with `NOW()`.
     - `auth_security_events.user_id` is set to `NULL` (`ON DELETE SET NULL`), preserving the audit trail without linking to personal identity.
     - `listings` and `agency_memberships` retain foreign key references to the anonymized identity, preventing referential corruption.

---

## 4. Unresolved Policy Decisions

All specific retention durations and statutory windows remain **unresolved decisions** awaiting formal legal, compliance, and product approval:

1. **Account Deletion Grace Period**: Exact duration between user deletion request and irreversible PII scrubbing (OPEN / TBD).
2. **Statutory Audit Log Retention**: Minimum retention duration for `auth_security_events` (OPEN / TBD).
3. **Broker Regulatory Compliance Records**: Mandated retention window for RERA license documents and verification decisions (OPEN / TBD).
4. **Outbox Event History Purge Window**: Elapsed time before successfully published (`status = 'PUBLISHED'`) outbox rows are purged or moved to cold storage (OPEN / TBD).
5. **Stale Draft Listing Expiration**: Auto-archival or purge window for abandoned unverified draft listings (OPEN / TBD).
