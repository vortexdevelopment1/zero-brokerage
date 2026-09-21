# Step 12 — Resilience, Security Hardening, Operations, Deployment, and Release Readiness

## 1. Document Purpose

This document defines the implementation contract for making the shared Zero Brokerage backend operationally reliable and ready for a controlled commercial launch.

This step covers:

- Resilience and failure handling
- Service-specific availability expectations
- Timeouts, retries, and graceful degradation
- Observability and actionable operational alerts
- Backups, restoration, and disaster recovery
- Deployment safeguards
- Database migration discipline
- Reconciliation workflows
- Incident management
- Operational audit logs
- Security hardening
- Critical-workflow testing
- Managed-hosting readiness
- Production-readiness verification

This document is intended for the shared backend and platform engineering team. Interface teams must consume the resulting operational contracts and must not independently implement competing reliability, security, or deployment mechanisms.

---

## 2. Objectives

The implementation must ensure that the platform can:

1. Fail safely when dependencies become unavailable.
2. Prevent one slow or failing dependency from exhausting the API.
3. Apply explicit timeout, retry, and graceful-degradation rules.
4. Detect application, infrastructure, security, and data-quality problems.
5. Notify authorized operators about critical failures.
6. Restore data and services through documented procedures.
7. Deploy changes with mandatory safeguards and rollback options.
8. Apply database migrations in a controlled, versioned manner.
9. Reconcile asynchronous workflows and financial or operational records.
10. Maintain actionable incident records.
11. Protect sensitive data and administrative capabilities.
12. Validate critical workflows before production release.
13. Produce evidence that the system satisfies the approved Definition of Done.

---

## 3. Scope Boundaries

### 3.1 Included

- API resilience policies
- Dependency timeout policies
- Retry and backoff rules
- Idempotency and duplicate protection
- Graceful degradation
- Health and readiness checks
- Structured logs, metrics, and traces where supported
- Operational dashboards
- Actionable critical-failure notifications
- Database backup and restoration procedures
- Disaster-recovery documentation
- Deployment checklists and safeguards
- Migration versioning and rollback strategy
- Scheduled reconciliation
- Incident documentation
- Operational audit logging
- Security hardening
- Critical-workflow testing
- Production-readiness checklist

### 3.2 Excluded

Do not implement the following without explicit approval:

- A complete multi-region active-active architecture
- Unapproved microservice decomposition
- Automatic destructive remediation
- Automatic production rollback based solely on one metric
- Unreviewed infrastructure-as-code replacement
- A new cloud provider or hosting platform
- Unapproved observability vendor contracts
- Unbounded log or event retention
- Automatic legal, financial, or compliance decisions

The initial architecture remains a modular monolith with one deployable Fastify API unless a separate architecture decision is approved.

---

## 4. Reliability Principles

### 4.1 Fail Safely

When a dependency fails, the API must:

- Return a stable, documented error.
- Avoid exposing internal implementation details.
- Preserve data integrity.
- Avoid duplicate side effects.
- Record sufficient diagnostic context.
- Degrade only where the product policy permits it.

A failed optional feature must not corrupt an unrelated critical workflow.

### 4.2 Dependency Classification

Every external or infrastructure dependency must be classified as:

- Critical synchronous dependency
- Non-critical synchronous dependency
- Asynchronous dependency
- Optional enhancement
- Administrative-only dependency

Examples include:

- PostgreSQL
- Redis
- Payment provider
- OTP provider
- SMS or WhatsApp provider
- Email provider
- Object/file storage
- Geospatial or search support
- Background job processing
- Notification delivery

The classification must be documented per dependency.

### 4.3 Availability by Capability

Define availability expectations per capability instead of claiming one blanket availability percentage for the entire platform.

At minimum, document expectations for:

- Authentication
- Listing discovery
- Listing detail retrieval
- Visit requests
- Lead workflows
- Payment initiation
- Payment confirmation
- Subscription entitlement checks
- Furniture orders
- Notifications
- Administrative operations
- Analytics and exports

When a capability is degraded, the user-facing behavior must be explicit and testable.

---

