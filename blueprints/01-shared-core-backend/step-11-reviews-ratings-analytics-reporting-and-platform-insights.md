# Step 11 — Reviews, Ratings, Analytics, Reporting, and Platform Insights

## 1. Document Purpose

This document defines the implementation contract for the shared backend capabilities related to:

- Verified-visit-based reviews
- Listing ratings and category ratings
- Review moderation and reporting
- Listing-owner responses
- Rating aggregation and trust-signal publication
- Role-based analytics
- Broker and agency performance insights
- Platform, revenue, and subscription analytics
- Furniture, visit, lead, and transaction analytics
- Event tracking
- CSV exports
- Retention, privacy, and access controls
- Analytics data quality and reconciliation

This document is intended for the shared backend implementation team and for interface developers consuming stable review, rating, analytics, and reporting APIs.

The implementation must follow the approved BRD/SOW scope and finalized Zero Brokerage decisions. Do not introduce unsupported social-network features, unrestricted public reviews, or invasive user profiling.

---

## 2. Objectives

Implement a trustworthy review and analytics foundation that allows the platform to:

1. Collect reviews only from eligible verified-visit experiences.
2. Support overall ratings and approved category ratings.
3. Prevent invalid, duplicate, abusive, or unauthorized reviews.
4. Allow users to edit or delete their reviews according to policy.
5. Allow listing owners to respond without altering the original review.
6. Provide moderation and reporting workflows for Super Admin users.
7. Calculate reliable rating summaries with safeguards against distortion.
8. Expose role-appropriate analytics to brokers, agencies, and administrators.
9. Track approved product and business events consistently.
10. Generate CSV exports without leaking unauthorized data.
11. Apply retention, privacy, and access policies to analytics data.
12. Make analytics calculations reproducible, observable, and auditable.

---

## 3. Scope Boundaries

### 3.1 Included

- Review eligibility checks
- Review creation, editing, deletion, and publication
- Overall star ratings
- Category ratings
- Review moderation
- Review reports
- Listing-owner responses
- Rating-summary calculation
- Trust-signal integration
- Broker and agency analytics
- Platform and revenue analytics
- Subscription analytics
- Visit, lead, listing, furniture, and transaction analytics foundations
- Event tracking contracts
- CSV export jobs
- Analytics access control
- Data retention and privacy controls
- Data-quality checks

### 3.2 Excluded

Do not implement the following in this step unless separately approved:

- Public social feeds
- Unrestricted comments on arbitrary platform content
- AI-generated reviews
- Automated legal or reputational decisions
- Personalized behavioral advertising
- Advanced data science or machine-learning pipelines
- External BI-platform integration
- Financial accounting or tax reporting
- Payment processing
- Listing publication logic
- Visit or lead lifecycle logic

This module consumes authoritative events and domain contracts from other modules.

---

## 4. Review and Rating Principles

### 4.1 Verified-Visit Eligibility

A user may submit a review only when the platform confirms an eligible verified visit according to the approved policy.

A visit request, lead, message, or payment attempt alone must not qualify a user to review a listing.

The eligibility service must verify:

- The user identity
- The listing or property relationship
- The relevant visit record
- The visit's eligible completion state
- Whether the user has already reviewed the eligible experience
- Whether the review window remains open
- Whether the listing or property context is still valid

### 4.2 Review Subject

The system must explicitly define whether a review is attached to:

- A listing
- A property
- A broker
- An agency
- A visit experience

Do not silently create multiple review subjects from one review submission. The final subject model must align with the approved product scope and API contract.

### 4.3 Review Integrity

The platform must preserve the distinction between:

- User-authored review content
- Moderation decisions
- Owner responses
- Internal reports
- Aggregated rating summaries

An owner response must never overwrite or mutate the original review.

---

## 5. Recommended Data Model

The implementation team must use version-controlled migrations and the shared database package.

### 5.1 `reviews`

Recommended fields:

- `id`
- `public_id`
- `reviewer_user_id`
- `subject_type`
- `subject_id`
- `visit_id`
- `listing_id`, where applicable
- `overall_rating`
- `title`, if approved
- `body`
- `status`
- `published_at`, nullable
- `edited_at`, nullable
- `deleted_at`, nullable
- `created_at`
- `updated_at`
- `version`

