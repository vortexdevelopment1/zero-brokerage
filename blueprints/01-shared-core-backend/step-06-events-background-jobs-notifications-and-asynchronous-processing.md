# Step 06 — Events, Background Jobs, Notifications, and Reliable Asynchronous Processing

## 1. Purpose

This step defines the implementation baseline for domain events, asynchronous processing, background jobs, notification delivery, retries, idempotency, and operational recovery in the Zero Brokerage backend.

The objective is to ensure that long-running, retryable, provider-dependent, or non-critical side effects do not unnecessarily block synchronous API requests while preserving business consistency.

This step must be implemented within the approved modular-monolith architecture.

---

## 2. Scope

This step covers:

- Domain-event conventions.
- Event publication and consumption.
- Transactional outbox behavior.
- Redis-backed job processing.
- Retry and backoff policies.
- Dead-letter or failed-job handling.
- Notification orchestration.
- Email, SMS, WhatsApp, and push-provider abstractions where approved.
- Scheduled jobs.
- Reconciliation jobs.
- Idempotent consumers.
- Job observability.
- Failure recovery.
- Security and privacy requirements for events and jobs.

This step does not authorize new external providers or product workflows that are outside the approved scope.

---

## 3. Synchronous Versus Asynchronous Work

The team must explicitly classify each operation as synchronous or asynchronous.

### Synchronous work is appropriate when:

- The result is required to complete the current request.
- The operation is short-running and predictable.
- The operation establishes a critical business invariant.
- The caller must receive an immediate success or failure result.

Examples:

- Validating ownership.
- Creating a durable listing record.
- Checking subscription entitlement.
- Reserving a resource when the reservation must be confirmed immediately.
- Recording a payment-provider webhook state change.

### Asynchronous work is appropriate when:

- The work can safely happen after the primary transaction.
- The work may take significant time.
- The work depends on an external provider.
- The work can be retried.
- The work is a notification or analytics side effect.
- The work is a scheduled reconciliation or aggregation task.

Examples:

- Sending a notification.
- Processing analytics events.
- Generating a CSV export.
- Rebuilding a search projection.
- Sending reminders.
- Retrying a failed provider delivery.
- Running reconciliation checks.

The system must not move critical invariant enforcement into an asynchronous job merely to simplify implementation.

---

## 4. Event Taxonomy

The implementation must distinguish between different event categories.

### 4.1 Domain Events

Domain events represent meaningful business occurrences.

Examples:

- `user.created`
- `broker.verification_submitted`
- `broker.verification_approved`
- `listing.created`
- `listing.submitted_for_review`
- `listing.published`
- `listing.suspended`
- `visit.created`
- `visit.completed`
- `lead.created`
- `lead.assigned`
- `payment.succeeded`
- `payment.failed`
- `subscription.activated`
- `subscription.expired`
- `review.submitted`
- `review.published`
- `furniture.order_created`
- `furniture.item_returned`
- `transaction.closed`

### 4.2 Integration Events

Integration events are intended for external systems or provider adapters.

Examples may include:

- Payment-provider synchronization requests.
- Notification-delivery requests.
- Search-index update requests.
- Analytics ingestion requests.

Integration events must not be confused with internal domain events.

### 4.3 Operational Events

Operational events describe system or job behavior.

Examples include:

- Job started.
- Job completed.
- Job failed.
- Job retried.
- Provider unavailable.
- Reconciliation mismatch detected.
- Dead-letter item created.

Operational events should support monitoring and investigation without exposing sensitive payloads.

---

## 5. Event Naming Convention

Event names must be:

- Lowercase.
- Consistent.
- Domain-oriented.
- Versionable.
- Explicit about the business occurrence.
- Documented before use.

Recommended pattern:

```text
<domain>.<entity_or_concept>.<past_tense_event>
```

Examples:

```text
listing.published
broker.verification_approved
payment.succeeded
visit.completed
```

Avoid ambiguous names such as:

```text
listing.updated
data.changed
process.done
```

when a more precise event name is available.

If event versions are required, use a documented versioning convention rather than silently changing the meaning of an existing event.