## 5. Timeouts, Retries, and Circuit Protection

### 5.1 Timeout Requirements

Every outbound network call must have an explicit timeout.

Timeout configuration must distinguish:

- Connection timeout
- TLS or handshake timeout, where applicable
- Request timeout
- Response or idle timeout
- Job execution timeout

Never rely on an unlimited default timeout.

### 5.2 Retry Requirements

Retries are permitted only when the operation is safe to retry or protected by idempotency.

Use:

- Bounded retry counts
- Exponential backoff
- Jitter
- Maximum elapsed retry duration
- Error classification
- Dead-letter or failure handling for exhausted attempts

Do not retry validation errors, authorization errors, permanent business-rule failures, or non-idempotent operations without a safe idempotency mechanism.

### 5.3 Circuit Protection

For repeatedly failing dependencies, use circuit-breaker or equivalent protection where justified.

The implementation must define:

- Failure threshold
- Open-state duration
- Half-open behavior
- Recovery criteria
- Metrics and logs
- User-facing fallback behavior

Circuit protection must not hide persistent failures from operators.

### 5.4 Rate and Concurrency Limits

Apply bounded concurrency to:

- External provider calls
- Bulk exports
- Reconciliation jobs
- Notification delivery
- Analytics aggregation
- Backfills
- Large administrative operations

Prevent one tenant, user, or job from monopolizing shared resources.

---

## 6. Idempotency and Duplicate Protection

### 6.1 Critical Operations

Idempotency protection is required for appropriate operations such as:

- Payment initiation
- Payment confirmation processing
- Refund requests
- Subscription state transitions
- Furniture order creation
- Visit creation where duplicate requests are harmful
- Lead creation where duplicate leads are prohibited
- Webhook processing
- Export-job creation
- Reconciliation actions

### 6.2 Idempotency Contract

An idempotency key must be:

- Scoped to the authenticated actor or trusted integration
- Bound to the operation and relevant resource
- Stored with request outcome metadata
- Protected from unsafe reuse with different payloads
- Expired according to documented policy
- Safe under concurrent requests

The API must return the original outcome where the same valid idempotency key is replayed.

### 6.3 Event and Job Deduplication

Event consumers and jobs must tolerate duplicate delivery.

Use a durable processing record or equivalent mechanism where needed.

A job must not create duplicate:

- Payments
- Notifications
- Entitlements
- Settlements
- Reviews
- Analytics counts
- Export files
- Reconciliation adjustments

---

## 7. Health, Readiness, and Lifecycle Checks

### 7.1 Health Endpoints

Provide separate checks for:

- Process liveness
- Application readiness
- Database connectivity
- Redis connectivity
- Job-processing readiness
- Critical configuration availability

Liveness must answer whether the process is running.

Readiness must answer whether the instance should receive traffic.

Do not make liveness dependent on every external service.

### 7.2 Startup and Shutdown

The application lifecycle must:

- Validate required configuration.
- Establish required connections.
- Register routes and plugins in a deterministic order.
- Refuse readiness when critical initialization fails.
- Stop accepting new work during graceful shutdown.
- Allow in-flight requests to finish within a bounded period.
- Stop or hand off background processing safely.
- Close database and Redis connections.
- Flush important logs and metrics where supported.

### 7.3 Readiness During Degradation

If an optional provider is unavailable, the API may remain ready if the platform can safely serve core functionality.

If a critical dependency is unavailable, readiness behavior must follow the documented capability policy.

---

## 8. Observability

### 8.1 Structured Logging

All services and jobs must use structured JSON logs with consistent fields such as:

- Timestamp
- Log level
- Service name
- Environment
- Request ID
- Correlation ID
- Actor type, where safe
- Actor or tenant reference, where permitted
- Route or operation
- Duration
- Outcome
- Error code
- Dependency name
- Job name
- Trace context, where supported

Never log:

- Passwords
- OTP values
- Access tokens
- Refresh tokens
- Payment secrets
- Full identity documents
- Unredacted personal data
- Sensitive provider payloads

### 8.2 Metrics

At minimum, measure:

- Request count
- Error rate
- Latency percentiles
- Timeout count
- Dependency failure count
- Database pool saturation
- Redis errors
- Queue depth
- Job success and failure
- Retry counts
- Dead-letter count
- Payment webhook failures
- Notification delivery failures
- Reconciliation mismatches
- Backup outcomes
- Export duration
- Security violations
- Rate-limit rejections

### 8.3 Dashboards

Create operational dashboards for:

- API health
- Database and Redis
- Background jobs
- Payments and webhooks
- Notifications
- Security events
- Data reconciliation
- Backups and restoration tests
- Critical business workflow failures

Dashboards must identify the affected capability, severity, time range, and relevant drill-down context.

### 8.4 Alerts

The approved initial alert policy is dashboard-driven monitoring with mandatory actionable notifications for critical failures.

Critical alerts must include:

- What failed
- Affected capability
- Approximate start time
- Severity
- Correlation or incident reference
- Immediate diagnostic context
- Suggested first response
- Escalation owner

Do not generate noisy alerts for every recoverable transient error.

---

## 9. Backups and Disaster Recovery

### 9.1 Backup Requirements

Implement:

- Daily database backups at minimum
- Storage in a separate cloud location or account boundary where feasible
- Encryption at rest and in transit
- Access-controlled backup credentials
- Backup success/failure monitoring
- Retention policy
- Backup inventory
- Restoration documentation

The near-zero RPO target must not be claimed if the actual backup strategy cannot support it. If near-zero RPO is required, document the additional mechanism needed, such as continuous archiving or replication.

### 9.2 Restoration Tests

Backups are not considered reliable until restoration has been tested.

A restoration test must verify:

- Backup integrity
- Schema and migration compatibility
- Data completeness
- Required secrets/configuration availability
- Application startup against restored data
- Critical workflow behavior
- Restoration duration
- Gaps and follow-up actions

Record the result of each restoration test.

### 9.3 Recovery Objectives

The initial operational target is recovery within 24 hours unless a stricter target is approved.

Document:

- RPO
- RTO
- Recovery owner
- Recovery sequence
- Dependency restoration order
- Communication process
- Validation checklist
- Roll-forward or rollback decision criteria

### 9.4 Disaster-Recovery Scope

The initial strategy may be backup-based disaster recovery with tested restoration.

Do not represent backup-based recovery as automatic failover.

---

## 10. Deployment Safeguards

### 10.1 Deployment Model

The approved initial deployment approach is manual deployment with mandatory safeguards.

Every production deployment must have:

- A reviewed change set
- A known commit or release identifier
- Migration impact assessment
- Environment/configuration verification
- Backup or recovery confirmation where relevant
- Test evidence
- Rollback or roll-forward plan
- Named responsible operator
- Post-deployment verification steps

### 10.2 Pre-Deployment Checks

Before deployment:

1. Run formatting and lint checks.
2. Run type checks.
3. Run unit tests.
4. Run relevant integration tests.
5. Validate environment variables.
6. Review database migration compatibility.
7. Confirm external provider configuration.
8. Review security-sensitive changes.
9. Confirm observability and alert coverage.
10. Record the release candidate.

### 10.3 Post-Deployment Checks

After deployment:

- Verify process health and readiness.
- Verify database and Redis connectivity.
- Verify critical API routes.
- Verify authentication.
- Verify listing discovery.
- Verify visit and lead workflows.
- Verify payment webhook handling.
- Verify job processing.
- Review error and latency metrics.
- Confirm no unexpected migration or queue failures.
- Record the deployment result.

### 10.4 Rollback

Rollback procedures must distinguish:

- Application rollback
- Configuration rollback
- Database rollback
- Data correction
- Forward-fix migration

Do not automatically roll back a database migration that may have already changed or removed production data. Prefer backward-compatible migrations and controlled forward fixes.

---

## 11. Database Migration Discipline

### 11.1 Migration Rules

All schema changes must be:

- Version-controlled
- Reviewed
- Applied in a deterministic order
- Tested against representative data
- Compatible with the deployment sequence
- Recorded in release documentation

