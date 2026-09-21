# Step 07 — Listings, Property Lifecycle, Verification, Moderation, and Publication

## 1. Document Purpose

This document defines the implementation contract for the Zero Brokerage shared backend capabilities related to:

- Property and listing records
- Listing ownership and responsibility
- Listing lifecycle management
- Property and listing verification
- Media and location data
- Moderation and publication
- Duplicate and fraud-risk detection
- Listing suspension, expiry, archival, and restoration
- Administrative review workflows
- Events, background jobs, auditability, and API contracts

This document is intended for the backend implementation team and for interface developers who need to understand the stable listing-related contracts.

The implementation must remain within the approved BRD/SOW scope and the finalized project decisions. Do not introduce unrelated marketplace features, unsupported listing categories, or speculative business rules.

---

## 2. Objectives

Implement a reliable, auditable, and secure listing domain that allows the platform to:

1. Create and manage property listings.
2. Associate listings with the correct owner, broker, or agency context.
3. Capture property details required by the approved product scope.
4. Support property media and location metadata.
5. Enforce listing lifecycle transitions.
6. Separate draft creation from public publication.
7. Support verification and moderation workflows.
8. Prevent unauthorized publication and unauthorized modification.
9. Detect probable duplicates and suspicious listing activity.
10. Suspend, expire, archive, and restore listings safely.
11. Emit domain events for dependent modules.
12. Preserve a trustworthy audit trail for important listing actions.

---

## 3. Scope Boundaries

### 3.1 Included

- Property/listing aggregate design
- Listing ownership and actor relationships
- Listing creation and editing
- Listing status and lifecycle transitions
- Residential and other approved property categories
- Sale/rent listing intent where supported by the BRD/SOW
- Property attributes and amenity metadata
- Address and geospatial metadata
- Media metadata and ordering
- Verification status and evidence references
- Moderation status and review actions
- Publication eligibility checks
- Listing expiry and archival
- Suspension and reinstatement
- Duplicate-risk detection
- Fraud-risk flags and administrative review queues
- Listing search/filter contract foundations
- Audit logs and domain events

### 3.2 Excluded

Do not implement the following inside this module unless a later approved change explicitly requires it:

- Payment collection
- Subscription entitlement calculations
- Visit booking execution
- Lead routing
- Reviews and ratings
- Furniture rental transactions
- Agreement generation
- Commission settlement
- Full-text search infrastructure beyond the listing-domain indexing contract
- External map-provider billing or advanced geospatial analytics

Those capabilities must consume listing contracts rather than duplicating listing business logic.

---

## 4. Core Domain Concepts

### 4.1 Property Versus Listing

Use a clear distinction between:

- **Property**: the underlying real-world real-estate asset.
- **Listing**: a platform offer describing the availability of that property for a specific commercial purpose.

A property may have multiple historical or future listings, but active overlapping listings must be restricted according to the approved ownership and duplication rules.

Do not duplicate the complete property record into every listing record. Use a normalized relationship where the underlying property data is reusable and listing-specific commercial fields remain separate.

### 4.2 Ownership Context

Every listing must have an explicit ownership context.

The ownership model must support:

- Independent broker-owned listings
- Agency-owned listings
- Listings managed by an authorized broker on behalf of an agency
- Administrative ownership or system-controlled records where required for moderation or migration

The API must never infer ownership only from a client-provided ID. Ownership must be derived from the authenticated principal and server-side relationships.

### 4.3 Listing Intent

Represent the commercial intent explicitly rather than relying on free-form text.

Examples of supported intent values may include:

- Sale
- Rent
- Lease, only if explicitly supported by the approved scope

Do not silently add new intent values. Keep the enum centrally defined and versioned.

### 4.4 Lifecycle Status

Use a controlled state machine. Suggested status vocabulary:

- `DRAFT`
- `PENDING_VERIFICATION`
- `PENDING_MODERATION`
- `PUBLISHED`
- `SUSPENDED`
- `EXPIRED`
- `ARCHIVED`
- `REJECTED`
- `WITHDRAWN`

The final enum must be aligned with the approved domain inventory and API contract documents before migration creation.

