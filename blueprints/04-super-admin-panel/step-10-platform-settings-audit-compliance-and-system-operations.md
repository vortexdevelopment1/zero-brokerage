# Super Admin Panel Blueprint — Step 10
## Platform Settings, Audit & Compliance, and System Operations

> **Implementation document for Antigravity**
>
> This document defines the Super Admin frontend work for platform configuration, audit/compliance visibility, and operational system controls. It does **not** create a second backend or duplicate business authority. All rules, permissions, mutations, validation, persistence, and side effects remain owned by the Shared Core Backend.

## 1. Objective

Build a secure, permission-aware operational area through which authorized Super Admin operators can:

- Inspect platform configuration and configuration history.
- Review security, compliance, and operational audit records.
- Inspect service health, infrastructure indicators, queue health, and reconciliation status.
- Review backups, restoration evidence, incidents, and release metadata where backend APIs expose them.
- Manage only explicitly approved, low-risk platform settings.
- Initiate controlled operational actions through backend-authorized workflows.
- Preserve traceability for every privileged action.

The interface must prioritize **visibility, safety, reversibility, and auditability** over administrative convenience.

## 2. Mandatory Source and Dependency Review

Before implementation, reread and cross-check:

1. The BRD and SOW supplied for Zero Brokerage.
2. The finalized project decisions and architecture decisions.
3. The complete Shared Core Backend Blueprint, especially:
   - Authentication and authorization.
   - API contracts and error conventions.
   - Events, jobs, notifications, and observability.
   - Payments and financial integrity.
   - Search and ranking.
   - Analytics and reporting.
   - Resilience, security, operations, deployment, and release readiness.
4. Super Admin Steps 1–9.
5. Existing repository conventions under `apps/super-admin`, `packages/*`, and `docs/*`.

### 2.1 Decision precedence

Use this order when a conflict appears:

1. Explicit user-confirmed/finalized project decisions.
2. Approved architecture and security decisions.
3. BRD requirements.
4. SOW requirements, while respecting the finalized modular-monolith decision.
5. Existing shared repository conventions.
6. This blueprint.

If a conflict cannot be resolved without changing scope, stop and record a clarification rather than inventing a new rule.

### 2.2 Architectural reconciliation

The source SOW may describe autonomous microservices, but the finalized implementation baseline is a **modular monolith with one deployable Fastify API initially**. The Super Admin frontend must therefore consume the approved API surface without assuming separate service URLs or independently deployed service backends.

The frontend must never:

- Read PostgreSQL or Redis directly.
- Modify configuration files, queues, or infrastructure directly.
- Recalculate financial, ranking, entitlement, or security decisions locally.
- Bypass backend authorization because an operator has access to a screen.

## 3. Scope of This Step

### 3.1 Included

- Platform settings directory and detail views.
- Safe configuration editing workflows.
- Configuration history and change comparison.
- Audit-log directory, filters, and detail views.
- Security and compliance evidence views.
- Operational health dashboard and service status views.
- Queue/job and reconciliation status views.
- Backup and disaster-recovery evidence views, where supported by APIs.
- Incident and maintenance visibility.
- Release/build metadata visibility.
- Controlled operational-action workflows.
- Permission-aware UI, confirmation, and audit feedback.
- Loading, error, stale-data, empty-state, and degraded-mode UX.
- Automated tests and production-readiness checks.

### 3.2 Explicitly excluded

Do not implement in this step:

- New backend configuration engines.
- Direct database, Redis, cloud, or server access from the browser.
- Arbitrary code execution or shell-command interfaces.
- Direct production deployment from the panel unless a separately approved backend workflow exists.
- Secret-value display or secret editing.
- Unrestricted feature-flag control.
- Destructive bulk deletion.
- A second incident-management backend.
- A second monitoring/metrics pipeline.
- Changes to finalized business rules without an approved change request.

## 4. Product and Safety Principles

### 4.1 Read-only by default

Most operational data is observational. Render controls only when the effective permission set and backend capability allow the action.

### 4.2 Backend authority

The backend remains authoritative for:

- Permission checks.
- Configuration validation.
- Allowed value ranges.
- Dependency checks.
- Rollout and activation rules.
- Audit records.
- Side effects and rollback behavior.