Do not modify applied migrations in place.

### 11.2 Expand-and-Contract Pattern

For risky changes:

1. Add the new structure in a backward-compatible manner.
2. Deploy code that can work with both versions.
3. Backfill data in bounded batches.
4. Validate consistency.
5. Switch reads and writes.
6. Remove obsolete structures only after confirmation.

### 11.3 Migration Safety

Assess:

- Lock duration
- Table size
- Index-build impact
- Backfill load
- Transaction duration
- Rollback or forward-fix plan
- Concurrent application behavior

Critical schema changes require explicit review.

---

## 12. Reconciliation and Consistency Checks

### 12.1 Reconciliation Domains

Implement scheduled reconciliation for appropriate workflows, including:

- Payment provider records versus internal payment records
- Subscription state versus payment outcomes
- Entitlements versus subscription state
- Order state versus payment state
- Settlement totals versus source transactions
- Visit and lead relationship integrity
- Listing publication state versus moderation state
- Rating summaries versus published reviews
- Analytics aggregates versus source events
- Job records versus expected side effects

### 12.2 Reconciliation Rules

A reconciliation process must:

- Be read-only by default.
- Produce a durable report.
- Classify mismatches by severity.
- Avoid silently changing financial or legal records.
- Support controlled remediation.
- Be idempotent.
- Record execution time and source snapshot information.
- Notify authorized operators about critical mismatches.

### 12.3 Remediation

Automatic remediation is permitted only for low-risk, explicitly approved corrections.

Financial, entitlement, ownership, or legal-state corrections require controlled authorization and audit records.

---

## 13. Incident Management

### 13.1 Incident Severity

Define severity levels based on user impact, data integrity, security impact, and duration.

At minimum, distinguish:

- Critical production outage or data-integrity issue
- Major degradation of an important workflow
- Limited feature disruption
- Minor operational issue

The exact labels and response times must be documented by the operating team.

### 13.2 Incident Record

Every critical incident must record:

- Incident identifier
- Start and detection time
- Affected capabilities
- Severity
- Incident owner
- Timeline
- Symptoms
- Root cause or current hypothesis
- Mitigation steps
- Recovery time
- User or data impact
- Communication decisions
- Follow-up actions

### 13.3 Post-Incident Follow-Up

Critical incidents require a documented follow-up containing:

- Root-cause analysis where possible
- Contributing factors
- Detection gaps
- Corrective actions
- Preventive actions
- Assigned owners
- Due dates
- Verification of completion

Avoid blame-oriented documentation. Focus on system conditions and actionable improvements.

---

## 14. Security Hardening

### 14.1 Authentication and Authorization

Verify that:

- Authentication is centralized.
- Authorization is enforced server-side.
- Role and scope checks are applied to every protected operation.
- Tenant, agency, broker, and user boundaries are enforced.
- Administrative actions require explicit permissions.
- Session and token policies follow the shared identity contract.
- Sensitive actions require re-authentication or step-up controls where approved.

### 14.2 Input and Output Security

Apply:

- Schema validation to all external input
- Safe query construction
- Output filtering
- File-upload validation
- Content-type and size limits
- SSRF protections where URLs are fetched
- Path traversal protections
- Safe error responses
- Security headers at the appropriate edge or API layer

### 14.3 Secrets and Configuration

- Keep secrets outside source control.
- Use environment-specific secret management.
- Validate required configuration at startup.
- Rotate credentials according to policy.
- Avoid logging secret values.
- Restrict production access.
- Document emergency credential-revocation procedures.

### 14.4 Abuse Prevention

Apply controls for:

- OTP abuse
- Login brute force
- Review spam
- Listing spam
- Lead or visit flooding
- Export scraping
- Webhook replay
- Payment endpoint abuse
- Administrative endpoint abuse

Rate limits must be appropriate to the actor, endpoint, and business risk.

### 14.5 Dependency and Supply-Chain Hygiene

- Pin or lock dependency versions appropriately.
- Review security advisories.
- Remove unused dependencies.
- Avoid unmaintained packages where practical.
- Review third-party SDK permissions.
- Scan dependencies through the approved tooling.
- Record exceptions and remediation plans.