Use a database constraint or equivalent transactional protection to prevent multiple reviews for the same user and eligible visit where the policy requires one review.

### 5.2 `review_category_ratings`

Recommended fields:

- `id`
- `review_id`
- `category_code`
- `rating_value`
- `created_at`
- `updated_at`

Category codes must be centrally defined. Do not permit arbitrary category names from clients.

### 5.3 `review_moderation_actions`

Recommended fields:

- `id`
- `review_id`
- `action_type`
- `decision`
- `reason_code`
- `reason_text_safe`
- `actor_id`
- `created_at`

### 5.4 `review_reports`

Recommended fields:

- `id`
- `public_id`
- `review_id`
- `reported_by`
- `reason_code`
- `description`
- `status`
- `resolved_by`, nullable
- `resolution_reason`, nullable
- `created_at`
- `resolved_at`, nullable

### 5.5 `review_responses`

Recommended fields:

- `id`
- `review_id`
- `author_id`
- `body`
- `status`
- `created_at`
- `updated_at`
- `deleted_at`, nullable

### 5.6 `rating_summaries`

Recommended fields:

- `id`
- `subject_type`
- `subject_id`
- `overall_average`
- `overall_count`
- `confidence_adjusted_score`
- `category_summary`
- `calculation_version`
- `last_calculated_at`
- `updated_at`

Rating summaries should be derived from eligible, published reviews only.

### 5.7 Analytics Tables

Use separate structures where operational needs justify them:

- `analytics_events`
- `analytics_event_failures`
- `analytics_daily_aggregates`
- `analytics_export_jobs`
- `analytics_export_rows` or externalized export storage references
- `analytics_retention_records`
- `analytics_reconciliation_records`

Avoid storing unlimited raw events inside transactional domain tables.

---

## 6. Review Lifecycle

### 6.1 Suggested Review States

The final enum must be aligned with the shared API contract. A suitable initial lifecycle is:

- `DRAFT`
- `PENDING_MODERATION`
- `PUBLISHED`
- `CHANGES_REQUESTED`
- `REJECTED`
- `HIDDEN`
- `DELETED`

Do not permit clients to set review status directly.

### 6.2 Review Creation

When creating a review:

1. Authenticate the user.
2. Resolve the eligible visit.
3. Verify that the visit satisfies the review policy.
4. Check the review window.
5. Check for an existing review for the same eligible experience.
6. Validate overall and category ratings.
7. Validate body length and content constraints.
8. Create the review in a non-public state.
9. Create moderation metadata where required.
10. Commit the transaction.
11. Emit a review-created event after commit.

A review must not become publicly visible merely because the create request succeeded.

### 6.3 Editing

A user may edit their own review only according to the approved policy.

Editing must:

- Re-authorize ownership.
- Validate the updated content.
- Preserve edit history where required.
- Re-run moderation when material content changes.
- Recalculate rating summaries only after the resulting review state is eligible.
- Record the editor and timestamp.

### 6.4 Deletion

Deletion must:

- Be limited to authorized actors.
- Preserve required audit information.
- Remove the review from public aggregation when policy requires it.
- Trigger rating-summary recalculation.
- Avoid deleting evidence needed for moderation or legal retention.

---

## 7. Moderation and Reporting

### 7.1 Moderation Checks

The moderation workflow should evaluate:

- Spam indicators
- Abusive or prohibited content
- Personal data exposure
- Threats or harassment
- Irrelevant content
- Suspected manipulation
- Duplicate submissions
- Conflicts of interest
- Unsupported claims requiring review

Automated screening may assist, but final policy-sensitive decisions must follow the approved moderation process.

### 7.2 Moderation Actions

Authorized reviewers may:

- Approve a review
- Reject a review
- Request changes
- Hide a published review
- Restore a review where permitted
- Record an internal reason
- Escalate a report
- Review related reports and history

Every moderation action must be auditable.

### 7.3 Reports

Users may report a review using approved reason codes.

The reporting workflow must:

- Prevent unauthorized access to private report data.
- Avoid revealing the reporter's identity unnecessarily.
- Prevent repeated abuse of the reporting mechanism.
- Support status tracking for authorized administrators.
- Preserve resolution history.