### 4.3 Least privilege

Separate view, edit, approve, execute, and emergency-action permissions. Do not treat a generic `admin` flag as sufficient authorization.

### 4.4 Safe defaults

High-risk controls should be disabled, hidden, or read-only unless explicitly enabled by the backend. The UI must never imply that an action succeeded before receiving a successful API response.

### 4.5 Traceability

Every mutation or operational action must expose:

- What was requested.
- Who requested it.
- When it was requested.
- The resulting status.
- A correlation/request identifier when available.
- The audit-record reference when available.

### 4.6 Privacy and secrecy

Never display passwords, OTPs, access tokens, payment secrets, provider credentials, encryption keys, or unrestricted personal documents. Mask sensitive fields and show only the minimum data required for the operational purpose.

## 5. Information Architecture

Use the existing Super Admin shell and navigation conventions. Suggested routes are:

```text
/admin/settings
/admin/settings/:settingKey
/admin/settings/:settingKey/history
/admin/audit-logs
/admin/audit-logs/:auditId
/admin/compliance
/admin/operations/health
/admin/operations/queues
/admin/operations/reconciliation
/admin/operations/backups
/admin/operations/incidents
/admin/operations/releases
/admin/operations/maintenance
```

The exact route names may follow the existing application convention, but route responsibilities must remain distinct.

## 6. Platform Settings Experience

### 6.1 Settings directory

Provide a searchable, filterable directory of settings exposed by the backend.

Suggested columns:

- Setting name and human-readable description.
- Category.
- Current effective value, masked where necessary.
- Value type.
- Environment or scope.
- Current status: active, pending, disabled, restricted, or unavailable.
- Last modified timestamp.
- Last modified by.
- Required permission.
- Restart/redeployment requirement, if supplied by the API.

Suggested categories:

- Platform behavior.
- User and account policy.
- Listing and moderation policy.
- Notification and provider behavior.
- Subscription and monetization configuration.
- Search and ranking configuration.
- Operational thresholds.
- Security and compliance policy.
- Feature availability.

Do not assume every category is editable.

### 6.2 Setting detail page

Show:

- Setting key and display name.
- Business description.
- Current effective value.
- Proposed value, if a change is in progress.
- Data type and allowed values.
- Validation constraints.
- Scope and affected modules.
- Dependency warnings.
- Whether a restart, approval, or scheduled activation is required.
- Last change and change history.
- Related documentation or decision reference.

### 6.3 Editing workflow

For an editable setting:

1. Load the current backend value.
2. Render a typed control based on the API schema.
3. Explain impact and affected areas.
4. Validate locally for immediate feedback only.
5. Submit the proposed value to the backend.
6. Handle server-side validation as authoritative.
7. Display pending, applied, rejected, or scheduled status.
8. Refresh the authoritative value after completion.
9. Display the audit reference and correlation ID when available.

Do not optimistically mutate the effective setting value.

### 6.4 High-risk configuration

For settings affecting security, payments, public visibility, financial calculations, or broad platform behavior:

- Require explicit confirmation.
- Show before/after values, with secrets masked.
- Show impact and affected modules.
- Require a reason if the API contract supports it.
- Support step-up authentication when required by the backend.
- Use idempotency keys for retriable mutations when supported.
- Show a clear pending state when approval or scheduled activation is involved.

## 7. Configuration History and Comparison

### 7.1 History directory

Provide a chronological list of configuration changes with:

- Setting key.
- Previous value, safely redacted.
- New value, safely redacted.
- Actor.
- Timestamp.
- Reason or change note.
- Status.
- Approval information.
- Correlation ID.
- Audit reference.

### 7.2 Comparison view

Support a readable before/after comparison for non-secret values. For structured JSON values:

- Display a stable formatted representation.
- Highlight added, removed, and changed fields.
- Avoid exposing restricted nested fields.
- Clearly identify values omitted for privacy.

Do not implement client-side rollback by simply resubmitting an old value. If rollback is supported, invoke the dedicated backend rollback capability and show its safeguards.

## 8. Audit and Compliance Workspace

### 8.1 Audit-log directory

Provide a high-volume, server-paginated audit-log view.

