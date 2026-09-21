# Step 08 — Visits, Leads, Broker/Agency Ownership, and Workflow Orchestration

## 1. Document Purpose

This document defines the implementation contract for the shared backend capabilities related to:

- Property visit requests and scheduling
- Visit lifecycle and attendance tracking
- Lead creation and ownership
- Independent broker and agency lead models
- Broker assignment and reassignment
- Lead status and follow-up workflows
- Contact-access controls
- Notifications and reminders related to visits and leads
- Auditability, events, background jobs, and reconciliation

This document is intended for the shared backend implementation team and for interface developers consuming stable APIs.

The implementation must follow the approved BRD/SOW scope and finalized Zero Brokerage decisions. Do not introduce unsupported CRM, marketing automation, or sales-force features.

---

## 2. Objectives

Implement a reliable workflow system that allows the platform to:

1. Capture property-interest signals from users.
2. Create visit requests against eligible published listings.
3. Manage visit scheduling and lifecycle transitions.
4. Prevent conflicting or invalid visit states.
5. Create leads from approved user actions and platform events.
6. Preserve the finalized hybrid lead-ownership model.
7. Route agency-owned leads to authorized brokers.
8. Allow independent brokers to manage their own leads.
9. Track follow-up activity without exposing unauthorized personal data.
10. Trigger reminders and notifications through the shared event system.
11. Maintain a complete audit trail for assignments, status changes, and sensitive actions.
12. Provide reconciliation and operational recovery for failed asynchronous workflows.

---

## 3. Scope Boundaries

### 3.1 Included

- Visit request creation
- Visit availability and scheduling foundations
- Visit rescheduling and cancellation
- Visit attendance and completion states
- Visit conflict validation
- Lead creation and deduplication
- Independent broker lead ownership
- Agency lead ownership
- Broker assignment and reassignment
- Lead status lifecycle
- Lead notes and follow-up metadata
- Contact-access policy enforcement
- Visit and lead notifications
- Reminder jobs
- Event contracts
- Audit history
- Role and ownership checks
- Operational reconciliation

### 3.2 Excluded

Do not implement the following in this module unless separately approved:

- Payment collection
- Commission settlement
- Agreement generation
- Full customer relationship management
- Marketing campaigns
- Bulk messaging campaigns
- Reviews and ratings
- Property listing creation or publication logic
- Furniture rental order management
- Advanced calendar synchronization
- External meeting/video-conference integrations
- AI lead scoring

Other modules may consume visit and lead events, but they must not duplicate ownership or lifecycle rules.

---

## 4. Core Domain Concepts

### 4.1 Visit

A visit represents a user's request or confirmed arrangement to inspect a specific published listing.

A visit must reference:

- The user requesting the visit
- The listing and underlying property
- The responsible broker or agency context, where applicable
- The requested or confirmed time
- The current visit status
- Relevant cancellation, rescheduling, and completion metadata

A visit is not automatically a successful transaction or agreement.

### 4.2 Lead

A lead represents a qualified or recorded expression of interest that requires follow-up by an authorized broker or agency workflow.

A lead may originate from:

- A visit request
- A contact or inquiry action
- An approved listing-interest action
- Another explicitly approved platform event

The exact source types must be centrally enumerated.

### 4.3 Hybrid Lead Ownership

The finalized ownership model is:

- **Independent broker listing:** the lead belongs to the responsible broker.
- **Agency listing:** the lead belongs to the agency and may be assigned to one or more authorized brokers according to policy.
- **Platform administration:** authorized Super Admin users may inspect and manage leads under explicit permissions, but ordinary administrative access must not silently transfer ownership.

The backend must store ownership explicitly. Do not derive lead ownership only from the current listing owner at read time because listing ownership may change historically.

### 4.4 Assignment

An assignment connects a lead to a broker responsible for follow-up.

Assignment records must preserve:

- Assigned broker
- Assigning actor or system source
- Assignment reason
- Start time
- End time, where reassigned
- Assignment status
- Relevant audit metadata

Do not overwrite historical assignment records when reassignment occurs.

---

## 5. Recommended Data Model

The implementation team must use version-controlled migrations and the shared database package.

### 5.1 `visits`

Recommended fields:

- `id`
- `public_id`
- `listing_id`
- `property_id`
- `user_id`
- `owner_context_type`
- `owner_context_id`
- `responsible_broker_id`, nullable
- `requested_start_at`
- `requested_end_at`
- `confirmed_start_at`, nullable
- `confirmed_end_at`, nullable
- `status`
- `request_note`, nullable
- `cancellation_reason`, nullable
- `reschedule_reason`, nullable
- `completion_note`, nullable
- `cancelled_by`, nullable
- `confirmed_by`, nullable
- `completed_by`, nullable
- `created_at`
- `updated_at`
- `version`

The schema must use a consistent timezone strategy. Persist timestamps in UTC and convert them for presentation.

### 5.2 `visit_status_history`

Recommended fields:

- `id`
- `visit_id`
- `from_status`
- `to_status`
- `actor_id`, nullable for system actions
- `reason`, nullable
- `metadata`
- `created_at`

### 5.3 `leads`

Recommended fields:

- `id`
- `public_id`
- `source_type`
- `source_reference_id`, nullable where source is not a single entity
- `user_id`
- `listing_id`, nullable only for explicitly approved lead sources
- `property_id`, nullable where appropriate
- `ownership_type`
- `owner_id`
- `agency_id`, nullable
- `primary_broker_id`, nullable
- `status`
- `priority`, if approved by the product scope
- `first_contacted_at`, nullable
- `last_contacted_at`, nullable
- `next_follow_up_at`, nullable
- `closed_at`, nullable
- `closed_reason`, nullable
- `created_at`
- `updated_at`
- `version`

### 5.4 `lead_assignments`

Recommended fields:

- `id`
- `lead_id`
- `broker_id`
- `assigned_by`, nullable for system assignment
- `assignment_reason`, nullable
- `status`
- `assigned_at`
- `unassigned_at`, nullable
- `created_at`

### 5.5 `lead_status_history`

Recommended fields:

- `id`
- `lead_id`
- `from_status`
- `to_status`
- `actor_id`
- `reason`, nullable
- `created_at`

### 5.6 `lead_notes`

Recommended fields:

- `id`
- `lead_id`
- `author_id`
- `note_body`
- `visibility`
- `created_at`
- `updated_at`
- `deleted_at`, if soft deletion is approved

Notes must have explicit visibility rules. A private internal note must not be returned to a user or unauthorized broker.

### 5.7 Supporting Tables

Use additional tables where required for correctness:

- `visit_availability_windows`
- `visit_reschedule_history`
- `visit_participants`
- `lead_contact_access_logs`
- `lead_follow_up_tasks`
- `lead_risk_flags`
- `lead_deduplication_candidates`
- `workflow_outbox`
- `workflow_reconciliation_records`

Do not use one unbounded JSON field as a substitute for operational history.

---

## 6. Visit Lifecycle

### 6.1 Suggested Statuses

The final enum must be aligned with the shared API contract. A suitable initial lifecycle is:

- `REQUESTED`
- `PENDING_CONFIRMATION`
- `CONFIRMED`
- `RESCHEDULE_REQUESTED`
- `RESCHEDULED`
- `CANCELLED_BY_USER`
- `CANCELLED_BY_BROKER`
- `CANCELLED_BY_SYSTEM`
- `NO_SHOW`
- `COMPLETED`
- `EXPIRED`
- `REJECTED`

Do not permit arbitrary status assignment from clients.

### 6.2 Valid Transitions

Implement a dedicated state-transition service.

Examples:

- `REQUESTED` → `PENDING_CONFIRMATION`
- `PENDING_CONFIRMATION` → `CONFIRMED`
- `PENDING_CONFIRMATION` → `REJECTED`
- `CONFIRMED` → `RESCHEDULE_REQUESTED`
- `RESCHEDULE_REQUESTED` → `RESCHEDULED`
- `CONFIRMED` → `CANCELLED_BY_USER`
- `CONFIRMED` → `CANCELLED_BY_BROKER`
- `CONFIRMED` → `COMPLETED`
- `CONFIRMED` → `NO_SHOW`
- `REQUESTED` → `EXPIRED`

The implementation must document every permitted transition and reject invalid transitions consistently.

### 6.3 Visit Creation

When a user requests a visit:

1. Authenticate the user.
2. Confirm that the listing is publicly published and visit-eligible.
3. Confirm that the listing has not expired, been withdrawn, or been suspended.
4. Validate the requested time window.
5. Resolve the responsible owner, agency, and broker context.
6. Check duplicate or conflicting active requests according to policy.
7. Create the visit in a non-confirmed state.
8. Create the initial status-history record.
9. Create or link the corresponding lead if the source policy requires it.
10. Commit the transaction.
11. Emit events for notifications and downstream workflows.