Do not allow arbitrary status updates through generic CRUD endpoints.

---

## 5. Recommended Data Model

The implementation team must create or update the schema using the shared database package and version-controlled migrations.

### 5.1 `properties`

Represents the underlying real-world property.

Recommended fields:

- `id`
- `public_id`
- `property_type`
- `sub_type`, where applicable
- `title_or_label`, only where needed for internal identification
- `address_line_1`
- `address_line_2`
- `locality`
- `city`
- `state`
- `postal_code`
- `country_code`
- `latitude`
- `longitude`
- `geo_point`, using PostGIS where approved
- `floor_number`, where applicable
- `total_floors`, where applicable
- `built_up_area`
- `carpet_area`
- `plot_area`
- `area_unit`
- `bedroom_count`
- `bathroom_count`
- `balcony_count`
- `parking_details`
- `furnishing_status`
- `amenities`
- `created_at`
- `updated_at`
- `deleted_at`, if soft deletion is approved for the entity

Do not make every field mandatory for every property type. Validation must be conditional on property type and listing intent.

### 5.2 `listings`

Represents a commercial offer for a property.

Recommended fields:

- `id`
- `public_id`
- `property_id`
- `owner_type`
- `owner_id`
- `managing_agency_id`, nullable where not applicable
- `managing_broker_id`, nullable where not applicable
- `listing_intent`
- `asking_price`
- `rent_amount`, where applicable
- `security_deposit_amount`, where applicable
- `maintenance_amount`, where applicable
- `price_period`, where applicable
- `negotiable`
- `availability_date`
- `description`
- `status`
- `verification_status`
- `moderation_status`
- `publication_reason`, nullable
- `rejection_reason`, nullable
- `suspension_reason`, nullable
- `expires_at`
- `published_at`
- `withdrawn_at`
- `archived_at`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

The implementation may split large concerns into related tables if that better matches the finalized database architecture.

### 5.3 Related Tables

Use separate tables where cardinality, auditability, or lifecycle requires it:

- `listing_media`
- `listing_amenities`
- `listing_documents`
- `listing_verification_records`
- `listing_moderation_reviews`
- `listing_status_history`
- `listing_risk_flags`
- `listing_duplicate_candidates`
- `listing_publication_checks`
- `listing_view_counters` or an analytics event stream, if approved
- `listing_external_references`, only if an approved integration requires it

Avoid storing unbounded arrays of operational records inside one JSON column.

### 5.4 Identifiers and Versioning

- Use internal database IDs where appropriate.
- Expose stable public IDs rather than leaking implementation-specific identifiers.
- Add optimistic-concurrency support through a version field or equivalent mechanism.
- Prevent lost updates when two authorized actors edit the same listing.
- Every mutation must update `updated_at` and the responsible actor fields.

---

## 6. Listing Creation Workflow

### 6.1 Creation Rules

When creating a listing:

1. Authenticate the caller.
2. Resolve the caller's platform role and ownership context.
3. Validate the requested property type and listing intent.
4. Validate the property payload.
5. Validate commercial fields conditionally.
6. Verify that the caller can create a listing for the selected owner context.
7. Create or link the underlying property.
8. Create the listing in a non-public state.
9. Create an initial status-history record.
10. Emit a listing-created event after the transaction is safely committed.

A newly created listing must never become publicly visible merely because the create request succeeded.

### 6.2 Draft Behavior

Drafts may be incomplete, but the API must distinguish:

- Fields required to save a draft
- Fields required to request verification
- Fields required to request moderation
- Fields required for publication

Expose completion information so the interface can guide the user without duplicating backend validation logic.

### 6.3 Idempotency

Creation endpoints that can be retried must support an idempotency strategy where required by the API contract.

A retry must not create duplicate properties or listings.

---

## 7. Listing Editing Rules

### 7.1 Authorization

The caller may edit a listing only when:

- The caller owns the listing, or
- The caller has an approved agency-management relationship, or
- The caller has an explicit administrative permission

A broker must not edit another agency's listing merely by knowing its ID.

### 7.2 Field-Level Restrictions

