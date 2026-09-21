# Super Admin Panel Blueprint — Step 9: Notifications, Engagement, and Delivery Operations

**Document type:** Interface implementation blueprint  
**Interface:** Super Admin Panel (`apps/super-admin`)  
**Project:** Zero Brokerage / VortexCubes Real Estate & Commercial Asset Network  
**Implementation target:** Next.js + TypeScript + Tailwind CSS + approved component and data-fetching libraries  
**Primary dependency:** Shared Core Backend Blueprint, Steps 1–12  
**Related interface steps:** Super Admin Steps 1–8  
**Status:** Implementation instruction document

> This document specifies the Super Admin frontend for notification-template administration, delivery monitoring, engagement operations, and approved communication workflows. It does **not** implement notification dispatch, provider integrations, audience-selection algorithms, queues, retries, consent enforcement, or message-delivery business logic. Those responsibilities remain in the Shared Core Backend.

---

## 1. Objective

Build a secure and auditable operations interface that allows authorized administrators to:

1. View and manage notification templates exposed by the backend.
2. Inspect supported notification channels, event types, and delivery states.
3. Monitor notification delivery health and provider failures.
4. Review individual notification attempts and their lifecycle.
5. Manage approved audience segments or campaign definitions where those capabilities are explicitly exposed by the API.
6. Review engagement metrics without exposing unnecessary personal data.
7. Safely preview communication content before an approved change is submitted.
8. Distinguish transactional notifications from optional engagement communications.
9. Trace a notification from its originating event to its delivery result.
10. Handle partial outages, delayed jobs, duplicate attempts, and provider errors through clear operational UI.

The frontend must provide operational visibility while preserving backend authority, consent rules, privacy controls, and auditability.

---

## 2. Mandatory Source and Dependency Review

Before implementation, the AI IDE must inspect and respect:

- `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
- `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
- All finalized project decisions and decision records.
- Shared Core Backend Blueprint Steps 1–12.
- Super Admin Blueprint Steps 1–8.
- Existing API contracts, shared types, permission definitions, event contracts, notification contracts, observability conventions, and error formats.
- Existing repository structure under `apps/super-admin` and shared packages.

### 2.1 Decision precedence

Apply the following precedence whenever information appears inconsistent:

1. Explicitly finalized project decisions.
2. Approved repository contracts, migrations, and implemented backend behavior.
3. Shared Core Backend Blueprint.
4. Super Admin Blueprint Steps 1–8.
5. BRD and SOW requirements that remain in scope.
6. Unresolved items must be surfaced as implementation blockers; do not invent backend behavior.

### 2.2 Architectural reconciliation

The SOW describes a microservices-oriented target architecture, while the finalized initial implementation uses a modular monolith exposed through one Fastify API. The Super Admin frontend must consume the approved API boundary and must not assume separate notification-service URLs.

The SOW references WhatsApp, SMS, push notifications, and event-driven communication. The frontend may display and configure only channels and operations explicitly supported by the backend. It must not directly call WhatsApp, SMS, email, push, or payment providers.

### 2.3 Responsibility boundary

The backend owns:

- Event-to-notification mapping.
- Recipient resolution.
- Consent and preference enforcement.
- Template rendering and variable validation.
- Provider credentials and integrations.
- Queueing, retries, idempotency, rate limits, and dead-letter handling.
- Delivery-state transitions.
- Notification suppression and deduplication.
- Data retention and privacy enforcement.
- Campaign eligibility and scheduling rules.

The Super Admin frontend owns:

- Displaying approved notification data.
- Permission-aware controls.
- Template editing forms where supported.
- Human-readable previews using backend-provided preview contracts.
- Operational filters and drill-downs.
- Safe action confirmation and result handling.
- Audit-friendly presentation.

---

## 3. Scope of This Step

### 3.1 Included

- Notifications and Engagement navigation area.
- Notification template directory.
- Template detail and edit experience, if enabled by permissions and API capability.
- Template version and status presentation.
- Supported channel and event metadata.
- Template preview workflow.
- Delivery monitoring dashboard.
- Notification delivery-attempt directory.
- Delivery-attempt detail and traceability.
- Provider-health and failure summaries.
- Retry, replay, suppress, or acknowledge actions only when explicitly exposed by the backend.
- Audience segment directory and detail views where supported.
- Campaign or sequence overview where supported and approved.
- Engagement metrics and privacy-safe summaries.
- Export initiation for authorized operational reports.
- Loading, empty, stale, partial-data, and unavailable states.
- Audit history for notification-management actions.
- Unit, component, integration, security, and end-to-end tests.