---

## 8. Owner Responses

### 8.1 Response Authorization

A listing owner or authorized agency representative may respond only when they have a valid relationship to the reviewed subject.

The backend must verify the relationship server-side.

### 8.2 Response Rules

Responses must:

- Be separate from the original review.
- Follow content validation and moderation rules.
- Be editable or deletable only by authorized actors.
- Preserve relevant history.
- Never change the reviewer's rating or review status.
- Be hidden or removed when policy requires it.

### 8.3 Public Projection

Public review responses must exclude:

- Internal moderation notes
- Private owner data
- Reporter information
- Internal risk flags
- Administrative metadata

---

## 9. Rating Aggregation and Trust Signals

### 9.1 Source of Truth

Rating summaries must be calculated from eligible published reviews only.

Do not allow clients, brokers, agencies, or administrators to directly edit aggregate rating values.

### 9.2 Aggregation Safeguards

The calculation must define:

- Eligible review statuses
- Rating scale
- Minimum review thresholds
- Handling of deleted or hidden reviews
- Category-rating aggregation
- Rounding rules
- Confidence-adjustment or weighted-average approach
- Calculation version

The implementation must protect against one-review distortion and invalid rating manipulation.

### 9.3 Recalculation Triggers

Recalculate or invalidate summaries when:

- A review is published
- A review is edited
- A review is deleted
- A review is hidden or restored
- A category rating changes
- A moderation decision changes eligibility

Recalculation may be asynchronous, but the consistency window must be documented.

### 9.4 Search Integration

The search module must consume authoritative rating summaries through a stable contract.

Do not recompute rating values independently in the search service or interface applications.

---

## 10. Analytics Event Tracking

### 10.1 Event Principles

Analytics events must be:

- Explicitly defined
- Versioned
- Minimal
- Privacy-aware
- Idempotency-aware where necessary
- Traceable to a source workflow
- Safe to process asynchronously

Do not collect arbitrary client-generated event names without validation.

### 10.2 Recommended Event Categories

Approved event categories may include:

- Authentication events
- Listing discovery events
- Listing detail views
- Search and filter usage
- Visit requests and outcomes
- Lead creation and status changes
- Subscription and payment outcomes
- Furniture discovery and order milestones
- Review and rating events
- Broker and agency workflow events
- Public website conversion events
- Administrative workflow events

The final event catalog must be maintained in a version-controlled document.

### 10.3 Recommended Event Fields

- `event_id`
- `event_name`
- `event_version`
- `occurred_at`
- `actor_type`
- `actor_id`, where allowed
- `anonymous_session_id`, where approved
- `source_application`
- `entity_type`
- `entity_public_id`
- `correlation_id`
- `properties`
- `privacy_classification`

Do not include raw passwords, payment secrets, private notes, identity documents, or unnecessary personal data.

### 10.4 Server Versus Client Events

Critical business events must be generated or confirmed server-side.

Client analytics may be used for presentation and interaction telemetry, but it must not be treated as proof of:

- Payment success
- Visit completion
- Lead conversion
- Listing publication
- Verified closure
- Subscription activation

---

## 11. Role-Based Analytics

### 11.1 Broker Analytics

Subject to approved permissions and subscription entitlements, broker analytics may include:

- Listing counts and statuses
- Listing views
- Inquiry and lead counts
- Visit requests and outcomes
- Lead conversion indicators
- Follow-up workload
- Review and rating summaries for authorized subjects
- Listing performance trends

The broker must see only data within their authorized ownership or assignment scope.

### 11.2 Agency Analytics

Agency analytics may include:

- Agency listing performance
- Broker assignment volumes
- Lead distribution
- Visit outcomes
- Conversion indicators
- Broker activity summaries
- Review and trust summaries
- Subscription-protected operational metrics

Agency analytics must respect agency membership, role, and assignment permissions.

### 11.3 Super Admin Analytics

Super Admin analytics may include:

- Platform activity
- Listing and publication metrics
- Visit and lead metrics
- Subscription metrics
- Revenue-related payment summaries
- Furniture marketplace metrics
- Transaction and agreement metrics where available
- Moderation and trust metrics
- Operational health indicators
- Audit and compliance reports

