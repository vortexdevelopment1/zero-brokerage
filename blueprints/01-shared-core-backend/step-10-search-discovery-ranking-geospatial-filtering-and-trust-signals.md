# Step 10 — Search, Discovery, Ranking, Geospatial Filtering, and Trust Signals

## 1. Document Purpose

This document defines the implementation contract for the shared backend capabilities related to:

- Public listing discovery
- Search and filtering
- Geospatial search
- Listing ranking
- Quality and trust signals
- Verified-only discovery
- Sponsored listing presentation boundaries
- Search indexing and synchronization
- Search query validation and rate limiting
- Result privacy and publication enforcement
- Search observability and operational recovery

This document is intended for the shared backend implementation team and for interface developers consuming stable discovery APIs.

The implementation must follow the approved BRD/SOW scope and finalized Zero Brokerage decisions. Do not introduce unsupported advertising products, opaque ranking systems, or unapproved recommendation features.

---

## 2. Objectives

Implement a predictable and trustworthy discovery foundation that allows the platform to:

1. Return only listings that are eligible for public discovery.
2. Support approved property, price, location, and listing-intent filters.
3. Support geospatial discovery using the approved PostgreSQL/PostGIS architecture.
4. Apply a documented quality-first ranking policy.
5. Surface verification and trust indicators accurately.
6. Keep sponsored placements clearly separated from organic results.
7. Synchronize listing lifecycle changes with search indexes.
8. Prevent suspended, withdrawn, expired, or unpublished listings from appearing.
9. Protect search endpoints from abuse and expensive unbounded queries.
10. Provide explainable internal ranking metadata without exposing sensitive internal signals.
11. Support stable pagination and deterministic ordering.
12. Recover from indexing failures through retries and reconciliation.

---

## 3. Scope Boundaries

### 3.1 Included

- Public listing discovery API
- Search filters
- Property and listing attribute filtering
- Price and area ranges
- Listing-intent filters
- Geospatial filtering
- Verified-only filtering
- Quality-first ranking
- Trust-signal projection
- Sponsored-result separation
- Search-index document contracts
- Index synchronization events
- Search query validation
- Pagination and sorting
- Search rate limiting
- Index rebuild and reconciliation foundations
- Search metrics and operational diagnostics

### 3.2 Excluded

Do not implement the following in this step unless separately approved:

- Full external search-engine infrastructure
- AI-based recommendations
- Personalized behavioral recommendations
- Auction-based advertising
- Unapproved paid ranking boosts
- Complex natural-language search
- User reviews and rating collection
- Listing creation, verification, or moderation workflows
- Lead routing or visit scheduling
- Advanced analytics dashboards

This module consumes listing, review, subscription, and administrative contracts. It must not duplicate their business rules.

---

## 4. Discovery Principles

### 4.1 Public Eligibility Is Mandatory

Search must never decide publication eligibility independently.

Every indexed or returned listing must satisfy the centralized public-discovery policy, including:

- Published lifecycle status
- Valid verification and moderation state
- No active publication-blocking risk
- No expiry or withdrawal condition
- Valid public data projection
- Applicable subscription or entitlement requirements

If a listing becomes ineligible, it must be removed or suppressed from public discovery promptly.

### 4.2 Database as Source of Truth

The transactional database remains authoritative for listing state and ownership.

A search index is a read-optimized projection. It must not become the source of truth for:

- Ownership
- Publication status
- Verification status
- Pricing authority
- Permissions
- Administrative decisions

### 4.3 Deterministic Results

Search results must use deterministic ordering.

When ranking values are equal, use stable tie-breakers such as:

1. Approved secondary quality value
2. Publication timestamp or approved freshness field
3. Stable listing public ID

Do not use random ordering for production discovery.

---

## 5. Searchable Listing Projection

### 5.1 Projection Responsibility

Create a dedicated search projection mapper that converts approved listing-domain data into a search document.

The mapper must:

- Include only public fields.
- Normalize searchable text and filter values.
- Include approved trust signals.
- Include geospatial coordinates at the approved precision.
- Exclude private documents, internal notes, personal contact details, and internal risk data.
- Be versioned.

### 5.2 Recommended Search Document Fields

The exact structure depends on the selected search implementation. The projection may include:

- `listing_public_id`
- `property_public_id`
- `listing_intent`
- `property_type`
- `property_sub_type`
- `city`
- `locality`
- `postal_code`, where public exposure is approved
- `geo_point`
- `price_minor`
- `rent_amount_minor`
- `security_deposit_amount_minor`, only if public
- `area_value`
- `area_unit`
- `bedroom_count`
- `bathroom_count`
- `furnishing_status`
- `amenity_codes`
- `primary_media_reference`
- `public_title`
- `public_description`
- `verification_badges`
- `quality_score_inputs`
- `rating_summary`
- `verified_closure_count`
- `published_at`
- `last_material_update_at`
- `search_document_version`

Internal ranking inputs must not be exposed directly in public API responses unless specifically approved.

### 5.3 Projection Versioning

Every document must carry a schema or projection version.

When the projection changes:

- Support a controlled migration or rebuild.
- Avoid mixing incompatible document versions without a clear compatibility strategy.
- Track rebuild progress.
- Provide a rollback or recovery approach where practical.

---

## 6. Search Filters

### 6.1 Required Filter Categories

Support only approved filters, such as:

- Listing intent: sale or rent
- Property type
- Property subtype
- City
- Locality
- Postal code, where approved
- Minimum and maximum price
- Minimum and maximum area
- Bedroom count
- Bathroom count
- Furnishing status
- Amenities
- Verified-only
- Radius or map-bounds location filtering

The final filter list must be synchronized with the API contract and interface requirements.

### 6.2 Filter Validation

Validate:

- Allowed enum values
- Numeric ranges
- Maximum range widths where necessary
- Coordinate validity
- Radius limits
- Bounding-box size
- Maximum number of amenities
- Repeated or contradictory filters
- Unsupported combinations

Do not accept arbitrary field names for filtering. Use an allowlist.

### 6.3 Price and Area

- Use integer minor units for monetary filters.
- Normalize area units before comparison.
- Define whether range boundaries are inclusive.
- Reject negative values.
- Prevent excessively broad or expensive queries where necessary.
- Ensure currency assumptions are explicit.

### 6.4 Location Search

Location search may support:

- City/locality filtering
- Radius search
- Bounding-box search
- Approved text normalization
- PostGIS distance calculations

The implementation must document coordinate reference systems, units, and index usage.

---

## 7. Geospatial Discovery

### 7.1 PostGIS Requirements

Where PostGIS is used:

- Store approved coordinates in the canonical spatial type.
- Use a documented coordinate reference system.
- Add spatial indexes.
- Validate latitude and longitude ranges.
- Use database-supported spatial operators.
- Test query plans for common radius and bounding-box queries.

### 7.2 Privacy and Precision

Public map results must follow the approved privacy policy.

The backend may need to:

- Round or generalize coordinates.
- Display approximate rather than exact locations.
- Hide sensitive address components.
- Return different precision levels to authorized versus public consumers.

Do not expose exact private locations merely because they exist in the database.

### 7.3 Geospatial Failure Handling

If geospatial data is missing or invalid:

- Exclude the listing from geo-constrained results when required.
- Do not fabricate coordinates.
- Record data-quality diagnostics.
- Provide a safe fallback only if the product contract defines one.

---

## 8. Quality-First Ranking Policy

### 8.1 Approved Ranking Inputs

The finalized ranking policy uses the following quality-oriented components:

- **Verification quality:** 40%
- **Rating quality:** 30%
- **Verified closures:** 30%

The implementation must confirm the exact normalization and aggregation formulas before production rollout. The weights must not be scattered across controllers or interface applications.

### 8.2 Ranking Service

Create a dedicated ranking service or strategy abstraction that:

- Accepts normalized ranking inputs.
- Applies the approved formula.
- Handles missing or insufficient data safely.
- Produces deterministic scores.
- Exposes an internal explanation structure for authorized diagnostics.
- Supports versioning of ranking formulas.

### 8.3 Missing Data

Define explicit behavior for missing inputs:

- New listings with no rating history
- Listings with no verified closures
- Listings with incomplete verification metadata
- Listings with insufficient review volume

Do not automatically treat missing data as either perfect or zero quality without an approved rule.

### 8.4 Rating Safeguards

Rating quality must account for the approved safeguards from the reviews domain, including:

- Minimum review thresholds where applicable
- Weighted or confidence-adjusted averages
- Protection against one-review distortion
- Exclusion of invalid or removed reviews