### 3.2 Explicitly excluded

Do not implement in this step:

- Notification provider integrations.
- Direct calls to WhatsApp, SMS, email, or push providers.
- New notification event contracts.
- Recipient-selection algorithms.
- Consent or preference logic in the frontend as a substitute for backend enforcement.
- Queue workers, retry workers, or dead-letter processing.
- Template rendering engines.
- Campaign automation engines.
- Marketing attribution algorithms.
- Unapproved bulk messaging tools.
- Arbitrary SQL, Redis, or database access from the frontend.
- Bypassing permission checks through hidden UI controls.
- Exposing raw phone numbers, email addresses, or sensitive user data by default.

---

## 4. Product and Safety Principles

### 4.1 Transactional versus engagement communication

Every notification record and template must visibly identify its communication category when the backend provides it:

- **Transactional:** Required for a platform workflow, such as OTP, visit updates, payment status, account-security events, or important operational notices.
- **Service:** Related to platform activity, such as listing updates, lead status, or account events.
- **Engagement/marketing:** Optional communications subject to consent, preferences, applicable policy, and backend eligibility rules.

The UI must not imply that an administrator can override user consent or legally required suppression rules.

### 4.2 Backend is the source of truth

The frontend must not locally infer whether a message was sent, delivered, read, failed, retried, or suppressed. It must render backend states and timestamps.

### 4.3 No silent destructive actions

Actions that can affect many recipients, disable a template, replay a notification, or change a communication workflow require:

- Explicit permission.
- Clear impact explanation.
- Confirmation appropriate to risk.
- Idempotency-aware request handling.
- Visible result or failure state.
- Audit metadata where supplied by the backend.

### 4.4 Privacy by default

Use masked identifiers and aggregate metrics by default. Reveal personal contact information only when:

- The backend returns it for the administrator's permission scope.
- The purpose is operationally justified.
- The UI clearly communicates the sensitivity.
- Access is auditable where required.

### 4.5 Operational truthfulness

Do not label a notification as “successful” merely because an API request was accepted. Distinguish at least:

- Accepted/queued.
- Processing.
- Sent to provider.
- Delivered.
- Read, if supported.
- Failed.
- Suppressed.
- Expired.
- Cancelled.
- Unknown or unavailable.

Only display states actually supported by the backend contract.

---

## 5. Information Architecture

Add or refine the following area under the existing permission-aware application shell:

```text
Notifications & Engagement
├── Overview
├── Templates
│   ├── Template Directory
│   ├── Template Details
│   ├── Drafts / Versions
│   └── Preview
├── Delivery Operations
│   ├── Delivery Attempts
│   ├── Failed Deliveries
│   ├── Provider Health
│   └── Processing Delays
├── Audience and Engagement
│   ├── Segments
│   ├── Campaigns / Sequences
│   └── Engagement Insights
└── Audit History
```

The final enabled routes must depend on:

- Effective administrator permissions.
- Backend feature flags.
- Available API capabilities.
- Current product scope.
- Environment configuration.

A route must not appear merely because a page component exists.

### 5.1 Suggested routes

Use the project's established route conventions. A possible route structure is:

```text
/notifications
/notifications/templates
/notifications/templates/[templateId]
/notifications/deliveries
/notifications/deliveries/[deliveryId]
/notifications/providers
/notifications/segments
/notifications/campaigns
/notifications/insights
/notifications/audit
```

Do not create routes for unsupported backend capabilities. If a capability is deferred, show a controlled “Not enabled” or “Not available” state rather than a fake workflow.

---

## 6. Notifications Overview Dashboard

### 6.1 Purpose

Provide a concise operational view of the notification system without pretending to be an infrastructure monitoring replacement.

### 6.2 Suggested summary cards

Render only metrics supplied by the backend, such as:

- Notifications accepted in the selected period.
- Delivery success rate.
- Failure count and failure rate.
- Suppressed notification count.
- Pending or processing count.
- Average or percentile delivery delay, if available.
- Provider incidents currently affecting delivery.
- Templates requiring review or attention.
- Unresolved delivery exceptions.