---

## 6. Event Envelope

Every event should use a common envelope.

A representative envelope is:

```json
{
  "eventId": "event-id",
  "eventName": "listing.published",
  "eventVersion": 1,
  "occurredAt": "2026-09-20T10:00:00.000Z",
  "producer": "listings",
  "correlationId": "request-or-workflow-id",
  "causationId": "causing-event-id",
  "actor": {
    "type": "user",
    "id": "actor-id"
  },
  "data": {
    "listingId": "listing-id"
  }
}
```

The final envelope must define:

- Required fields.
- Optional fields.
- Identifier formats.
- Versioning behavior.
- Actor representation.
- Correlation and causation semantics.
- Payload-size limits.
- Privacy rules.

Events should contain stable identifiers and minimal necessary data.

Do not include:

- OTP values.
- Access tokens.
- Refresh tokens.
- Payment secrets.
- Full identity documents.
- Unnecessary personal data.
- Sensitive provider payloads.

---

## 7. Transactional Outbox

When a business-state change and event publication must be reliable together, use a transactional outbox or an equivalent approved mechanism.

The expected flow is:

```text
Begin database transaction
        ↓
Apply business-state change
        ↓
Write event to outbox table
        ↓
Commit transaction
        ↓
Outbox dispatcher publishes event
        ↓
Mark event as dispatched
```

The outbox record should support:

- Event identifier.
- Event name and version.
- Aggregate or resource reference.
- Serialized payload.
- Creation timestamp.
- Dispatch status.
- Attempt count.
- Last-attempt timestamp.
- Next-attempt timestamp.
- Error metadata safe for operations.
- Dispatch timestamp.

The implementation must handle process failure between database commit and event dispatch.

Outbox processing must be safe under multiple workers.

---

## 8. Event Consumers

Every consumer must be designed for at-least-once delivery.

Consumers must:

- Be idempotent.
- Validate event versions.
- Validate required payload fields.
- Record processing state where necessary.
- Avoid duplicate side effects.
- Handle out-of-order events where relevant.
- Define retryable and non-retryable failures.
- Emit operational information on failure.
- Avoid assuming that an event is delivered exactly once.

For critical consumers, maintain a processed-event or equivalent deduplication record.

A consumer must not acknowledge successful processing before durable side effects are complete.

---

## 9. Redis-Backed Job Processing

Redis may be used for background-job coordination and queues.

The job system must define:

- Queue names.
- Job payload schemas.
- Job identifiers.
- Retry limits.
- Backoff strategy.
- Visibility or lock duration.
- Concurrency limits.
- Timeout behavior.
- Deduplication behavior.
- Job priority where required.
- Retention of completed jobs.
- Failed-job retention.
- Operational inspection procedures.

Recommended job categories include:

```text
notifications
analytics
exports
search-projections
reconciliation
reminders
payments
maintenance
```

The final queue names must be documented and must not be duplicated across modules without a clear ownership rule.

Redis job payloads must not contain unnecessary sensitive data.

---

## 10. Retry Policy

Retries must be intentional and bounded.

For each job or event consumer, document:

- Whether retries are allowed.
- Maximum attempts.
- Retry delay.
- Backoff strategy.
- Jitter behavior.
- Retryable errors.
- Non-retryable errors.
- Timeout behavior.
- Dead-letter behavior.
- Manual recovery procedure.

Retry candidates may include:

- Temporary network failures.
- Provider timeouts.
- Rate-limit responses from providers.
- Temporary database unavailability.
- Transient infrastructure errors.

Do not retry:

- Invalid payloads.
- Permanent authorization failures.
- Invalid business states.
- Rejected payment requests that cannot succeed through repetition.
- Malformed provider responses without a corrective action.

Retries must not create duplicate payments, notifications, reservations, assignments, or other side effects.

---

## 11. Dead-Letter and Failed-Job Handling

Failed jobs and events must remain visible for investigation.

The system must provide:

- Failed-job storage or equivalent visibility.
- Failure reason classification.
- Attempt history.
- Timestamp information.
- Correlation identifiers.
- Safe payload inspection.
- Retry-now capability for authorized operators where appropriate.
- Discard or resolve capability with audit logging.
- Alerts for critical failure categories.