The search module must consume the authoritative rating summary rather than recomputing ratings independently.

### 8.5 Verified Closures

Use only the approved definition of a verified closure.

Do not infer a closure from:

- A visit alone
- A lead status alone
- A payment attempt alone
- A client-provided claim

The source module must emit an authoritative verified-closure signal.

---

## 9. Trust Signals and Verified-Only Discovery

### 9.1 Public Trust Indicators

The public listing response may include approved trust indicators such as:

- Verification badge
- Verified ownership or authorization label, if approved
- Verified-closure count or label, if approved
- Rating summary
- Review count
- Moderation or quality label, only where explicitly approved

Every displayed trust signal must have a clear definition and source.

### 9.2 Verified-Only Filter

The verified-only filter must use the authoritative verification status and approved trust policy.

It must not rely on:

- A text label supplied by the client
- A manually altered search document field
- A broker-selected badge
- An unverified document upload

### 9.3 Trust-Signal Freshness

When a trust signal changes:

- Emit an appropriate domain event.
- Update the search projection.
- Track synchronization failures.
- Avoid displaying stale trust information indefinitely.

---

## 10. Sponsored Results and Boost Governance

### 10.1 Sponsored Separation

Sponsored listings, if enabled by an approved subscription or monetization policy, must appear in a clearly separated and explicitly labeled section.

Sponsored status must not silently alter the organic quality-first ranking formula.

Public responses must make the distinction understandable to users.

### 10.2 Eligibility

A listing may be sponsored only when:

- The sponsoring account has the required entitlement.
- The listing is otherwise eligible for public visibility.
- The sponsorship period is active.
- No blocking moderation, verification, or risk condition exists.
- The sponsor relationship is auditable.

Payment or subscription status must be evaluated by the entitlement system rather than inferred from client input.

### 10.3 Boost Restrictions

Any boost or promotion mechanism must have:

- Explicit policy and scope
- Time limits
- Administrative governance
- Audit records
- Spend or quota controls where applicable
- Clear public labeling
- Automatic removal when eligibility ends

Do not implement auction logic or hidden organic-ranking manipulation in this step.

---

## 11. Search API Contract

The exact route names must be finalized in the shared API contract documentation.

### 11.1 Public Search API

Required capabilities may include:

- Search published listings
- Apply supported filters
- Apply geospatial constraints
- Request verified-only results
- Sort using approved options
- Retrieve paginated results
- Retrieve listing summary cards
- Retrieve public trust indicators
- Retrieve clearly separated sponsored results, where enabled

### 11.2 Listing Detail API

The public listing-detail response must:

- Re-check public visibility where necessary.
- Return only approved public fields.
- Avoid exposing private ownership and contact details.
- Avoid returning internal moderation notes or risk flags.
- Handle a listing becoming unavailable between search and detail retrieval.

### 11.3 Administrative Diagnostics API

Authorized administrators may need capabilities to:

- Inspect search-document status
- View indexing failures
- Trigger a document rebuild
- Inspect ranking-version metadata
- View synchronization lag
- Inspect suppressed listings
- Reconcile database and search projection state

These endpoints must be permission-protected and audited.

---

## 12. Index Synchronization

### 12.1 Event-Driven Updates

Search synchronization should consume relevant events, including:

- `listing.published`
- `listing.updated`
- `listing.withdrawn`
- `listing.suspended`
- `listing.reinstated`
- `listing.expired`
- `listing.archived`
- `listing.media_changed`
- `listing.verification_completed`
- `listing.moderation_approved`
- `listing.risk_flagged`
- `listing.risk_resolved`
- `review.summary_changed`
- `verified_closure.recorded`
- `subscription.entitlement_changed`

Only approved events should affect the public projection.

### 12.2 Upsert and Delete Semantics

The indexer must support:

- Idempotent upserts
- Idempotent deletes
- Version-aware updates
- Out-of-order event protection
- Retry with backoff
- Dead-letter or manual-review handling

A stale event must not overwrite a newer projection.

### 12.3 Suppression Strategy

When a listing becomes ineligible:

1. Record the source event.
2. Re-evaluate current public eligibility.
3. Remove or suppress the document.
4. Record synchronization outcome.
5. Emit operational metrics.
6. Reconcile later if the index operation fails.