Every metric must include:

- Time range.
- Data freshness timestamp.
- Metric definition or tooltip.
- Scope and filters.
- Link to an authorized drill-down where available.

### 6.3 Dashboard panels

Include configurable panels for:

1. Delivery-state distribution.
2. Delivery volume over time.
3. Failure reasons.
4. Channel distribution.
5. Provider health summary.
6. Event-type distribution.
7. Delayed-processing queue summary.
8. Recent operational incidents.
9. Templates with recent failure spikes.

Charts must support accessible tabular alternatives and must not rely on color alone to communicate state.

### 6.4 Dashboard limitations

If metrics are delayed, aggregated, sampled, or eventually consistent, show that fact near the metric. Do not present delayed analytics as real-time data.

---

## 7. Notification Template Directory

### 7.1 Objective

Allow authorized administrators to discover and inspect notification templates without exposing implementation internals unnecessarily.

### 7.2 Suggested columns

Use backend-supported fields such as:

- Template name or human-readable label.
- Template identifier.
- Event type.
- Communication category.
- Supported channel.
- Locale or language.
- Current status.
- Active version.
- Last updated timestamp.
- Updated by, if provided.
- Recent delivery-health indicator, if provided.
- Required review flag, if provided.

### 7.3 Filters

Support only filters represented by the API contract, potentially including:

- Search by name or identifier.
- Channel.
- Event type.
- Communication category.
- Locale.
- Status.
- Version state.
- Review state.
- Updated date range.

Use server-side pagination and filtering for large datasets.

### 7.4 Status presentation

Use explicit labels such as:

- Draft.
- Pending review.
- Approved.
- Active.
- Disabled.
- Archived.
- Rejected.
- Deprecated.

Do not invent transitions. The UI should render only backend-supported actions for the current state.

### 7.5 Template directory behavior

The page must provide:

- Searchable and filterable table.
- Pagination or bounded loading.
- Column visibility controls if consistent with the shared UI system.
- Saved filters only if the application already supports them.
- Deep links to template details.
- Clear empty state.
- Retry state.
- Permission-denied state.
- Export action only if authorized and supported.

---

## 8. Template Detail and Editing Experience

### 8.1 Detail sections

A template detail page should separate:

1. Identity and metadata.
2. Event and trigger information.
3. Communication category.
4. Supported channels.
5. Locales and variants.
6. Variables/placeholders.
7. Current content or provider-approved representation.
8. Version history.
9. Status and lifecycle actions.
10. Recent delivery health.
11. Audit history.

### 8.2 Read-only by default

The default experience should be read-only. Editing controls must appear only when:

- The administrator has the specific permission.
- The backend supports the operation.
- The template is in an editable state.
- Required review or approval rules can be represented correctly.

### 8.3 Editing rules

The frontend must:

- Use a typed form model.
- Display immutable fields as read-only.
- Clearly distinguish content from metadata.
- Display allowed variables from the backend contract.
- Prevent accidental removal of required variables at the UI level where practical.
- Still rely on backend validation as the final authority.
- Preserve unsaved changes warnings.
- Prevent duplicate submissions while a mutation is pending.
- Display field-level and form-level errors.
- Show a confirmation summary before high-impact changes.

Do not implement a client-side template parser or provider-specific validation unless the shared codebase explicitly provides one.

### 8.4 Versioning

If the backend supports versioning, display:

- Version identifier.
- Status.
- Created timestamp.
- Created by.
- Review or approval state.
- Activation timestamp.
- Superseded or archived information.

Version activation must be a backend-controlled action. The frontend must not assume that saving a draft activates it.

### 8.5 Preview workflow

A preview should use a backend-provided preview contract or a safe shared rendering utility. It must:

- Identify the selected channel and locale.
- Display sample values clearly as sample data.
- Warn when rendering is approximate.
- Never send a real notification unless the backend exposes an explicitly authorized test-send operation.
- Require additional confirmation for any real test delivery.
- Avoid exposing real recipient data in sample previews.

### 8.6 Template lifecycle actions

Potential actions include:

- Create draft.
- Edit draft.
- Submit for review.
- Approve.
- Reject with reason.
- Activate.
- Disable.
- Archive.
- Restore.