A successful request must not be represented as a confirmed visit unless an authorized confirmation action occurred.

---

## 7. Visit Scheduling and Conflict Controls

### 7.1 Time Validation

Validate:

- Start time precedes end time.
- Requested duration is within approved limits.
- Time is not in the past beyond the allowed tolerance.
- The listing is available during the requested period.
- The requested time uses a valid timezone conversion.
- The requested date is not blocked by an approved policy.

### 7.2 Conflict Handling

The backend must prevent or explicitly manage:

- Duplicate active visit requests by the same user for the same listing.
- Overlapping confirmed visits for the same broker where broker availability is enforced.
- Overlapping visits that violate property or listing capacity rules.
- Confirmation of cancelled or expired visits.
- Concurrent confirmation or cancellation requests.

Use database constraints, transactional locking, or another proven concurrency-control strategy where needed.

Do not rely only on a preliminary application-level availability check.

### 7.3 Rescheduling

Rescheduling must:

- Require appropriate authorization.
- Preserve the original schedule.
- Record the reason and actor.
- Re-run availability and conflict checks.
- Create a new status-history record.
- Trigger updated notifications.
- Avoid changing a completed or terminal visit.

### 7.4 Cancellation

Cancellation must:

- Validate who is allowed to cancel.
- Require a reason where policy requires it.
- Preserve historical data.
- Release any reserved scheduling capacity.
- Notify affected parties.
- Be idempotent for repeated cancellation requests.

---

## 8. Visit Completion and Attendance

### 8.1 Completion

A visit may be marked completed only by an authorized actor or approved workflow.

The completion operation should capture:

- Completion timestamp
- Actor
- Optional outcome metadata
- Optional follow-up requirement
- Any approved visit feedback signal

Do not treat completion as proof that a transaction occurred.

### 8.2 No-Show

No-show handling must be explicit.

The system should support:

- User no-show
- Broker no-show
- System-determined no-show, only if an approved rule exists

No-show decisions must be auditable and must not be inferred from missing API traffic alone.

### 8.3 Downstream Effects

Completion may emit events consumed by:

- Lead workflows
- Review eligibility checks
- Analytics
- Notifications
- Broker performance reporting

The visit module must not directly implement review, analytics, or settlement logic.

---

## 9. Lead Creation and Deduplication

### 9.1 Lead Creation Rules

When a lead is created:

1. Authenticate the initiating actor or validate the trusted system event.
2. Validate the source type.
3. Resolve the related user and listing context.
4. Resolve the ownership snapshot.
5. Determine whether an equivalent active lead already exists.
6. Create a new lead or update the existing lead according to policy.
7. Record the source reference and audit metadata.
8. Create the initial status-history record.
9. Emit a lead-created or lead-updated event after commit.

### 9.2 Deduplication

Deduplication should use explicit, documented signals such as:

- Same user and listing
- Same user and property
- Same source reference
- Existing open lead within a configured time window

Deduplication must not merge unrelated users merely because contact details look similar.

When merging or linking is permitted:

- Preserve the original records or an auditable merge history.
- Keep source references.
- Record the actor or system decision.
- Prevent duplicate notifications and assignments.

### 9.3 Ownership Snapshot

At lead creation, store the relevant ownership context:

- Independent broker owner
- Agency owner
- Responsible broker, if already assigned
- Listing and property references

If listing ownership changes later, existing leads must follow the approved historical ownership policy rather than silently changing ownership.

---

## 10. Lead Lifecycle

### 10.1 Suggested Statuses

The final enum must be aligned with the shared contract. A suitable initial lifecycle is:

- `NEW`
- `ASSIGNED`
- `CONTACTED`
- `FOLLOW_UP_REQUIRED`
- `QUALIFIED`
- `VISIT_SCHEDULED`
- `NEGOTIATION`
- `CONVERTED`
- `LOST`
- `INVALID`
- `CLOSED`

Only approved statuses may be exposed to clients.

### 10.2 Transition Rules

Implement a centralized lead state-transition service.

Examples:

- `NEW` → `ASSIGNED`
- `ASSIGNED` → `CONTACTED`
- `CONTACTED` → `FOLLOW_UP_REQUIRED`
- `CONTACTED` → `QUALIFIED`
- `QUALIFIED` → `VISIT_SCHEDULED`
- `QUALIFIED` → `NEGOTIATION`
- `NEGOTIATION` → `CONVERTED`
- Any active state → `LOST` with a reason
- `NEW` → `INVALID` with a reason

The service must reject invalid transitions and record every successful transition.