The transactional database remains authoritative during temporary index inconsistency.

### 12.4 Rebuild and Reconciliation

Implement foundations for:

- Full index rebuild
- Incremental repair
- Missing-document detection
- Stale-document detection
- Ineligible-document detection
- Projection-version migration
- Reconciliation reports

Rebuilds must be bounded, observable, resumable, and safe to retry.

---

## 13. Pagination and Sorting

### 13.1 Pagination

Use a documented pagination strategy.

Cursor-based pagination is preferred for large or frequently changing result sets when supported by the chosen search implementation.

The cursor must:

- Be opaque to clients.
- Be validated and expiry-controlled where appropriate.
- Preserve the relevant sort context.
- Avoid exposing internal query details.

### 13.2 Stable Ordering

All supported sort modes must define deterministic tie-breakers.

Supported sorting may include:

- Quality-first relevance
- Price ascending
- Price descending
- Newest
- Distance, when a reference location exists

Do not expose arbitrary database column sorting.

### 13.3 Result Limits

Enforce:

- Default page size
- Maximum page size
- Maximum query complexity
- Maximum geospatial radius or bounds
- Request timeout or cancellation behavior

---

## 14. Caching and Performance

### 14.1 Cache Candidates

Caching may be used for:

- Popular public search queries
- Static filter metadata
- Location metadata
- Plan-independent public configuration

Do not cache sensitive or authorization-dependent data without a clear invalidation policy.

### 14.2 Invalidation

Listing lifecycle events must invalidate or bypass stale public caches where necessary.

A cache must not keep a suspended or withdrawn listing publicly visible beyond the approved consistency window.

### 14.3 Query Performance

Measure and optimize:

- Common filter combinations
- Radius searches
- Sorting by quality
- Pagination latency
- Search-index synchronization lag
- Database fallback queries, if any

Avoid unbounded wildcard searches and expensive unindexed scans.

---

## 15. Rate Limiting and Abuse Prevention

Apply appropriate controls to:

- Public search requests
- Listing-detail requests
- Expensive geospatial queries
- Administrative rebuild endpoints
- Bulk diagnostic operations

Controls should include:

- Per-IP or per-principal limits
- Request-size limits
- Query complexity limits
- Timeout handling
- Abuse metrics
- Safe error responses

Do not reveal internal rate-limit implementation details unnecessarily.

---

## 16. Security and Privacy Requirements

- Return only publicly approved listing fields.
- Enforce publication eligibility at the service boundary.
- Prevent exposure of private addresses and contact information.
- Prevent arbitrary filter-field injection.
- Validate all sort fields against an allowlist.
- Protect administrative search diagnostics.
- Do not expose internal ranking explanations to ordinary users.
- Redact sensitive data from logs.
- Avoid leaking existence of restricted listings.
- Apply consistent authorization and privacy policies across search and detail endpoints.
- Ensure sponsored labels cannot be removed or falsified by clients.

---

## 17. Observability and Auditability

Capture structured logs and metrics for:

- Search request volume
- Search latency by query category
- Search errors and timeouts
- Filter validation failures
- Geospatial query performance
- Empty-result rates
- Ranking calculation failures
- Indexing lag
- Index upsert/delete failures
- Reconciliation mismatches
- Sponsored-placement eligibility failures
- Rate-limit events
- Administrative rebuilds

Track operational identifiers such as:

- Request ID
- Correlation ID
- Search query category
- Projection version
- Ranking version
- Listing public ID where relevant
- Index operation ID
- Failure code
- Timestamp

Do not log sensitive user search data beyond the approved privacy and retention policy.

---

## 18. Testing Requirements

### 18.1 Unit Tests

Cover:

- Filter validation
- Price and area normalization
- Coordinate validation
- Publication-eligibility projection
- Ranking formula and weight application
- Missing ranking-input behavior
- Deterministic tie-breaking
- Sponsored-result eligibility
- Cursor validation
- Public-field projection

### 18.2 Integration Tests

Cover:

- Published listing indexing
- Listing suspension and removal
- Listing reinstatement and reindexing
- Verification-status updates
- Rating-summary updates
- Verified-closure updates
- Out-of-order index events
- Duplicate index events
- Full rebuild and reconciliation
- Geospatial filtering with PostGIS
- Rate-limit behavior
- Administrative diagnostic authorization