Dead-letter records must not be silently deleted before the relevant retention period.

Sensitive payload fields must be redacted in operational views.

---

## 12. Notification Architecture

Notifications must be triggered from approved domain events or explicit application commands.

The Notifications module should provide:

- Notification creation.
- Template selection.
- Recipient resolution.
- Channel selection.
- Preference evaluation.
- Delivery scheduling.
- Delivery attempts.
- Retry behavior.
- Delivery status.
- Failure classification.
- Provider abstraction.
- Audit metadata.

Possible channels include:

- In-app notifications.
- Email.
- SMS.
- WhatsApp.
- Push notifications.

Only channels approved for the relevant workflow may be used.

Notification delivery should normally be asynchronous.

---

## 13. Notification Preferences

The system must respect user and organization notification preferences where applicable.

Preferences must define:

- Supported notification categories.
- Supported channels.
- Opt-in or opt-out behavior.
- Mandatory transactional notifications.
- Marketing or promotional notification restrictions.
- Quiet-hour behavior if supported.
- Fallback-channel rules.
- Preference update authorization.

Critical operational or transactional notifications may be mandatory when required by the product or legal obligations.

The backend must evaluate preferences server-side.

A client must not bypass notification restrictions by directly selecting a provider or channel.

---

## 14. Notification Templates

Templates must be managed through a controlled mechanism.

Each template should define:

- Template identifier.
- Event or workflow association.
- Channel.
- Locale where localization is supported.
- Required variables.
- Optional variables.
- Version.
- Active/inactive state.
- Approval or review status where required.

Template rendering must:

- Validate required variables.
- Escape content appropriately for the channel.
- Avoid inserting untrusted HTML or markup without sanitization.
- Avoid exposing private data to unintended recipients.
- Fail safely when required data is missing.

Provider-specific formatting must remain inside the relevant adapter.

---

## 15. Scheduled Jobs and Reminders

Scheduled jobs may support:

- Visit reminders.
- Subscription renewal reminders.
- Expiry notifications.
- Listing expiry processing.
- Furniture rental reminders.
- Pending-verification reminders.
- Analytics aggregation.
- Reconciliation.
- Cleanup and archival tasks.

Every scheduled job must define:

- Schedule.
- Timezone behavior.
- Ownership.
- Idempotency strategy.
- Locking or duplicate-execution protection.
- Retry policy.
- Failure handling.
- Monitoring requirements.
- Manual execution procedure where needed.

Time-sensitive business rules must use a consistent timezone policy and must not depend on the local timezone of an arbitrary worker.

---

## 16. Payment and Webhook Jobs

Payment-related asynchronous processing must be especially defensive.

Requirements include:

- Verify webhook authenticity before processing.
- Persist webhook receipt metadata.
- Deduplicate provider events.
- Map provider states to internal states.
- Use explicit payment state transitions.
- Avoid trusting client-reported payment status.
- Retry transient provider or database failures.
- Reconcile uncertain payment states.
- Record operational failures.
- Protect payment data in logs and job payloads.

A job retry must not create a second payment order or duplicate a refund.

---

## 17. Reconciliation Jobs

Reconciliation jobs should be used for workflows where internal state can diverge from external systems.

Potential reconciliation targets include:

- Payment provider versus internal payment records.
- Subscription state versus payment state.
- Furniture inventory versus active reservations.
- Notification delivery state versus provider delivery status.
- Search projection versus source listing state.
- Analytics ingestion versus expected event counts.

Each reconciliation job must define:

- Source systems.
- Comparison rules.
- Frequency.
- Scope.
- Mismatch categories.
- Automatic correction limits.
- Manual-review requirements.
- Audit records.
- Alerting behavior.

Automatic correction must not be enabled for high-risk financial or ownership changes without explicit approval.

---

## 18. Job and Event Security

The asynchronous system must enforce:

- Authenticated producer boundaries.
- Authorized administrative inspection.
- Payload minimization.
- Secret redaction.
- Access-controlled job dashboards.
- Secure Redis credentials.
- Network restrictions.
- Safe serialization and deserialization.
- Validation of every job payload.
- Protection against replay where relevant.
- Audit logging for manual retries and destructive actions.

Never execute arbitrary code or commands from a job payload.

---

## 19. Observability

Every job and event-processing attempt should expose:

- Job or event identifier.
- Queue or event name.
- Attempt number.
- Start time.
- End time.
- Duration.
- Outcome.
- Error category.
- Correlation identifier.
- Producer or consumer module.
- Retry decision.

Operational metrics should include:

- Queue depth.
- Processing latency.
- Success rate.
- Failure rate.
- Retry rate.
- Dead-letter count.
- Provider error rate.
- Oldest pending job age.
- Outbox backlog.
- Reconciliation mismatch count.

Logs must avoid sensitive payloads.

---

## 20. Testing Requirements

### Unit Tests

Test:

- Event-envelope validation.
- Event naming and version handling.
- Retry classification.
- Backoff calculations.
- Notification preference rules.
- Template variable validation.
- Idempotency logic.
- State-transition handlers.

### Integration Tests

Test:

- Transactional outbox persistence.
- Outbox dispatch.
- Duplicate event delivery.
- Redis queue behavior.
- Retry handling.
- Failed-job storage.
- Notification-provider adapters.
- Reconciliation logic.
- Database and queue failure behavior.

### End-to-End Tests

Test:

- Domain action resulting in an event.
- Event triggering a notification.
- Retry after provider failure.
- Duplicate webhook delivery.
- Scheduled reminder execution.
- Failed-job investigation flow.
- Manual retry authorization.
- Payment reconciliation.
- Listing or inventory projection recovery.

Tests must cover process restarts, duplicate delivery, out-of-order events where applicable, timeouts, and partial failures.

---

## 21. Required Deliverables

The implementation team must produce:

1. An event taxonomy.
2. An event naming and versioning policy.
3. A common event-envelope contract.
4. A transactional-outbox design.
5. A queue and job ownership matrix.
6. A retry and backoff policy.
7. A failed-job and dead-letter handling procedure.
8. Notification-channel adapter interfaces.
9. Notification preference and template contracts.
10. A scheduled-job inventory.
11. A reconciliation-job inventory.
12. An observability dashboard specification.
13. Tests for the implemented event and job workflows.

---

## 22. Definition of Done

This step is complete when:

- Event naming and envelope conventions are documented.
- Critical state changes use reliable event publication.
- Event consumers are idempotent.
- Redis-backed jobs have documented ownership and payload contracts.
- Retry and failure behavior is bounded and observable.
- Failed jobs remain inspectable.
- Notification delivery is provider-agnostic.
- Notification preferences are enforced server-side.
- Scheduled jobs have duplicate-execution protection.
- Payment-related asynchronous flows are verified and idempotent.
- Reconciliation jobs are defined for important external dependencies.
- Job and event metrics are available.
- Tests cover duplicate delivery and failure recovery.

---

## 23. Acceptance Criteria

- [ ] Domain events and integration events are clearly distinguished.
- [ ] Event names are consistent and versionable.
- [ ] Event payloads contain minimal necessary data.
- [ ] Critical database changes use a transactional outbox or equivalent.
- [ ] Event consumers are safe under at-least-once delivery.
- [ ] Redis queues have explicit ownership and schemas.
- [ ] Retry policies are bounded and documented.
- [ ] Non-retryable failures are not retried indefinitely.
- [ ] Failed jobs and dead-letter items are visible to authorized operators.
- [ ] Notifications use provider adapters rather than direct provider calls from business modules.
- [ ] Notification preferences are respected.
- [ ] Scheduled jobs are idempotent and timezone-aware.
- [ ] Payment and webhook processing is deduplicated.
- [ ] Reconciliation workflows are documented.
- [ ] Job and event processing is observable.
- [ ] Sensitive data is excluded or redacted from event and job payloads.
- [ ] Tests cover retries, duplicate delivery, restarts, and partial failures.