Sensitive fields may require additional controls:

- Ownership context
- Verification evidence
- Commercial price fields
- Location coordinates
- Identity-linked documents
- Publication status
- Risk flags
- Administrative decisions

Do not permit clients to directly update server-controlled fields such as:

- `verification_status`
- `moderation_status`
- `published_at`
- `suspension_reason`
- `created_by`
- `updated_by`
- Audit fields
- Internal risk scores

### 7.3 Published Listing Edits

Define whether an edit to a published listing:

- Is immediately visible,
- Requires re-verification,
- Requires re-moderation, or
- Temporarily unpublishes the listing.

At minimum, material changes must trigger re-evaluation. Material fields should include ownership, address, price, property type, area, media, and other fields identified by the moderation policy.

The exact material-change matrix must be centralized and tested.

---

## 8. Verification Workflow

### 8.1 Verification Purpose

Verification confirms that the listing satisfies the platform's approved trust and evidence requirements. Verification is not a guarantee of legal title unless the platform explicitly provides such a guarantee.

User-facing labels must accurately describe what was verified.

### 8.2 Verification States

Use controlled states such as:

- `NOT_STARTED`
- `REQUIRED`
- `SUBMITTED`
- `IN_REVIEW`
- `VERIFIED`
- `FAILED`
- `EXPIRED`

The final enum must be aligned with the shared contract.

### 8.3 Verification Inputs

Depending on the listing type and approved policy, verification may use:

- Ownership or authorization documents
- Property details
- Contact information
- Location evidence
- Broker or agency verification state
- Internal checks
- Administrative review

Do not collect documents that are not required for an approved workflow.

### 8.4 Verification Rules

- A listing cannot enter publication-ready status when mandatory verification is incomplete.
- Verification evidence must be access-controlled.
- Verification decisions must record actor, timestamp, decision, and reason.
- Failed verification must produce actionable remediation information.
- Verification changes must be auditable.
- Verification expiry must be supported where evidence becomes stale.

### 8.5 Reverification

Trigger re-verification when:

- Material property details change.
- Ownership context changes.
- Verification evidence expires.
- A risk or fraud review requires it.
- An administrator explicitly requests it.

---

## 9. Moderation Workflow

### 9.1 Moderation Purpose

Moderation determines whether a listing is suitable for publication under platform policy.

Moderation must be separate from ordinary owner editing.

### 9.2 Moderation States

Use controlled states such as:

- `NOT_REQUIRED`
- `PENDING`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `CHANGES_REQUESTED`
- `SUSPENDED`

### 9.3 Moderation Checks

The publication-readiness service must evaluate:

- Required fields
- Valid property type and listing intent
- Valid commercial values
- Required media
- Valid location data
- Verification prerequisites
- Ownership authorization
- Duplicate-risk status
- Fraud-risk flags
- Prohibited or restricted content
- Expiry constraints
- Any active administrative restrictions

### 9.4 Administrative Review

Administrative reviewers must be able to:

- View the complete review context.
- See prior status transitions.
- See verification evidence subject to permission.
- Approve, reject, request changes, or suspend.
- Record a reason.
- Add an internal note.
- Escalate a risk flag.
- Trigger re-verification where necessary.

Administrative actions must be protected by role-based permissions and recorded in audit logs.

---

## 10. Publication Eligibility

### 10.1 Centralized Eligibility Check

Create one backend service responsible for evaluating whether a listing can be published.

Do not duplicate publication rules across:

- Mobile apps
- Public website
- Broker interfaces
- Admin interfaces
- Background jobs

The eligibility result should include:

- `eligible`
- Failed check codes
- Human-readable safe messages
- Internal diagnostic metadata where appropriate
- Required next actions

### 10.2 Minimum Publication Conditions

Before publication, verify at least:

1. Listing exists and is not deleted.
2. Caller or system has publication authority.
3. Ownership context is valid.
4. Required property fields are complete.
5. Required commercial fields are valid.
6. Mandatory media requirements are satisfied.
7. Verification requirements are satisfied.
8. Moderation is approved.
9. No blocking risk flag is active.
10. Listing is not expired or withdrawn.
11. Required subscription or platform entitlement checks pass, where applicable.
12. No conflicting active listing rule is violated.