### 18.3 End-to-End Tests

At minimum:

1. An eligible published listing appears in public discovery.
2. An unpublished listing does not appear.
3. A suspended or expired listing is removed from discovery.
4. Supported filters return only matching listings.
5. Radius filtering returns listings within the approved distance.
6. Verified-only search excludes unverified listings.
7. Organic ranking uses the approved quality-first formula.
8. Sponsored listings appear only in a clearly labeled separate section.
9. A listing update eventually updates its search projection.
10. A failed index operation is retried and reconciled.
11. Public responses do not expose private ownership or moderation data.

### 18.4 Security Tests

Test:

- Arbitrary filter injection
- Arbitrary sort injection
- Restricted listing enumeration
- Private address exposure
- Administrative endpoint access
- Rate-limit bypass
- Malicious cursor manipulation
- Sponsored-label tampering
- Search-query denial-of-service patterns

---

## 19. Implementation Deliverables

The implementation team must deliver:

- Search filter schemas
- Public discovery query service
- Geospatial query support
- Search projection mapper
- Ranking strategy/service
- Trust-signal projection contract
- Sponsored-result separation logic, if enabled
- Index synchronization consumers
- Idempotent upsert/delete handlers
- Rebuild and reconciliation foundations
- Pagination and sorting implementation
- Rate-limit and query-complexity controls
- Administrative diagnostics endpoints
- Metrics and structured logging
- Unit, integration, security, and end-to-end tests
- Updated API and architecture documentation

---

## 20. Definition of Done

This step is complete only when:

- Public discovery returns only eligible published listings.
- Supported filters and geospatial constraints are validated and tested.
- The quality-first ranking policy is centralized and versioned.
- Verification, rating, and verified-closure signals come from authoritative sources.
- Sponsored listings are clearly separated and labeled.
- Search projections are versioned and synchronized through reliable events.
- Out-of-order, duplicate, and failed index operations are handled safely.
- Pagination and sorting are deterministic.
- Query limits and rate limits protect the platform.
- Private and internal listing data is not exposed publicly.
- Rebuild and reconciliation workflows are observable and retry-safe.
- Interface teams can consume discovery APIs without duplicating ranking or publication logic.

---

## 21. Acceptance Criteria

1. A published and eligible listing can be discovered through the public search API.
2. Unpublished, suspended, withdrawn, expired, or blocked listings are not returned.
3. Supported property, price, area, intent, amenity, and location filters work correctly.
4. Invalid or unsupported filter and sort parameters are rejected consistently.
5. Geospatial searches use validated coordinates and documented distance units.
6. Ranking applies the approved 40% verification, 30% rating, and 30% verified-closure quality components.
7. Missing ranking data follows an explicit documented policy.
8. Verified-only search uses authoritative verification data.
9. Sponsored listings, where enabled, are displayed separately and clearly labeled.
10. Listing lifecycle events update or remove search documents safely.
11. Duplicate and out-of-order indexing events do not corrupt the search projection.
12. Public listing responses exclude private contact, document, ownership, and moderation data.
13. Search cursors and result ordering are stable and validated.
14. Search and indexing failures are observable and recoverable.
15. Shared database, validation, events, observability, authorization, and listing contracts are reused.
16. No interface duplicates search eligibility, ranking, or index-synchronization business rules.

---

## 22. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the existing shared-core modules and API contracts before making changes.
2. Read the listing, review, subscription, event, database, and observability documents first.
3. Reuse the existing publication-eligibility service and public listing projection.
4. Do not create a second listing-status or verification system.
5. Keep ranking weights and formulas in one versioned backend strategy.
6. Do not expose internal ranking signals or risk metadata to public clients.
7. Implement database and index migrations before using new projection structures.
8. Make index consumers idempotent and resilient to duplicate or out-of-order events.
9. Add tests for suspension, expiry, publication changes, and indexing failures.
10. Validate all filters and sorting options through explicit allowlists.
11. Do not implement UI code in this step.
12. Do not implement AI recommendations or auction-based advertising without explicit approval.
13. Document unresolved search-provider or infrastructure decisions as blockers or decisions.
14. Update API contracts and operational documentation alongside implementation.
15. Do not mark the step complete until the Definition of Done and Acceptance Criteria have been verified.