### 10.3 Closed Leads

A lead marked `CONVERTED`, `LOST`, `INVALID`, or `CLOSED` must not be casually reopened.

Reopening, if supported, must be an explicit command with:

- Authorized actor
- Reason
- Audit record
- Re-evaluation of ownership and permissions

---

## 11. Broker and Agency Assignment Rules

### 11.1 Independent Broker Leads

For an independent broker listing:

- The lead owner must be the responsible broker.
- Only that broker and authorized administrators may access the lead.
- The broker may update permitted lead fields and follow-up status.
- The broker cannot transfer ownership to another broker unless policy explicitly allows it.

### 11.2 Agency Leads

For an agency listing:

- The agency remains the lead owner.
- Assignment may be made to an authorized broker belonging to the agency.
- A broker must not access agency leads solely by knowing the listing or lead ID.
- The agency may reassign leads according to its permissions.
- Assignment history must be retained.
- Removing a broker from an agency must trigger an access review for active assignments.

### 11.3 Assignment Authorization

Validate:

- The assigning actor's role.
- The agency relationship.
- Broker account status.
- Broker verification or approval state where required.
- Listing and lead ownership context.
- Whether the lead is in a state that allows reassignment.

### 11.4 Automatic Assignment

If automatic assignment is implemented:

- Use a documented deterministic policy.
- Record the policy version or decision reason.
- Ensure the assigned broker is eligible.
- Avoid assigning to suspended or inactive brokers.
- Make retries idempotent.
- Provide a manual recovery path.

Do not implement opaque or speculative assignment scoring in this step.

---

## 12. Contact Access and Privacy

### 12.1 Contact Disclosure

Contact information must be exposed only when the caller satisfies the approved access policy.

The backend must distinguish:

- User viewing their own information
- Responsible broker access
- Agency-authorized access
- Super Admin access
- Public or unauthenticated access

### 12.2 Access Logging

Sensitive contact access should be logged with:

- Actor
- Lead ID
- Data category accessed
- Purpose or access reason where required
- Timestamp
- Correlation ID

### 12.3 Data Minimization

Return only the fields needed for the current workflow.

Do not expose:

- Internal risk data
- Private notes
- Verification documents
- Other brokers' private lead data
- Internal assignment metadata
- Unnecessary personal identifiers

Apply the platform's retention and deletion policies to lead and visit data.

---

## 13. Follow-Up and Notes

### 13.1 Follow-Up Metadata

Support approved follow-up fields such as:

- Next follow-up time
- Last contact time
- Contact outcome
- Follow-up required flag
- Closure reason

Use enumerated values for operational reporting where possible.

### 13.2 Notes

Notes must:

- Be associated with a specific lead.
- Record the author.
- Enforce visibility.
- Be validated for length and content.
- Support safe editing or deletion according to policy.
- Be excluded from public and unauthorized responses.

Do not implement unrestricted rich-text or file attachments without explicit approval.

### 13.3 Follow-Up Jobs

If reminders are supported:

- Store the next follow-up time explicitly.
- Create idempotent scheduled work.
- Avoid duplicate reminders after status changes.
- Re-check lead status and assignment before sending.
- Record delivery outcomes.

---

## 14. Notifications and Events

### 14.1 Visit Events

Define versioned events such as:

- `visit.requested`
- `visit.pending_confirmation`
- `visit.confirmed`
- `visit.reschedule_requested`
- `visit.rescheduled`
- `visit.cancelled`
- `visit.completed`
- `visit.no_show`
- `visit.expired`

### 14.2 Lead Events

Define versioned events such as:

- `lead.created`
- `lead.updated`
- `lead.assigned`
- `lead.reassigned`
- `lead.unassigned`
- `lead.status_changed`
- `lead.follow_up_due`
- `lead.closed`

### 14.3 Event Requirements

Each event should include:

- Event ID
- Event name
- Schema version
- Aggregate public ID
- Correlation ID
- Actor or source context
- Occurred-at timestamp
- Relevant ownership context
- Minimal necessary payload

Events must be emitted only after the related transaction commits, preferably through the shared outbox mechanism.

---

## 15. Background Jobs and Reconciliation

Implement jobs for:

- Visit reminder dispatch
- Visit request expiry
- Follow-up reminder preparation
- Stale pending-visit detection
- Lead assignment retry
- Notification retry
- Duplicate lead reconciliation
- Orphaned visit/lead detection
- Downstream event reconciliation
- Historical status consistency checks

Every job must define:

- Schedule
- Batch size
- Retry policy
- Backoff strategy
- Idempotency key
- Failure handling
- Dead-letter or manual-review path
- Metrics and structured logs

Jobs must re-check current state before acting. A stale queued job must not cancel, notify, assign, or transition a record incorrectly.

---

## 16. API Contract Requirements

The exact route names must be finalized in the shared API contract documentation.

### 16.1 User APIs

Required capabilities may include:

- Request a visit
- View own visits
- Cancel a visit
- Request rescheduling
- View permitted visit details
- View own inquiry/lead status where supported
- View notifications related to visits

### 16.2 Broker APIs

Required capabilities may include:

- View authorized leads
- View lead details
- Accept or manage an assignment where applicable
- Update lead status
- Add or update follow-up metadata
- Add permitted notes
- Confirm, reject, reschedule, or complete visits
- View authorized visit history
- Reassign leads only where policy permits

### 16.3 Agency APIs

Required capabilities may include:

- View agency-owned leads
- Assign and reassign leads to eligible agency brokers
- View assignment history
- View agency visit workflows
- Manage permitted lead statuses
- View operational lead summaries

### 16.4 Administrative APIs

Required capabilities may include:

- Search leads and visits under explicit permissions
- Inspect ownership and assignment history
- Override or repair workflows with a mandatory reason
- Resolve orphaned records
- Review access logs
- Trigger reconciliation
- Inspect notification and job failures

Administrative overrides must not bypass audit requirements.

---

## 17. Validation and Error Handling

Use shared validation and error conventions.

Validation must cover:

- Listing publication eligibility
- Visit time ranges
- Visit status transition validity
- Lead source validity
- Ownership context
- Broker eligibility
- Agency membership
- Assignment state
- Follow-up date validity
- Note length and visibility
- Cancellation and rejection reasons
- Idempotency keys

Return stable machine-readable error codes, such as:

- `LISTING_NOT_VISIT_ELIGIBLE`
- `VISIT_TIME_INVALID`
- `VISIT_CONFLICT`
- `VISIT_STATE_TRANSITION_INVALID`
- `LEAD_NOT_ACCESSIBLE`
- `BROKER_NOT_ELIGIBLE`
- `AGENCY_RELATIONSHIP_INVALID`
- `LEAD_ASSIGNMENT_INVALID`
- `LEAD_STATE_TRANSITION_INVALID`
- `DUPLICATE_ACTIVE_LEAD`
- `FOLLOW_UP_DATE_INVALID`

Do not expose internal database errors or private ownership information.

---

## 18. Security Requirements

- Enforce access at the service layer for every visit and lead operation.
- Prevent IDOR and cross-agency data access.
- Do not trust owner, agency, broker, or user IDs supplied by clients.
- Use explicit command DTOs and field allowlists.
- Protect contact information and private notes.
- Apply rate limits to visit requests, lead creation, and contact-access operations.
- Make cancellation, assignment, and status changes concurrency-safe.
- Require elevated permissions for administrative overrides.
- Redact sensitive data from logs.
- Record access to sensitive contact information.
- Ensure suspended or inactive brokers cannot receive new assignments.
- Apply retention and deletion policies consistently.

---

## 19. Observability and Auditability

Capture metrics and structured logs for:

- Visit requests by outcome
- Visit confirmation latency
- Visit cancellation and no-show rates
- Scheduling conflicts
- Lead creation and deduplication outcomes
- Lead assignment latency
- Reassignment volume
- Follow-up overdue counts
- Notification failures
- Job retries and dead-letter records
- Unauthorized access attempts
- Administrative overrides
- Orphaned record reconciliation

Every significant workflow action must be traceable through:

- Visit or lead public ID
- Listing public ID, where applicable
- User, broker, agency, or admin actor
- Correlation ID
- Previous state
- New state
- Reason
- Timestamp

---

## 20. Testing Requirements

### 20.1 Unit Tests

Cover:

- Visit transition rules
- Lead transition rules
- Visit time validation
- Conflict detection
- Ownership snapshot creation
- Broker eligibility
- Agency assignment authorization
- Deduplication logic
- Contact-access policy
- Follow-up reminder eligibility
- Idempotency behavior

### 20.2 Integration Tests

Cover:

- Visit request against a published listing
- Visit request against a suspended or expired listing
- Concurrent confirmation and cancellation
- Rescheduling with conflicting time windows
- Lead creation from a visit
- Independent broker lead access
- Agency lead assignment and reassignment
- Broker removal from an agency
- Contact access logging
- Status-history persistence
- Outbox event creation
- Reminder job retry and deduplication