Implement only actions returned by the backend's capability or transition contract. Every action must show the resulting state returned by the API.

---

## 9. Delivery Operations

### 9.1 Delivery-attempt directory

Build a server-driven table for operational inspection of notification attempts.

Suggested columns:

- Attempt or notification ID.
- Event type.
- Template identifier.
- Communication category.
- Channel.
- Recipient reference, masked where applicable.
- Current delivery state.
- Provider or integration name, if exposed.
- Attempt count, if exposed.
- Created timestamp.
- Last state-change timestamp.
- Failure category or reason summary.
- Correlation ID or trace reference, if authorized.

### 9.2 Delivery filters

Potential filters include:

- Notification or attempt ID.
- Event type.
- Template.
- Channel.
- Delivery state.
- Provider.
- Failure category.
- Communication category.
- Created date range.
- Updated date range.
- Correlation ID.

Only send filters supported by the API. Normalize dates according to the shared API convention.

### 9.3 Delivery detail page

Display a chronological timeline when the backend supplies event history:

```text
Originating event
      ↓
Notification created
      ↓
Recipient resolved
      ↓
Queued
      ↓
Processing
      ↓
Provider submission
      ↓
Delivered / Failed / Suppressed / Expired
```

The timeline must not fabricate missing intermediate events. If the backend returns only a subset of transitions, display only those transitions and label the history as partial when appropriate.

### 9.4 Failure details

Display:

- Human-readable failure summary.
- Backend error category.
- Provider error code, if safe to expose.
- Retryability classification, if provided.
- Number of attempts.
- Last attempted timestamp.
- Next retry timestamp, if scheduled.
- Correlation ID.
- Suggested operational next step, if supplied by the backend.

Do not expose provider secrets, authorization headers, full request payloads, or sensitive message bodies by default.

### 9.5 Operational actions

Possible actions may include:

- Retry.
- Replay.
- Cancel pending delivery.
- Mark as acknowledged.
- Suppress future related notifications.
- Open related user, broker, agency, listing, visit, lead, payment, or support record.

These actions must be implemented only when the backend explicitly supports them. High-impact or potentially duplicate-producing actions require confirmation and idempotency-safe mutation handling.

### 9.6 Retry and replay distinction

The UI must clearly distinguish:

- **Retry:** Continue the existing delivery workflow according to backend rules.
- **Replay:** Create or trigger a new delivery attempt or notification workflow.

Never label replay as retry. If the backend does not distinguish them, use the backend's exact terminology and document the limitation in the UI where necessary.

---

## 10. Provider Health and Delivery Incidents

### 10.1 Purpose

Provide a focused view of communication-provider health using backend-provided status and observability data.

### 10.2 Provider summary

For each exposed provider or channel, display:

- Provider/channel name.
- Current status.
- Last successful activity, if available.
- Recent failure rate.
- Current incident or degradation flag.
- Queue or processing delay, if available.
- Last checked timestamp.
- Scope of impact.
- Related operational incidents.

Do not expose credentials, tokens, webhook secrets, or internal infrastructure details that are not intended for the admin role.

### 10.3 Incident presentation

An incident card should contain:

- Incident title.
- Severity.
- Affected channel/provider.
- Start time.
- Current status.
- Impact summary.
- Last update.
- Related metrics.
- Linked audit or incident record.

The frontend must not declare an incident resolved unless the backend reports that state.

### 10.4 Alert boundaries

The Super Admin panel may display backend-generated operational alerts. It must not independently create incident severity, calculate outage status, or page external responders unless such functionality is explicitly part of an approved API contract.

---

## 11. Audience Segments and Engagement Operations

### 11.1 Capability gating

Audience segments, campaigns, and sequences are optional capabilities. Build them only if the backend exposes approved contracts and the project scope explicitly enables them.

If unavailable, provide a clear disabled-state explanation rather than a nonfunctional page.

### 11.2 Segment directory

Where supported, display:

- Segment name.
- Segment identifier.
- Purpose or description.
- Eligibility definition summary.
- Approximate audience size, if supplied.
- Consent or eligibility status summary.
- Last calculated timestamp.
- Owner or creator.
- Status.
- Last updated timestamp.

Do not expose raw audience membership by default.

### 11.3 Segment detail

Show:

- Human-readable segment description.
- Backend-defined criteria summary.
- Estimated or exact count, clearly labelled.
- Last refresh timestamp.
- Supported channels.
- Consent and eligibility summary.
- Linked campaigns or uses, if available.
- Audit history.

Do not let the frontend invent or execute arbitrary audience queries.

### 11.4 Campaign or sequence overview

If enabled, provide read-only or permission-aware views for:

- Campaign/sequence name.
- Objective.
- Status.
- Audience reference.
- Channel.
- Start and end dates.
- Schedule summary.
- Delivery and engagement metrics.
- Approval state.
- Owner.
- Last updated timestamp.

Campaign creation, scheduling, activation, pausing, and cancellation must remain backend-controlled.

### 11.5 Bulk communication safeguards

Any capability that can reach multiple recipients must display:

- Estimated audience size.
- Communication category.
- Consent/eligibility status summary.
- Channels involved.
- Expected timing.
- Impact warning.
- Required permission.
- Confirmation step.
- Backend-generated operation ID after submission.
- Result status and audit reference, if available.

Never provide an unrestricted “send to all users” control.

---

## 12. Engagement Insights

### 12.1 Approved metrics

Display only metrics returned by approved analytics APIs, potentially including:

- Accepted notification volume.
- Delivery rate.
- Read rate where supported.
- Click or interaction rate where supported.
- Opt-out or suppression rate.
- Failure rate by channel.
- Engagement by event type.
- Engagement by communication category.
- Trend comparisons.
- Campaign-level results.

Metrics must include definitions and time boundaries.

### 12.2 Privacy requirements

Do not display:

- Raw message content in aggregate dashboards.
- Personal contact details in charts.
- Small-cell data that could expose an individual, unless explicitly authorized and required.
- Sensitive user attributes that are not necessary for the operational purpose.

Use aggregation, masking, minimum-count thresholds, and backend-provided privacy controls where available.

### 12.3 Data freshness

Every analytics panel must show:

- Last updated timestamp.
- Selected date range.
- Whether data is live, delayed, sampled, or estimated.
- A partial-data warning when applicable.

---

## 13. API Integration Contract

### 13.1 General rules

- Use the shared API client and request-context conventions.
- Do not create direct `fetch` calls scattered across page components.
- Keep endpoint paths, DTOs, status enums, and error codes in typed integration modules.
- Use server-side pagination for large lists.
- Use abort/cancellation support where the existing client supports it.
- Avoid duplicate requests caused by unstable query keys or unnecessary remounts.
- Never send secrets or provider credentials from the browser.
- Treat all API responses as untrusted input and validate them at the integration boundary when required by the project conventions.

### 13.2 Suggested API capability groups

Use actual repository contracts instead of inventing endpoint names. The frontend may require capability groups equivalent to:

```text
Notification overview
Notification templates
Template versions and lifecycle transitions
Template previews
Delivery attempts
Delivery-attempt timeline
Provider health
Delivery exceptions
Audience segments
Campaigns or sequences
Engagement analytics
Notification exports
Notification audit history
```

### 13.3 Query keys

Use stable query keys containing all server-relevant dimensions, such as:

```text
notifications.overview(filters)
notifications.templates(filters, pagination)
notifications.template(templateId)
notifications.templateVersions(templateId)
notifications.deliveries(filters, pagination)
notifications.delivery(deliveryId)
notifications.providerHealth(filters)
notifications.segments(filters, pagination)
notifications.campaigns(filters, pagination)
notifications.engagement(filters)
notifications.audit(filters, pagination)
```

These are conceptual query-key examples, not permission to invent API endpoints or data models.

### 13.4 Mutation handling

For every mutation:

1. Disable duplicate submission.
2. Show pending state.
3. Preserve the user's entered values on validation failure.
4. Display backend field errors where available.
5. Invalidate or update affected queries using the shared data-fetching strategy.
6. Show the authoritative response state.
7. Surface correlation or operation IDs when useful.
8. Never show success before the API confirms success.

### 13.5 Concurrency and stale data

If a template, delivery record, campaign, or segment can be changed by another administrator:

- Display `updatedAt` or version information when available.
- Handle conflict responses explicitly.
- Offer refresh and safe retry.
- Do not overwrite newer server state silently.
- Preserve unsaved local edits when possible.

---

## 14. Permissions and Authorization UX

### 14.1 Permission categories