---

## 15. Critical Workflow Validation

The test strategy must prioritize workflows where failure can cause financial, trust, ownership, or user-impacting harm.

At minimum, validate:

1. OTP request and verification.
2. Login, logout, session expiry, and token rotation.
3. Role and scope enforcement.
4. Listing creation, moderation, and publication.
5. Listing ownership and edit authorization.
6. Visit creation and duplicate prevention.
7. Lead creation and ownership rules.
8. Payment initiation and webhook verification.
9. Subscription state and entitlement updates.
10. Refund and failure handling.
11. Furniture order and payment consistency.
12. Review eligibility and publication.
13. Notification retries and failure handling.
14. Background-job retry and deduplication.
15. CSV export authorization and expiry.
16. Backup restoration and application startup.
17. Reconciliation mismatch detection.
18. Administrative audit logging.

Critical workflows must have automated tests where feasible and documented manual verification where automation is not yet practical.

---

## 16. Operational Runbooks

Create concise runbooks for:

- API unavailable
- Database unavailable
- Redis unavailable
- Queue backlog
- Payment webhook failures
- OTP provider outage
- Notification provider outage
- Failed deployment
- Migration failure
- Backup failure
- Restoration procedure
- Data reconciliation mismatch
- Suspected account compromise
- Suspected data exposure
- Export abuse
- Rate-limit incident
- Critical security alert

Each runbook should include:

- Detection signals
- Immediate safety actions
- Diagnostic commands or dashboard links
- Decision points
- Escalation owner
- Recovery steps
- Verification steps
- Follow-up requirements

Do not include secrets in runbooks.

---

## 17. Production Configuration and Environment Management

Maintain separate configurations for:

- Local development
- Test
- Staging
- Production

Configuration must cover:

- Database connection
- Redis connection
- JWT/session settings
- OTP provider
- Payment provider
- Notification providers
- Object storage
- Job processing
- Rate limits
- Logging
- Metrics
- Feature flags
- CORS and trusted origins
- Allowed hosts
- Backup settings

Use typed configuration parsing and fail fast on invalid required values.

Do not use production credentials in local development or tests.

---

## 18. Release Readiness Checklist

Before commercial launch, verify:

### Application

- [ ] Production build succeeds.
- [ ] Type checks pass.
- [ ] Lint and formatting checks pass.
- [ ] Critical unit and integration tests pass.
- [ ] Critical end-to-end workflows pass.
- [ ] Error responses are stable and documented.
- [ ] Health and readiness checks work.
- [ ] Graceful shutdown works.

### Data

- [ ] Migrations are reviewed and tested.
- [ ] Indexes are present and validated.
- [ ] Seed or configuration data is correct.
- [ ] Backup has succeeded.
- [ ] Restoration test evidence exists.
- [ ] Retention jobs are configured.
- [ ] Reconciliation jobs are configured.

### Security

- [ ] Secrets are externalized.
- [ ] RBAC and scope checks are tested.
- [ ] Rate limits are configured.
- [ ] Sensitive logs are redacted.
- [ ] Dependency security review is complete.
- [ ] Administrative actions are audited.
- [ ] File and export access is protected.

### Operations

- [ ] Dashboards are available.
- [ ] Critical alerts are configured.
- [ ] Runbooks are accessible.
- [ ] Incident owners are assigned.
- [ ] Deployment and rollback procedures are documented.
- [ ] On-call or escalation contacts are known.
- [ ] Monitoring has been tested using controlled failures.

### Product Workflows

- [ ] Authentication works.
- [ ] Listing discovery works.
- [ ] Visit and lead workflows work.
- [ ] Payments and webhooks work.
- [ ] Subscription entitlements work.
- [ ] Furniture workflows work.
- [ ] Reviews and ratings work.
- [ ] Admin moderation works.
- [ ] CSV exports enforce scope and expiry.

---

## 19. Implementation Deliverables

The implementation team must deliver:

- Resilience policy document
- Dependency timeout and retry configuration
- Idempotency and duplicate-protection utilities
- Health and readiness endpoints
- Graceful startup and shutdown behavior
- Structured logging and operational metrics
- Operational dashboards and critical alerts
- Backup and restoration procedures
- Disaster-recovery document
- Deployment checklist
- Migration safety guidelines
- Reconciliation jobs and reports
- Incident template and critical-incident workflow
- Security-hardening checklist
- Dependency and secret-management procedures
- Critical-workflow test suite
- Operational runbooks
- Environment configuration validation
- Production-readiness report
- Updated architecture and operations documentation

---

## 20. Definition of Done

This step is complete only when:

- Critical dependencies have documented timeout, retry, and failure behavior.
- Idempotency and duplicate protection exist for approved high-risk operations.
- Health, readiness, startup, and graceful-shutdown behavior is verified.
- Logs and metrics provide actionable operational context without exposing secrets.
- Critical failures generate actionable notifications to authorized operators.
- Daily backups are configured and monitored.
- Restoration has been tested and documented.
- RPO and RTO are explicitly documented without unsupported claims.
- Deployment safeguards and migration procedures are documented and tested.
- Reconciliation jobs detect important inconsistencies.
- Critical incidents have a documented follow-up process.
- Security hardening checks have been completed.
- Critical workflows have automated or documented validation evidence.
- Runbooks exist for major operational failure scenarios.
- The backend can be assessed against a production-readiness checklist.
- No interface duplicates shared resilience, authorization, validation, logging, or operational logic.

---

## 21. Acceptance Criteria

1. Every outbound dependency call has a bounded timeout.
2. Retries are bounded, classified, jittered, and safe for the operation.
3. Critical side-effecting operations are protected against duplicate execution.
4. Health and readiness endpoints correctly distinguish process liveness from traffic readiness.
5. Graceful shutdown prevents unsafe termination of in-flight work.
6. Structured logs exclude secrets and unnecessary sensitive data.
7. Operational metrics expose API, database, Redis, queue, payment, notification, and reconciliation health.
8. Critical failures produce actionable operator notifications.
9. Backups are stored securely, monitored, and covered by a documented retention policy.
10. At least one restoration test demonstrates that a backup can support application recovery.
11. RPO and RTO targets are documented with their actual supporting mechanisms.
12. Production deployments require reviewed changes, test evidence, migration assessment, and post-deployment verification.
13. Applied migrations are never modified in place.
14. Reconciliation processes produce durable, auditable mismatch reports.
15. Critical incidents receive documented follow-up actions.
16. Authentication, authorization, scope isolation, rate limiting, and secret handling are security-tested.
17. Critical workflows are validated before release.
18. Operational runbooks exist for major failure scenarios.
19. The production-readiness checklist has verifiable evidence for each required item.
20. Shared infrastructure and domain contracts are reused instead of duplicated by interface teams.

---

## 22. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the existing application lifecycle, configuration, plugins, database, Redis, events, observability, and job infrastructure first.
2. Read the architecture, API conventions, security, database, and event-contract documents before changing code.
3. Reuse existing shared utilities and do not create parallel logging, error, validation, authorization, or configuration systems.
4. Implement the smallest reliable operational baseline compatible with the modular-monolith architecture.
5. Make timeout, retry, concurrency, and idempotency behavior explicit and configurable.
6. Do not add automatic destructive remediation.
7. Do not claim near-zero RPO unless the implemented recovery mechanism supports it.
8. Treat database migrations as production changes and test them against representative data.
9. Make reconciliation read-only by default and require authorization for remediation.
10. Add tests for dependency failure, duplicate requests, webhook replay, graceful shutdown, and authorization boundaries.
11. Ensure critical failures are observable and actionable without generating excessive alert noise.
12. Write runbooks for real failure scenarios, not generic placeholders.
13. Keep secrets, personal data, payment details, and identity documents out of logs.
14. Record unresolved operational or security decisions as explicit decisions or blockers.
15. Do not implement interface UI code in this step.
16. Do not mark the step complete until the release-readiness checklist, Definition of Done, and Acceptance Criteria have been verified.