### 10.3 Atomic Publication

Publication must be transactional.

The system must prevent a listing from being marked `PUBLISHED` while one or more mandatory conditions remain unmet.

If publication triggers search indexing or notifications, those side effects must occur asynchronously after the database transaction commits.

---

## 11. Media Management

### 11.1 Media Metadata

Store media metadata separately from the listing record.

Recommended fields:

- `id`
- `listing_id`
- `media_type`
- `storage_key` or approved provider reference
- `mime_type`
- `file_size`
- `width`
- `height`
- `sort_order`
- `is_primary`
- `status`
- `uploaded_by`
- `created_at`
- `deleted_at`

Do not store binary media directly in PostgreSQL unless explicitly approved.

### 11.2 Upload and Processing

The backend must validate:

- File type
- File size
- Maximum media count
- Ownership of the upload session
- Upload completion
- Malware or safety-processing status where available

Use signed upload/download mechanisms when the storage architecture supports them.

### 11.3 Media Changes

Adding, removing, or reordering media must:

- Verify listing authorization.
- Preserve ordering deterministically.
- Enforce one primary media item where required.
- Trigger publication re-evaluation if media is mandatory.
- Record relevant audit events.

---

## 12. Location and Geospatial Data

### 12.1 Address Validation

Normalize address components consistently:

- Country
- State
- City
- Locality
- Postal code
- Address lines

Do not trust client-provided geospatial coordinates without validation or an approved verification process.

### 12.2 Geospatial Storage

Where PostGIS is enabled:

- Store coordinates in the approved spatial type.
- Use a documented coordinate reference system.
- Add appropriate spatial indexes.
- Validate latitude and longitude ranges.
- Avoid exposing overly precise private addresses where the privacy policy requires masking.

### 12.3 Public Location Privacy

The public response must apply the approved privacy policy for:

- Exact address display
- Map marker precision
- Contact information
- Sensitive property documents
- Private owner data

Do not expose internal verification data or private documents through public listing endpoints.

---

## 13. Duplicate and Fraud-Risk Controls

### 13.1 Duplicate Detection

Implement a non-blocking duplicate-detection workflow using approved signals such as:

- Normalized address
- Geospatial proximity
- Property type
- Area
- Price
- Media fingerprints where supported
- Ownership context
- Existing active listings

Duplicate detection should produce candidates or risk flags rather than automatically deleting records.

### 13.2 Risk Flags

Risk flags must include:

- Type/code
- Severity
- Status
- Source
- Related listing or property
- Created timestamp
- Resolved timestamp
- Resolver
- Resolution reason

### 13.3 Blocking Rules

Only explicitly approved risk conditions may block publication.

The backend must distinguish:

- Informational flags
- Review-required flags
- Publication-blocking flags

Risk evaluation must be explainable to authorized administrators.

---

## 14. Expiry, Withdrawal, Suspension, and Archival

### 14.1 Expiry

Listings with an expiry date must be processed by a scheduled job.

The job must:

- Find eligible expired listings in batches.
- Lock or safely claim records.
- Re-check current status.
- Transition only listings that are still eligible for expiry.
- Record status history.
- Emit an expiry event.
- Trigger downstream search/index removal.

The job must be idempotent and safe to retry.

### 14.2 Withdrawal

Authorized owners may withdraw listings according to policy.

Withdrawal must:

- Remove the listing from public visibility.
- Preserve historical records.
- Record actor and reason where required.
- Emit a withdrawal event.

### 14.3 Suspension

Suspension may be initiated by authorized administrators or automated policy enforcement.

Suspension must:

- Immediately prevent public visibility.
- Preserve the listing and its evidence.
- Record a reason and actor/source.
- Trigger downstream removal events.
- Prevent ordinary owners from bypassing the suspension.

### 14.4 Archival and Restoration

Archival is a lifecycle operation, not a hard delete.