Use the actual permission registry. Potential capability categories include:

- View notification overview.
- View templates.
- Create or edit template drafts.
- Submit templates for review.
- Approve or activate templates.
- Disable or archive templates.
- View delivery attempts.
- Retry or replay deliveries.
- View provider health.
- View audience segments.
- Manage campaigns.
- Export notification reports.
- View notification audit history.

### 14.2 UI enforcement

The frontend must:

- Hide unavailable navigation items.
- Disable unavailable actions where contextual visibility is useful.
- Explain permission denial without leaking restricted data.
- Prevent actions from being sent when the permission is absent.
- Handle server-side `401`, `403`, and policy-specific errors.

UI permission checks are usability controls only. Backend authorization remains authoritative.

### 14.3 High-risk operations

Require an appropriate confirmation pattern for:

- Activating or disabling a template.
- Replaying a notification.
- Retrying a large set of failures.
- Activating or stopping a campaign.
- Changing a communication workflow that may affect many users.
- Exporting personal or operational data.

The confirmation should state the exact target, scope, expected impact, and irreversible or duplicate-delivery risks.

---

## 15. Error, Loading, and Empty-State Requirements

Implement explicit states for:

- Initial loading.
- Background refresh.
- Empty result set.
- No filters matched.
- Permission denied.
- Authentication expiry.
- Validation failure.
- Rate limiting.
- Conflict/stale version.
- Network failure.
- Provider data unavailable.
- Partial dashboard data.
- Export queued.
- Export failed.
- Mutation succeeded but follow-up refresh failed.

Examples of appropriate messaging:

- “No delivery attempts match these filters.”
- “Delivery metrics are temporarily unavailable. Last successful update: …”
- “This template changed since you opened it. Refresh before saving.”
- “The backend accepted the operation, but the final delivery result is still pending.”

Avoid vague messages such as “Something went wrong” when a safe, useful error category is available.

---

## 16. Suggested Frontend Structure

Follow the repository's existing conventions. A possible feature-oriented structure is:

```text
apps/super-admin/src/
├── app/
│   └── (authenticated)/
│       └── notifications/
│           ├── page.tsx
│           ├── templates/
│           ├── deliveries/
│           ├── providers/
│           ├── segments/
│           ├── campaigns/
│           ├── insights/
│           └── audit/
├── features/
│   └── notifications/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── schemas/
│       ├── types/
│       ├── permissions.ts
│       ├── formatters.ts
│       └── constants.ts
├── components/
│   ├── data-table/
│   ├── status-badge/
│   ├── confirmation-dialog/
│   ├── audit-timeline/
│   └── privacy-masked-value/
└── lib/
    ├── api/
    ├── auth/
    ├── query/
    └── errors/
```

Do not duplicate shared components or create a second API client. Reuse the existing app shell, permission hooks, error boundary, table primitives, form system, and notification/toast system.

### 16.1 State separation

Separate:

- **Server state:** Templates, delivery attempts, provider health, segments, campaigns, analytics, audit records.
- **Local UI state:** Dialog visibility, selected rows, expanded timeline items, preview mode, unsaved form values.
- **URL state:** Search, filters, pagination, date range, selected tab, and deep-linkable view state where appropriate.
- **Session/auth state:** Current administrator and effective capabilities.

Do not store large server datasets in a global client store unless the existing architecture explicitly requires it.

---

## 17. Accessibility and UX Requirements

The implementation must include:

- Keyboard-accessible tables, filters, forms, dialogs, and menus.
- Visible focus indicators.
- Correct labels for all controls.
- Accessible status announcements for mutation results.
- Non-color indicators for delivery states and severity.
- Sufficient contrast.
- Screen-reader-friendly chart summaries or tables.
- Confirmation dialogs that clearly identify the action and target.
- Logical tab order.
- Responsive layouts for supported desktop and tablet widths.
- Readable timestamps with timezone context.
- Masked data that remains understandable to assistive technologies.

Do not rely on hover-only explanations for critical information.

---

## 18. Security and Privacy Requirements