Financial analytics must consume authoritative payment records and must not reconstruct revenue from frontend events.

### 11.4 Access and Entitlements

Analytics access must be evaluated through:

- Role permissions
- Ownership scope
- Agency membership
- Subscription entitlements
- Data sensitivity classification

Do not hide unauthorized data only in the frontend.

---

## 12. Analytics Aggregation

### 12.1 Aggregation Strategy

Use a documented strategy for:

- Raw event ingestion
- Daily or hourly aggregation
- Late-arriving events
- Duplicate events
- Corrections
- Timezone boundaries
- Backfills
- Retention

The initial implementation may use PostgreSQL-based aggregation if it meets the performance requirements.

### 12.2 Metric Definitions

Every metric must have a documented definition, including:

- Name
- Description
- Source events or tables
- Filters
- Time window
- Timezone
- Inclusion and exclusion rules
- Aggregation formula
- Data freshness expectation
- Access restrictions

Avoid ambiguous labels such as “conversion rate” without defining numerator and denominator.

### 12.3 Real-Time Metrics

Where real-time analytics are approved:

- Identify the exact metrics requiring near-real-time updates.
- Use event-driven counters or materialized views where appropriate.
- Define acceptable delay.
- Provide fallback behavior when the event pipeline is delayed.
- Never present stale metrics as real-time.

---

## 13. CSV Exports

### 13.1 Export Workflow

Exports should be asynchronous for large datasets.

The workflow must:

1. Authenticate and authorize the request.
2. Validate the selected report and filters.
3. Create an export job.
4. Capture the requesting actor and data scope.
5. Generate the file in bounded batches.
6. Store it through the approved secure storage mechanism.
7. Apply an expiry time.
8. Notify the requester when ready.
9. Record success or failure.
10. Restrict access to the original authorized scope.

### 13.2 Export Safety

Exports must:

- Use allowlisted columns.
- Exclude sensitive fields by default.
- Enforce row and time-range limits.
- Avoid loading unbounded datasets into memory.
- Protect generated files with access-controlled links.
- Record export access where required.
- Delete or expire files according to retention policy.

### 13.3 Export Audit

Record:

- Report type
- Filters
- Requested by
- Data scope
- Start and completion time
- Row count
- File reference
- Expiry time
- Failure reason, where applicable

---

## 14. Privacy, Retention, and Data Governance

- Classify analytics events by sensitivity.
- Minimize personally identifiable information.
- Prefer aggregate metrics over raw personal activity where possible.
- Apply the platform's retention periods consistently.
- Raw analytics events should follow the approved 30–90 day retention target where applicable.
- Do not expose one user's behavior to another user.
- Restrict access to raw event data.
- Support deletion or anonymization workflows where legally and technically required.
- Ensure exports follow the same authorization and retention rules as APIs.
- Redact sensitive values from logs and diagnostics.

Any unresolved legal or regulatory retention question must be documented rather than silently decided.

---

## 15. Events and Background Jobs

### 15.1 Domain Events

Define versioned events for at least:

- `review.created`
- `review.updated`
- `review.published`
- `review.hidden`
- `review.deleted`
- `review.reported`
- `review.report_resolved`
- `review.response_created`
- `rating_summary.changed`
- `analytics_event.recorded`
- `analytics_aggregation.completed`
- `analytics_export.requested`
- `analytics_export.completed`
- `analytics_export.failed`

### 15.2 Background Jobs

Implement or register jobs for:

- Review moderation processing
- Rating-summary recalculation
- Analytics aggregation
- Late-event reconciliation
- Analytics retention cleanup
- CSV export generation
- Export-file expiry
- Analytics data-quality checks
- Metric backfill
- Failed event reprocessing

Every job must be bounded, observable, retry-safe, and idempotent.

---

## 16. API Contract Requirements

The exact route names must be finalized in the shared API contract documentation.

### 16.1 User APIs

Required capabilities may include:

- Check review eligibility
- Create a review
- Edit or delete own review
- View own review history
- Report a review
- View public reviews and rating summaries
- View owner responses

### 16.2 Broker and Agency APIs