Restoration must re-run the required eligibility, verification, moderation, and risk checks. A previously published listing must not automatically return to public visibility without passing current requirements.

---

## 15. API Contract Requirements

The exact route names must be finalized in the shared API contract documentation. The following capabilities are required:

### 15.1 Owner/Broker/Agency APIs

- Create a draft listing
- Get listing details
- Update listing details
- Save draft progress
- Manage listing media
- Submit listing for verification
- Get verification status
- Submit listing for moderation
- Get publication-readiness result
- Request publication
- Withdraw listing
- View listing status history
- View own listing risk notices where permitted

### 15.2 Public APIs

- Get published listing by public ID
- List published listings
- Filter by supported property attributes
- Filter by listing intent
- Filter by price and area ranges
- Filter by location
- Retrieve public media
- Retrieve approved trust indicators

Public endpoints must return only fields approved for public exposure.

### 15.3 Administrative APIs

- List moderation queue
- View moderation context
- Approve listing
- Reject listing
- Request changes
- Suspend listing
- Reinstate listing
- View verification evidence subject to permission
- View and resolve risk flags
- View status history
- Trigger re-verification
- Run or request duplicate review

All administrative endpoints require explicit permission checks.

---

## 16. Events and Background Jobs

### 16.1 Domain Events

Define versioned events for at least:

- `listing.created`
- `listing.updated`
- `listing.submitted_for_verification`
- `listing.verification_completed`
- `listing.submitted_for_moderation`
- `listing.moderation_approved`
- `listing.moderation_rejected`
- `listing.published`
- `listing.withdrawn`
- `listing.suspended`
- `listing.reinstated`
- `listing.expired`
- `listing.archived`
- `listing.media_changed`
- `listing.risk_flagged`
- `listing.risk_resolved`

Events must contain stable IDs, correlation IDs, actor context where appropriate, schema version, and occurred-at timestamps.

### 16.2 Background Jobs

Implement or register jobs for:

- Expiry processing
- Publication re-evaluation
- Duplicate detection
- Risk evaluation
- Media processing completion
- Search-index synchronization
- Stale verification detection
- Reconciliation of listing status and downstream indexes

Jobs must support retries, backoff, dead-letter handling, observability, and idempotency.

---

## 17. Security and Privacy Requirements

- Enforce tenant/agency/owner isolation at the service layer.
- Never authorize using only client-supplied owner IDs.
- Protect verification documents and private media.
- Prevent insecure direct object references.
- Validate all incoming data with shared schemas.
- Apply rate limits to listing creation, media operations, and public search endpoints.
- Avoid leaking whether sensitive records exist to unauthorized users.
- Redact sensitive fields from logs.
- Record administrative actions in immutable or append-only audit storage where required.
- Apply retention and deletion policies consistently.
- Prevent mass assignment by using explicit command DTOs or allowlists.
- Use transactions for state transitions and related audit records.

---

## 18. Observability and Auditability

Capture structured logs and metrics for:

- Listing creation failures
- Publication failures by check code
- Verification turnaround time
- Moderation queue size
- Moderation decisions
- Suspensions and reinstatements
- Expiry-job outcomes
- Duplicate-risk volume
- Media processing failures
- Search-index synchronization failures
- Unauthorized access attempts

Every important lifecycle transition must be traceable through:

- Listing public ID
- Property public ID
- Actor ID, where available
- Correlation ID
- Previous status
- New status
- Reason
- Timestamp

---

## 19. Testing Requirements

### 19.1 Unit Tests

Cover:

- Conditional property validation
- Listing intent validation
- Ownership authorization
- Lifecycle transition rules
- Publication eligibility checks
- Material-change detection
- Duplicate-signal normalization
- Expiry eligibility
- Risk-flag severity rules
- Public-field projection

### 19.2 Integration Tests

Cover:

- Listing creation with property creation
- Listing creation with an existing property
- Concurrent edits
- Publication transaction atomicity
- Verification and moderation transitions
- Suspension and reinstatement
- Media authorization
- Agency/broker ownership boundaries
- Status-history persistence
- Event outbox behavior
- Expiry job idempotency

### 19.3 End-to-End Tests