Suggested filters:

- Date range.
- Actor/admin.
- Action category.
- Resource type.
- Resource identifier.
- Outcome: success, failure, denied, pending.
- Risk level.
- Source interface or API area.
- Correlation ID.
- IP/device metadata when the backend exposes it and the operator is authorized to view it.

Suggested columns:

- Timestamp.
- Actor.
- Action.
- Resource.
- Outcome.
- Risk level.
- Short description.
- Correlation ID.
- Detail link.

### 8.2 Audit detail page

Show the complete permitted audit record:

- Event ID.
- Timestamp and timezone.
- Actor identity and role.
- Action and outcome.
- Target resource.
- Before/after summary, if available and safe.
- Request/correlation ID.
- Origin metadata.
- Failure reason or denial reason.
- Related event, job, payment, listing, account, or incident references.
- Tamper-evidence or integrity metadata when provided by the backend.

The page must distinguish between:

- An action being requested.
- An action being accepted.
- An action being completed.
- An action being rejected or denied.

### 8.3 Compliance views

Expose only compliance evidence supplied by approved backend APIs, such as:

- Verification-document access history.
- Consent and privacy-policy records.
- Account deletion/retention events.
- Data export requests.
- Access-control changes.
- Security-sensitive administrative actions.
- Payment and refund audit references.
- Incident follow-up status.

Do not display raw identity documents by default. If document access is explicitly supported, use short-lived backend-authorized URLs and an access-audit trail.

### 8.4 Retention and export

If audit export is supported:

- Require the relevant export permission.
- Show the selected filters and estimated scope.
- Prefer asynchronous export jobs for large datasets.
- Display export status and expiry.
- Avoid generating exports containing unnecessary personal data.
- Never create a browser-side unrestricted dump of all audit records.

## 9. Operational Health Dashboard

### 9.1 Purpose

Provide an operational overview without replacing the infrastructure monitoring platform.

### 9.2 Suggested summary cards

Only render metrics returned by the backend, such as:

- API availability status.
- Request latency indicators.
- Error-rate indicators.
- Database health status.
- PostGIS query-health indicators.
- Redis health and cache indicators.
- Background-job health.
- Notification-provider health.
- Payment-provider health.
- Current incidents.
- Last successful backup evidence.
- Reconciliation backlog.

The SOW references uptime, latency, PostGIS, and Redis monitoring. The frontend should display these as reported metrics, not calculate or reinterpret them as a new monitoring system.

### 9.3 Health status model

Support backend-provided statuses such as:

- Healthy.
- Degraded.
- Unavailable.
- Unknown.
- Maintenance.
- Not configured.

Every status must include a timestamp or freshness indicator when available.

### 9.4 Stale-data handling

If health data is stale:

- Show the last updated time.
- Mark the data as stale.
- Avoid presenting stale values as current.
- Offer a controlled refresh.
- Avoid aggressive polling that could worsen an incident.

## 10. Queue, Job, and Reconciliation Operations

### 10.1 Queue/job directory

Where backend APIs expose job operations, show:

- Job ID.
- Job type.
- Queue/category.
- Status.
- Attempt count.
- Created, started, and completed timestamps.
- Next retry time.
- Error summary.
- Related resource or correlation ID.

Support filters for pending, running, completed, failed, dead-lettered, and cancelled states as defined by the API.

### 10.2 Job detail

Show:

- Safe job metadata.
- Current state.
- Retry history.
- Failure summary.
- Related domain object.
- Last event or delivery reference.
- Available backend actions.

Never expose arbitrary job payloads if they contain personal data, secrets, or internal credentials.

### 10.3 Retry and replay safeguards

If retry is supported:

- Use the backend's explicit retry endpoint.
- Explain whether the operation is idempotent.
- Show possible duplicate side effects.
- Require confirmation for externally visible actions.
- Display the new job/action reference.

Do not invent a replay action merely because a failed job is visible.

### 10.4 Reconciliation workspace

Expose backend-provided reconciliation summaries for areas such as:

- Payments and provider records.
- Subscription entitlements.
- Commission and settlement records.
- Notification delivery state.
- Listing/search-index consistency.
- Inventory or furniture-order state.