Required capabilities may include:

- View authorized rating summaries
- View authorized review analytics
- View listing performance metrics
- View lead and visit metrics within scope
- View permitted operational reports
- Request approved CSV exports
- View export-job status

### 16.3 Administrative APIs

Required capabilities may include:

- Review moderation queues
- View and resolve reports
- Hide or restore reviews
- Inspect rating-calculation status
- View platform analytics
- View subscription and revenue summaries
- Configure approved metric/report availability
- Request and manage exports
- Inspect analytics data-quality failures
- Trigger controlled backfills or reconciliations

All administrative endpoints require explicit permissions and audit logging.

---

## 17. Validation and Error Handling

Use shared validation and error conventions.

Validation must cover:

- Review eligibility
- Rating range
- Category-code allowlists
- Review body length
- Review edit windows
- Report reason codes
- Owner-response authorization
- Analytics report identifiers
- Time-range limits
- Export column allowlists
- Export row limits
- Cursor and pagination parameters
- Metric access permissions

Use stable machine-readable errors such as:

- `REVIEW_NOT_ELIGIBLE`
- `REVIEW_ALREADY_EXISTS`
- `REVIEW_WINDOW_CLOSED`
- `REVIEW_CONTENT_INVALID`
- `REVIEW_NOT_ACCESSIBLE`
- `REPORT_REASON_INVALID`
- `OWNER_RESPONSE_NOT_AUTHORIZED`
- `ANALYTICS_REPORT_NOT_ALLOWED`
- `ANALYTICS_RANGE_TOO_LARGE`
- `EXPORT_COLUMNS_NOT_ALLOWED`
- `EXPORT_LIMIT_EXCEEDED`
- `ANALYTICS_DATA_NOT_READY`

Do not reveal private review reports, hidden content, or unauthorized analytics scope through error messages.

---

## 18. Security and Audit Requirements

- Enforce review and analytics permissions server-side.
- Prevent users from reviewing experiences they did not complete.
- Prevent duplicate reviews and rating manipulation.
- Prevent cross-broker and cross-agency analytics access.
- Protect raw analytics events and generated export files.
- Validate report and export identifiers through allowlists.
- Apply rate limits to review creation, reporting, and export requests.
- Prevent export-based data exfiltration through repeated small queries.
- Record administrative moderation, restoration, and export actions.
- Redact personal data from logs.
- Protect internal metric definitions and diagnostic data.

---

## 19. Observability and Data Quality

Capture metrics and structured logs for:

- Review eligibility failures
- Review moderation queue size
- Review publication latency
- Report volume and resolution time
- Rating-summary recalculation failures
- Analytics ingestion failures
- Duplicate event rates
- Aggregation lag
- Late-event volume
- Export duration and failure rate
- Export row counts
- Retention-cleanup outcomes
- Unauthorized access attempts
- Data-quality mismatches

Implement data-quality checks for:

- Orphaned reviews
- Reviews without eligible visits
- Duplicate review keys
- Rating-summary inconsistencies
- Aggregates not matching source records within the documented tolerance
- Missing event versions
- Invalid event names
- Exports exceeding authorized scope

---

## 20. Testing Requirements

### 20.1 Unit Tests

Cover:

- Review eligibility
- Rating validation
- Review lifecycle transitions
- Owner-response authorization
- Report validation
- Rating aggregation
- Confidence-adjustment rules
- Metric-definition calculations
- Export filter validation
- Retention eligibility

### 20.2 Integration Tests

Cover:

- Verified-visit review creation
- Ineligible review rejection
- Duplicate-review prevention
- Review moderation
- Review editing and deletion
- Owner response creation
- Rating-summary recalculation
- Analytics event ingestion
- Aggregation with duplicate and late events
- Role-based analytics access
- CSV export generation and expiry
- Audit-log creation

### 20.3 End-to-End Tests

At minimum:

1. A user with an eligible completed visit can submit a review.
2. A user without an eligible visit cannot submit a review.
3. A review remains private until the moderation workflow permits publication.
4. A published review contributes to the correct rating summary.
5. An owner can respond only to an authorized subject.
6. A user can edit or delete their own review according to policy.
7. A reported review becomes visible in the authorized moderation queue.
8. A broker sees only analytics within their permitted scope.
9. An agency user sees only authorized agency metrics.
10. An authorized administrator can request and retrieve a CSV export.
11. An unauthorized user cannot access the export or raw analytics data.
12. Duplicate and late analytics events do not inflate metrics.

### 20.4 Security Tests

Test:

- Fake review creation
- Cross-user review editing
- Cross-listing owner response
- Cross-agency analytics access
- Export scope bypass
- Hidden-review enumeration
- Report-data exposure
- Rate-limit bypass
- Sensitive analytics leakage
- Unauthorized administrative moderation

---

## 21. Implementation Deliverables

The implementation team must deliver:

- Review and rating migrations
- Review eligibility service
- Review lifecycle service
- Moderation and reporting workflows
- Owner-response functionality
- Rating aggregation service
- Trust-signal integration contract
- Analytics event catalog and ingestion contract
- Analytics aggregation foundations
- Role-based analytics services
- CSV export job and secure-file workflow
- Retention and data-quality jobs
- Versioned API schemas
- Domain events and outbox integration
- Audit-log integration
- Metrics and structured logging
- Unit, integration, security, and end-to-end tests
- Updated API, metric-definition, and architecture documentation

---

## 22. Definition of Done

This step is complete only when:

- Review eligibility is verified server-side through the approved visit policy.
- Duplicate and unauthorized reviews are prevented.
- Review moderation and reporting workflows are auditable.
- Owner responses are permission-controlled and separate from original reviews.
- Rating summaries use only eligible published reviews.
- Rating safeguards and calculation versions are documented.
- Analytics access is restricted by role, ownership, agency scope, and entitlements.
- Critical business events are not inferred from client analytics alone.
- CSV exports are asynchronous, bounded, secure, and auditable.
- Retention and privacy rules are enforced.
- Analytics jobs are idempotent and observable.
- Data-quality checks identify inconsistencies.
- Interface teams can consume review and analytics APIs without duplicating domain rules.

---

## 23. Acceptance Criteria

1. Only users with an eligible verified visit can submit a review.
2. Duplicate reviews for the same eligible experience are rejected safely.
3. Review content and ratings are validated using shared schemas.
4. New reviews do not become public before the required moderation state.
5. Users can edit or delete their own reviews only within the approved policy.
6. Authorized listing owners can respond without modifying the original review.
7. Reported reviews are routed to an authorized moderation workflow.
8. Rating summaries include only eligible published reviews.
9. Rating calculations use documented safeguards and a versioned formula.
10. Brokers and agencies can access only analytics within their authorized scope.
11. Super Admin analytics consume authoritative source records for financial and operational metrics.
12. Raw analytics events and generated exports are protected from unauthorized access.
13. CSV exports enforce allowlisted columns, bounded ranges, and expiry.
14. Duplicate and late analytics events do not inflate aggregate metrics.
15. Retention and data-quality jobs are retry-safe and observable.
16. Shared database, validation, events, observability, authorization, listing, visit, and subscription contracts are reused.
17. No interface duplicates review eligibility, rating aggregation, analytics authorization, or export security logic.

---

## 24. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the existing shared-core modules before making changes.
2. Read the visit, listing, identity, authorization, subscription, events, database, and observability documents first.
3. Reuse the shared validation, transaction, event, audit, and authorization infrastructure.
4. Do not create a second review-eligibility or rating-calculation system.
5. Keep metric definitions and aggregation formulas version-controlled.
6. Do not treat client analytics as proof of critical business outcomes.
7. Implement migrations before using new review or analytics tables.
8. Add tests for fake reviews, duplicate reviews, cross-scope analytics, and export authorization.
9. Make aggregation, retention, and export jobs bounded and idempotent.
10. Keep raw analytics data privacy-aware and minimize personal information.
11. Do not implement UI code in this step.
12. Do not introduce AI-generated moderation decisions or personalized advertising without explicit approval.
13. Document unresolved retention, legal, or metric-definition questions as decisions or blockers.
14. Update API contracts and metric documentation alongside implementation.
15. Do not mark the step complete until the Definition of Done and Acceptance Criteria have been verified.