Cover at least:

1. Authorized broker creates a draft.
2. Broker completes required details.
3. Broker uploads approved media.
4. Listing enters verification and moderation workflows.
5. Authorized reviewer approves the listing.
6. Listing becomes publicly visible only after all checks pass.
7. Public user can retrieve only approved public fields.
8. Administrator suspends the listing.
9. Listing disappears from public results.
10. Authorized actor cannot bypass suspension.
11. Reinstatement requires current eligibility checks.

### 19.4 Security Tests

Test:

- IDOR attempts
- Cross-agency access
- Unauthorized publication
- Unauthorized moderation
- Mass-assignment attempts
- Private-document exposure
- Rate-limit behavior
- Replay of idempotent requests
- Concurrent lifecycle transitions

---

## 20. Implementation Deliverables

The implementation team must deliver:

- Listing and property database migrations
- Domain entities and repositories
- Listing command/query services
- Ownership and authorization policies
- Lifecycle state machine
- Verification workflow integration points
- Moderation workflow integration points
- Central publication-eligibility service
- Media metadata and authorization APIs
- Geospatial data support
- Duplicate and risk-flag foundations
- Expiry, suspension, withdrawal, and archival workflows
- Versioned API schemas
- Domain events and outbox records
- Background jobs and retry policies
- Audit-log integration
- Unit, integration, security, and end-to-end tests
- Updated API and architecture documentation

---

## 21. Definition of Done

This step is complete only when:

- Property and listing ownership rules are enforced server-side.
- Listing lifecycle transitions are explicit and validated.
- Drafts cannot accidentally become public.
- Publication is controlled by one centralized eligibility service.
- Verification and moderation integration points are implemented.
- Media and private evidence are access-controlled.
- Geospatial data is validated and indexed according to the architecture.
- Expiry, suspension, withdrawal, and archival operations are safe and auditable.
- Duplicate and risk signals are represented without unsafe automatic deletion.
- Events and background jobs are idempotent and observable.
- Public APIs expose only approved fields.
- Cross-owner and cross-agency access tests pass.
- No interface duplicates listing business rules.
- Documentation and API contracts are updated.

---

## 22. Acceptance Criteria

1. A valid authorized actor can create and save a listing draft.
2. An unauthorized actor cannot create or modify a listing for another owner or agency.
3. Conditional property fields are validated according to property type and listing intent.
4. A draft cannot be publicly retrieved as a published listing.
5. A listing cannot be published unless every mandatory eligibility check passes.
6. Material edits trigger the required re-verification or re-moderation behavior.
7. Verification and moderation decisions are auditable.
8. Private documents and internal risk data are never returned by public endpoints.
9. Expired listings are removed from public visibility through an idempotent process.
10. Suspended listings cannot be republished by ordinary owners.
11. Duplicate candidates and risk flags are stored with traceable reasons.
12. Listing lifecycle events are emitted only after successful transaction commit.
13. Retried jobs and retried commands do not create duplicate side effects.
14. Public listing responses are stable, documented, and privacy-compliant.
15. The implementation integrates with shared identity, authorization, database, events, observability, and validation packages.
16. Interface teams can consume the listing APIs without reimplementing listing lifecycle or publication logic.

---

## 23. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the existing repository before creating files.
2. Reuse the shared database, validation, events, observability, and authorization packages.
3. Read the API conventions and database architecture documents first.
4. Do not create a second database client, event bus, logger, or authorization system.
5. Implement migrations before relying on new tables.
6. Keep lifecycle transitions in a dedicated domain service or state-machine layer.
7. Keep publication eligibility centralized.
8. Use explicit command handlers and DTOs instead of generic unrestricted updates.
9. Add tests with each workflow rather than postponing testing.
10. Update documentation and API contracts alongside implementation.
11. If an ambiguity is found, document it as a decision or blocker; do not silently invent a policy.
12. Preserve compatibility with the other shared-core modules.
13. Do not implement user-app, broker-app, super-admin UI, or public-website presentation code in this step.
14. Do not mark the step complete until the Definition of Done and Acceptance Criteria have been verified.