Show:

- Reconciliation run ID.
- Scope and time window.
- Started/completed time.
- Records inspected.
- Differences found.
- Resolved/unresolved counts.
- Current status.
- Follow-up action references.

Any correction must be initiated through an explicit backend workflow, never through local edits.

## 11. Backups, Disaster Recovery, Incidents, and Releases

### 11.1 Backup evidence

If available, display:

- Backup type.
- Scope.
- Started/completed timestamp.
- Status.
- Storage/location label without exposing credentials.
- Retention metadata.
- Verification or restore-test status.
- RPO/RTO target references.
- Last successful restore test.

Do not present the presence of a backup record as proof that restoration has been tested unless the API explicitly reports a successful test.

### 11.2 Incident directory

Show backend-provided incidents with:

- Incident ID.
- Severity.
- Status.
- Summary.
- Start and resolution times.
- Affected capability.
- Current impact.
- Owner/team label.
- Timeline.
- Follow-up actions.
- Post-incident review status.

The panel may link to an external incident tool if an approved URL is supplied; it must not create a second source of truth.

### 11.3 Maintenance windows

If supported, show scheduled maintenance windows with:

- Scope.
- Start/end time and timezone.
- Affected interfaces.
- Public/internal visibility.
- Status.
- Related incident or change reference.

Any creation or modification must use backend-authorized workflows and require appropriate permission.

### 11.4 Release metadata

Provide read-only release information when exposed:

- Application/API version.
- Build identifier.
- Git commit/reference.
- Deployment timestamp.
- Environment label.
- Migration status.
- Feature-flag/configuration compatibility indicators.

Do not add direct deployment controls unless separately approved and backed by a secure deployment API.

## 12. API Integration Contract

### 12.1 General rules

- Use the shared API client and request-context mechanisms.
- Reuse shared types, validation schemas, error normalization, and permission helpers.
- Use server-side pagination, filtering, sorting, and date ranges.
- Keep query keys deterministic.
- Invalidate affected queries after successful mutations.
- Preserve correlation IDs in error displays and support workflows.
- Handle `401`, `403`, `409`, `422`, `429`, `5xx`, timeout, and network failures consistently.

### 12.2 Suggested capability groups

The exact endpoint names must come from the approved API contract. Organize client capabilities conceptually as:

```text
platformSettings
configurationHistory
auditLogs
complianceEvidence
healthOverview
queueOperations
reconciliationRuns
backupEvidence
incidents
maintenanceWindows
releaseMetadata
operationalActions
```

Do not hardcode endpoint assumptions if the backend contract differs.

### 12.3 Query and cache behavior

- Use short freshness windows for health and operational status.
- Use longer cache windows for immutable audit records and release metadata where appropriate.
- Avoid polling when the page is hidden or the operator lacks permission.
- Make manual refresh explicit.
- Show the timestamp of the data currently rendered.
- Cancel or ignore obsolete requests when filters change.

### 12.4 Mutation handling

For each mutation:

1. Disable duplicate submission.
2. Capture the operator's intent and confirmation state.
3. Send the approved request format.
4. Render the backend response state.
5. Refresh affected resources.
6. Show audit/correlation references.
7. Preserve failure details without leaking internal secrets.

## 13. Permissions and Authorization UX

Define UI capabilities around backend permission identifiers, for example:

- `settings.read`
- `settings.update`
- `settings.approve`
- `audit.read`
- `compliance.read`
- `operations.health.read`
- `operations.jobs.read`
- `operations.jobs.retry`
- `operations.reconciliation.read`
- `operations.reconciliation.execute`
- `operations.backups.read`
- `operations.incidents.manage`
- `operations.maintenance.manage`
- `operations.releases.read`

These names are illustrative until the approved backend permission catalogue is available.

The frontend must:

- Hide or disable unauthorized actions.
- Protect routes and nested actions.
- Handle backend `403` responses even when a control was previously visible.
- Never infer permission from role labels alone.
- Explain restricted access without revealing sensitive information.

## 14. Error, Loading, and Empty-State Requirements

Implement dedicated states for:

- Initial loading.
- Background refresh.
- Partial data availability.
- Stale health information.
- Permission denied.
- Configuration conflict.
- Validation failure.
- Action already in progress.
- Timeout.
- Provider or infrastructure outage.
- No audit records for the selected filters.
- No incidents or no active maintenance windows.
- Unsupported capability in the current environment.

For failed privileged actions, preserve the user's entered form data when safe and provide a retry path only when retry is appropriate.

## 15. Suggested Frontend Structure

Follow the existing Super Admin application structure. A conceptual organization is:

```text
apps/super-admin/src/
├── app/
│   └── admin/
│       ├── settings/
│       ├── audit-logs/
│       ├── compliance/
│       └── operations/
├── features/
│   ├── platform-settings/
│   ├── audit-compliance/
│   ├── health-operations/
│   ├── reconciliation/
│   └── incidents-releases/
├── components/
│   ├── settings/
│   ├── audit/
│   ├── operations/
│   └── privileged-actions/
└── lib/
    ├── api/
    ├── permissions/
    ├── query-keys/
    └── formatting/
```

### 15.1 State separation

Separate:

- Authentication/session state.
- Effective permission state.
- Server state and cache.
- Form state.
- Confirmation-dialog state.
- Local display preferences.
- Long-running action state.

Do not store secrets or unrestricted audit payloads in persistent client storage.

## 16. Accessibility and UX Requirements

- Every setting control must have a meaningful label and help text.
- Status indicators must not rely on color alone.
- Tables must support keyboard navigation and readable headers.
- Confirmation dialogs must identify the exact action and target.
- Focus must move predictably after dialogs, errors, and route changes.
- Long values such as IDs and correlation IDs must be copyable and readable.
- Dates, times, and timezones must be explicit.
- Sensitive values must remain masked by default.
- Charts or status summaries must have text alternatives.

## 17. Security and Privacy Requirements

- Enforce server-side authorization for every read and mutation.
- Use secure session handling from Step 3.
- Avoid URL parameters containing sensitive values.
- Do not log tokens, secrets, raw documents, or unnecessary personal data in the browser.
- Sanitize any backend-provided rich text before rendering.
- Protect against XSS through safe rendering and approved components.
- Avoid exposing internal stack traces or infrastructure details to unauthorized operators.
- Apply confirmation and step-up requirements for high-risk actions.
- Preserve audit references for all privileged operations.
- Respect data-retention, deletion, and privacy decisions from the Shared Core Backend.

## 18. Testing Requirements

### 18.1 Unit tests

Test:

- Permission-to-capability mapping.
- Setting-value formatting and masking.
- Before/after comparison rendering.
- Status and freshness interpretation.
- Risk-level and action-confirmation rules.
- Query-key generation.
- Error normalization.
- Sensitive-field redaction.

### 18.2 Component and integration tests

Test:

- Settings list, detail, edit, and history flows.
- Server-side filtering and pagination.
- Audit-log search and detail rendering.
- Compliance evidence access restrictions.
- Health dashboard refresh and stale-data behavior.
- Queue/job detail and retry handling.
- Reconciliation status display.
- Incident and maintenance views.
- Permission changes reflected without a full application restart.

### 18.3 Security tests

Verify that:

- Unauthorized users cannot access protected routes.
- Hidden controls cannot bypass backend authorization.
- Secret fields remain masked.
- Restricted audit fields are not rendered.
- Backend `403` and expired-session responses are handled correctly.
- Dangerous actions require the expected confirmation/step-up flow.
- Query parameters and error messages do not leak sensitive information.

### 18.4 End-to-end tests

Cover at least:

1. Authorized operator views platform settings.
2. Operator edits a low-risk setting successfully.
3. Invalid configuration is rejected by the backend and shown clearly.
4. High-risk setting requires the correct safeguards.
5. Operator searches and opens an audit record.
6. Unauthorized operator cannot access compliance evidence.
7. Health dashboard displays stale data honestly.
8. Failed job retry produces a backend-tracked result.
9. Reconciliation results are displayed without local correction.
10. Operational action failure displays a correlation reference.

## 19. Definition of Done

This step is complete only when:

- The operational routes are integrated into the existing Super Admin shell.
- All displayed data comes from approved backend APIs.
- Settings are read-only unless explicitly editable by the backend contract.
- High-risk operations have appropriate confirmation and permission checks.
- Audit and compliance data is privacy-filtered.
- Health and operational data exposes freshness and degraded states.
- No direct infrastructure or database access exists in the frontend.
- Shared API, error, permission, and design-system conventions are reused.
- Automated tests cover the critical flows.
- Documentation identifies unsupported capabilities instead of inventing them.

## 20. Acceptance Criteria

- An authorized operator can inspect available platform settings and their current status.
- The operator can edit only settings permitted by the backend.
- The UI clearly distinguishes proposed, pending, applied, rejected, and scheduled changes.
- Configuration history supports traceable before/after inspection without exposing secrets.
- Audit logs support server-side filtering, pagination, and detail inspection.
- Compliance evidence is permission-gated and privacy-conscious.
- Health metrics display backend-reported status and freshness.
- Queue, reconciliation, backup, incident, and release views do not claim capabilities that the API does not provide.
- Retry or operational actions are backend-driven, guarded, and auditable.
- Unauthorized or stale requests cannot silently overwrite current data.
- The implementation does not duplicate Shared Core Backend business logic.

## 21. Deliverables

1. Platform settings directory and detail screens.
2. Safe setting-edit and confirmation components.
3. Configuration history and comparison views.
4. Audit-log directory and detail screens.
5. Compliance evidence views.
6. Operational health dashboard.
7. Queue/job and reconciliation views.
8. Backup, incident, maintenance, and release views where supported.
9. Permission-aware action guards.
10. API client integration, query keys, and error handling.
11. Unit, integration, security, and E2E tests.
12. Documentation of backend capabilities, unsupported actions, and assumptions.

## 22. AI IDE Execution Instructions

Antigravity must:

1. Inspect the current repository before changing files.
2. Read the existing Super Admin Steps 1–9 and shared API/design conventions.
3. Reuse existing components, layouts, hooks, query clients, permission utilities, and error handling.
4. Search for an existing implementation before creating a new abstraction.
5. Implement read-only views first, then explicitly supported mutations.
6. Never create mock backend endpoints as if they were production contracts.
7. If an endpoint or permission is missing, create a typed integration boundary or documented placeholder rather than inventing backend behavior.
8. Keep sensitive values masked and avoid browser persistence of privileged data.
9. Add tests for every privileged action and failure path.
10. Run lint, type-check, unit tests, and relevant E2E tests before declaring completion.
11. Report changed files, API assumptions, unresolved dependencies, and test results.

### 22.1 Stop conditions

Stop and request clarification if:

- A proposed setting changes a finalized business rule.
- The backend does not expose the required permission or mutation contract.
- A workflow would require direct database, Redis, cloud, or deployment access.
- A feature would expose secrets or raw personal documents.
- A retry/replay action could create an unbounded duplicate financial or external side effect.
- The requested behavior conflicts with the Shared Core Backend Blueprint.

## 23. Dependency Boundary with Other Blueprint Steps

### Depends on

- Step 1: scope, boundaries, and implementation contract.
- Step 2: shell, navigation, and layout.
- Step 3: admin identity, permissions, and secure sessions.
- Step 4: entity governance and verification.
- Step 5: listing moderation and publication.
- Step 6: visits, leads, and workflow governance.
- Step 7: financial and subscription oversight.
- Step 8: analytics and urgent requirements.
- Step 9: notifications and delivery operations.
- Shared Core Backend: configuration, audit, observability, jobs, reconciliation, security, and operations APIs.

### Must not duplicate

- Backend configuration persistence or validation.
- Permission evaluation.
- Audit-event creation.
- Monitoring, job, reconciliation, backup, or incident engines.
- Financial, listing, identity, notification, or entitlement business logic.

### Provides to later steps

- A consistent operational-control surface.
- Shared privileged-action patterns.
- Reusable audit, status, freshness, and confirmation components.
- Operational context for final integration and release-readiness work.

## 24. Final Implementation Rule

Build the Super Admin operational workspace as a **secure control and observability interface**, not as an alternative backend. The UI may request, display, and track authorized operations; only the Shared Core Backend may validate, execute, persist, and audit them.