- Do not place provider secrets, API keys, webhook secrets, or credentials in client code.
- Do not log message bodies, OTPs, access tokens, or sensitive recipient data in browser logs.
- Mask contact information by default.
- Avoid rendering sensitive data into URLs.
- Do not cache restricted records beyond the existing security policy.
- Clear sensitive local state on sign-out or session expiration.
- Respect server-provided redaction and field-visibility rules.
- Treat exported files as sensitive when they contain operational or personal data.
- Require confirmation before exporting sensitive datasets.
- Prevent unauthorized access through direct URL navigation.
- Handle session expiry without losing unsaved content where feasible.
- Do not use local UI state to override backend consent, suppression, or authorization decisions.

---

## 19. Testing Requirements

### 19.1 Unit tests

Test:

- Delivery-state label and severity mapping.
- Channel and communication-category formatters.
- Masking utilities.
- Date/time formatting.
- Filter serialization and deserialization.
- Permission-to-action mapping.
- Confirmation-summary generation.
- Error-code-to-message mapping.
- Template variable display helpers.

### 19.2 Component tests

Test:

- Template directory filtering and pagination.
- Template detail read-only and editable states.
- Preview modal behavior.
- Version history rendering.
- Delivery timeline rendering with missing events.
- Failure detail presentation.
- Provider-health cards.
- Permission-aware action visibility.
- Bulk-action confirmation safeguards.
- Empty, loading, error, and stale-data states.
- Privacy masking and reveal behavior.

### 19.3 Integration tests

Test:

- Correct query parameters and request payloads.
- Correct handling of backend validation errors.
- Correct cache invalidation after template mutations.
- Conflict response behavior.
- Delivery detail drill-down.
- Export initiation and status polling, if supported.
- Unauthorized and forbidden responses.
- Partial dashboard responses.
- Retry/replay action result handling.

### 19.4 Security tests

Verify that:

- Restricted routes cannot be accessed by URL without permission.
- Restricted actions cannot be triggered through the UI.
- Sensitive fields are masked when required.
- Provider credentials never reach the browser.
- Sensitive values are not written to logs.
- Stale permissions do not allow unsafe mutations.
- Session expiry clears restricted state.
- Bulk-action controls do not permit accidental unbounded targeting.

### 19.5 End-to-end tests

Cover at least:

1. Authorized administrator opens the notification overview.
2. Administrator filters delivery attempts by channel and status.
3. Administrator opens a delivery detail and views its timeline.
4. Administrator with read-only access cannot edit a template.
5. Authorized administrator edits a draft and receives backend validation feedback.
6. Administrator previews a template with safe sample data.
7. Authorized administrator submits a supported lifecycle action and sees the authoritative result.
8. Administrator attempts a replay/retry and must confirm the operation.
9. Provider-health data becomes unavailable and the UI communicates the limitation.
10. A stale template conflict is handled without silently overwriting changes.
11. Restricted personal data remains masked.
12. Session expiry prevents further restricted access.

---

## 20. Definition of Done

This step is complete only when:

- Notification-related routes are integrated into the existing permission-aware shell.
- All implemented screens use approved API contracts.
- No provider integration or backend notification logic is duplicated in the frontend.
- Template, delivery, provider, audience, and engagement views are capability-gated.
- All high-impact actions have appropriate confirmation and pending states.
- Delivery states are represented accurately and consistently.
- Privacy masking and sensitive-data handling are implemented.
- Loading, empty, error, stale, partial-data, and permission-denied states exist.
- Unit, component, integration, and relevant E2E tests pass.
- Accessibility checks are completed.
- No secrets or sensitive payloads are exposed in client logs or source code.
- The implementation is documented and reviewed against Steps 1–8 and the Shared Core Blueprint.

---

## 21. Acceptance Criteria

1. An authorized administrator can open the Notifications & Engagement area and see only the capabilities permitted for their role.
2. The overview displays backend-provided delivery metrics with explicit time range and freshness information.
3. Templates can be searched, filtered, paginated, and opened through deep links.
4. Template details clearly distinguish metadata, content, status, versions, and audit history.
5. Editing is unavailable to unauthorized administrators and unsupported template states.
6. Preview uses safe sample data and does not send a real notification by default.
7. Delivery attempts can be filtered and inspected without exposing unnecessary personal data.
8. Delivery timelines show only backend-provided events and identify partial histories.
9. Failure views distinguish retryable, non-retryable, suppressed, expired, and unknown states when the backend supplies those classifications.
10. Retry, replay, cancellation, or lifecycle actions are available only when supported and authorized.
11. Provider-health views show current backend-reported status and freshness, without exposing secrets.
12. Audience and campaign features are either correctly implemented behind capability flags or presented as unavailable; no fake workflows are shipped.
13. Bulk-impact actions display scope and require explicit confirmation.
14. API errors, permission failures, stale conflicts, and partial data are handled clearly.
15. Sensitive values are masked by default and are not leaked through logs, URLs, or analytics visualizations.
16. The feature passes the agreed test and accessibility checks.
17. The implementation does not duplicate shared backend business logic or introduce a second source of truth.