### 20.3 End-to-End Tests

At minimum:

1. A user requests a visit for an eligible listing.
2. The request is visible to the authorized responsible broker or agency.
3. An authorized actor confirms the visit.
4. The user receives the appropriate notification.
5. The visit is completed or cancelled through a valid workflow.
6. The corresponding lead is created or updated according to policy.
7. An independent broker can access only their own lead.
8. An agency broker can access only assigned or otherwise authorized agency leads.
9. An agency-authorized user can reassign a lead.
10. An unauthorized broker cannot access or reassign the lead.
11. Replayed commands do not create duplicate visits, leads, assignments, or notifications.

### 20.4 Security Tests

Test:

- Cross-user access
- Cross-broker access
- Cross-agency access
- IDOR attempts
- Unauthorized contact disclosure
- Unauthorized assignment
- Unauthorized administrative override
- Replay of idempotent requests
- Concurrent status changes
- Rate-limit enforcement

---

## 21. Implementation Deliverables

The implementation team must deliver:

- Visit and lead database migrations
- Domain entities and repositories
- Visit lifecycle state machine
- Lead lifecycle state machine
- Ownership and assignment services
- Visit conflict and scheduling validation
- Lead creation and deduplication service
- Agency assignment and reassignment workflows
- Contact-access policy service
- Follow-up metadata and notes support
- Event contracts and outbox integration
- Reminder and reconciliation jobs
- API schemas and route handlers
- Audit-log integration
- Metrics and structured logging
- Unit, integration, security, and end-to-end tests
- Updated architecture and API documentation

---

## 22. Definition of Done

This step is complete only when:

- Visit and lead ownership rules are enforced server-side.
- Visit and lead lifecycle transitions are centralized and validated.
- Visit conflicts are handled safely under concurrent requests.
- A visit request cannot be mistaken for a confirmed visit.
- The hybrid lead-ownership model is implemented exactly.
- Agency assignments and reassignment history are auditable.
- Contact access is permission-controlled and logged where required.
- Visit and lead events are versioned and emitted after commit.
- Reminder and reconciliation jobs are idempotent and observable.
- Sensitive notes and personal data are protected.
- Interface teams can consume the APIs without reimplementing workflow rules.
- Cross-user, cross-broker, and cross-agency access tests pass.

---

## 23. Acceptance Criteria

1. An eligible user can request a visit for a published listing.
2. A user cannot request a visit for an expired, withdrawn, suspended, or unpublished listing.
3. Invalid visit state transitions are rejected consistently.
4. Concurrent visit actions cannot create contradictory final states.
5. Rescheduling preserves historical schedule data and validates conflicts again.
6. Cancellation is authorized, auditable, and idempotent.
7. A lead is created or updated according to the approved source and deduplication policy.
8. Independent broker leads remain restricted to the responsible broker and authorized administrators.
9. Agency leads remain owned by the agency and can be assigned only to eligible agency brokers.
10. Assignment history is preserved after reassignment.
11. Unauthorized actors cannot view contact details, private notes, or internal ownership data.
12. Visit and lead status changes produce the correct audit records and domain events.
13. Reminder and reconciliation jobs do not produce duplicate side effects on retry.
14. Administrative overrides require explicit permission and a reason.
15. Shared validation, database, events, observability, and authorization packages are reused.
16. No interface duplicates visit, lead, ownership, assignment, or lifecycle business rules.

---

## 24. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the existing repository and shared-core modules before making changes.
2. Read the API conventions, database architecture, identity, authorization, events, and notification contracts first.
3. Reuse the existing database client, transaction utilities, validation package, event contracts, outbox mechanism, logger, and authorization policies.
4. Do not create a second lead, visit, notification, or ownership system.
5. Implement database migrations before using new tables.
6. Keep visit and lead state transitions in dedicated domain services.
7. Keep ownership and assignment authorization centralized.
8. Use explicit command handlers and field allowlists.
9. Add concurrency tests for confirmation, cancellation, rescheduling, and assignment.
10. Ensure all asynchronous work is retry-safe and idempotent.
11. Update API contracts and documentation alongside implementation.
12. If a policy is ambiguous, record a decision or blocker instead of silently inventing behavior.
13. Do not implement mobile or web UI code in this step.
14. Do not implement payment, review, furniture, commission, or agreement logic here.
15. Do not mark the step complete until the Definition of Done and Acceptance Criteria have been verified.