---

## 22. Deliverables

Produce:

- Notification overview page.
- Template directory and detail pages.
- Template editing and preview flows where supported.
- Delivery-attempt directory and detail pages.
- Provider-health view where supported.
- Audience/campaign views only where enabled by approved contracts.
- Engagement-insights view where supported.
- Reusable notification status, timeline, masking, and confirmation components.
- Typed API integration modules.
- Permission mappings and route guards.
- Loading, empty, error, conflict, and partial-data states.
- Unit, component, integration, security, and E2E tests.
- Developer documentation for any new frontend-only conventions.

---

## 23. AI IDE Execution Instructions

Implement this step in the following order:

1. Inspect the existing Super Admin shell, routing, authentication, permission utilities, API client, query layer, shared UI components, and error handling.
2. Read the Shared Core Backend Blueprint and Super Admin Steps 1–8 before changing code.
3. Locate the actual notification, event, delivery, audit, and analytics contracts in the repository.
4. Create a capability matrix mapping available backend operations to frontend screens and permissions.
5. Implement the overview page using real contracts or clearly isolated typed adapters.
6. Implement the template directory and detail experience.
7. Add editing, lifecycle actions, and preview only where the backend contract supports them.
8. Implement delivery-attempt search and detail traceability.
9. Implement provider health and failure views only with approved data sources.
10. Add optional audience, campaign, and engagement screens only if enabled.
11. Add explicit loading, empty, error, conflict, stale, and partial-data states.
12. Add privacy masking and high-impact action confirmations.
13. Add tests before considering the step complete.
14. Run linting, type checking, unit tests, component tests, and relevant E2E tests.
15. Review the diff for duplicated business logic, unsupported endpoints, accidental secrets, and scope expansion.
16. Document unresolved backend dependencies instead of inventing temporary behavior.

### 23.1 Stop conditions

Stop and report a blocker if:

- Notification API contracts are missing.
- Template lifecycle transitions are undefined.
- Delivery-state semantics are ambiguous.
- Retry and replay behavior cannot be distinguished.
- Permission names are unavailable.
- The backend does not expose safe preview behavior but the requested UI requires it.
- Privacy/redaction rules are not defined for the requested data.
- A requested campaign or bulk-send feature has no approved scope or backend authority.

Do not work around these blockers by embedding business logic in the frontend.

---

## 24. Dependency Boundary with Other Blueprint Steps

### Depends on

- **Shared Core Backend Steps 1–6:** Identity, permissions, API conventions, events, jobs, notifications, and observability contracts.
- **Shared Core Backend Steps 9–12:** Payments-related notifications, analytics, security, auditability, and operational readiness.
- **Super Admin Step 2:** Navigation, shell, shared tables, forms, and global state conventions.
- **Super Admin Step 3:** Administrator identity, session security, and effective permissions.
- **Super Admin Steps 4–8:** Links to users, brokers, agencies, listings, visits, leads, financial records, urgent requirements, and analytics.

### Must not duplicate

- Notification dispatch or provider integration.
- Recipient eligibility or consent enforcement.
- Event processing and queue workers.
- Delivery retry policy.
- Template rendering engine.
- Financial, listing, lead, visit, or account business rules.
- Audit-log creation logic.

### Provides to later steps

- Reusable notification status components.
- Delivery timeline component.
- Privacy-aware data display patterns.
- Operational exception patterns.
- Template preview and confirmation primitives.
- Notification-related navigation and route conventions.

---

## 25. Final Implementation Rule

> Build the Super Admin notification experience as a permission-aware operational console over the Shared Core Backend. Display authoritative notification states, preserve privacy and consent boundaries, require explicit confirmation for high-impact actions, and never reimplement dispatch, targeting, provider, queue, retry, or communication business logic in the frontend.
