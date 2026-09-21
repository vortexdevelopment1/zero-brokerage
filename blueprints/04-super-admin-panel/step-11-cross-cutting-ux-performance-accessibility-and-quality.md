# Super Admin Panel Blueprint — Step 11
## Cross-Cutting UX, Performance, Accessibility, Testing, and Quality Assurance

> **Implementation document for Antigravity**
>
> This document defines the cross-cutting frontend quality requirements for the Zero Brokerage Super Admin Panel. It is concerned with making the already-defined administrative workflows reliable, understandable, secure, accessible, testable, and operationally maintainable. It does **not** introduce new business modules, a second backend, a second authorization system, or new business rules.

## 1. Objective

Harden the Super Admin Panel so that all previously specified administrative areas provide a consistent production-quality experience across:

- Navigation and application-shell behavior.
- Authentication, authorization, and session expiry.
- User, broker, and agency governance.
- Listing moderation and publication controls.
- Visits, leads, and operational workflow oversight.
- Financial, subscription, payment, and settlement views.
- Urgent-requirement and analytics views.
- Notification and delivery operations.
- Settings, audit, compliance, and system-operations views.

The implementation must prioritize correctness, clear operator feedback, accessibility, predictable performance, safe failure behavior, and testability.

## 2. Mandatory Source and Dependency Review

Before implementation, reread and cross-check:

1. The approved BRD and SOW for Zero Brokerage.
2. All finalized product, business, security, and architecture decisions.
3. The complete Shared Core Backend Blueprint, especially:
   - API conventions, validation, pagination, and error envelopes.
   - Authentication and authorization contracts.
   - Events, jobs, notifications, and observability.
   - Listings, visits, leads, and ownership rules.
   - Payments, subscriptions, entitlements, refunds, and financial integrity.
   - Search, ranking, trust signals, analytics, and reporting.
   - Resilience, security, operations, deployment, and release readiness.
4. Super Admin Steps 1–10.
5. Existing repository conventions in `apps/super-admin`, `packages/*`, and `docs/*`.

### 2.1 Decision precedence

When a conflict is discovered, apply this order:

1. Explicit user-confirmed or finalized project decisions.
2. Approved architecture and security decisions.
3. BRD requirements.
4. SOW requirements, reconciled with the finalized modular-monolith decision.
5. Existing shared repository conventions.
6. This blueprint.

Do not silently invent behavior. Record unresolved scope or contract questions for the backend/platform owner.

### 2.2 Architectural boundary

The finalized backend baseline is a **modular monolith with one deployable Fastify API initially**, even if the source SOW refers to autonomous microservices.

The Super Admin frontend must:

- Consume approved REST APIs only.
- Use the shared API client, authentication utilities, validation types, and error conventions where available.
- Never access PostgreSQL, PostGIS, Redis, queues, object storage, or infrastructure directly.
- Never recalculate financial, ranking, entitlement, commission, verification, or authorization decisions locally.
- Never treat hidden UI controls as a security boundary.
- Never assume that a successful HTTP request means a business operation was completed unless the response state confirms it.

## 3. Scope of This Step

### 3.1 Included

- Shared UX patterns and reusable administrative components.
- Consistent loading, empty, error, stale-data, and degraded-mode states.
- Table, filter, pagination, sorting, and bulk-selection behavior.
- Detail drawers, detail pages, confirmation dialogs, and action-result feedback.
- Form handling and server-validation presentation.
- Optimistic versus pessimistic update rules.
- Accessibility and keyboard navigation.
- Responsive behavior for supported desktop and tablet widths.
- Performance budgets and rendering strategy.
- Client-side caching and request deduplication through the approved data layer.
- Error boundaries and recovery behavior.
- Automated unit, integration, component, accessibility, and end-to-end tests.
- Test data, mocking boundaries, and deterministic test setup.
- Quality gates for pull requests and release candidates.

### 3.2 Explicitly excluded

Do not implement in this step:

- New backend endpoints or domain modules.
- A replacement state-management or data-fetching architecture without approval.
- Client-side replicas of backend business logic.
- Direct database, Redis, queue, cloud, or server integrations.
- Unapproved bulk destructive actions.
- New permissions or roles.
- New financial, moderation, ranking, retention, or compliance policies.
- Automatic production deployment from the frontend.
- A second analytics, logging, monitoring, or incident-management system.

## 4. Cross-Cutting Product Principles

### 4.1 Accuracy over speed

Administrative data may control real users, listings, money, access, and compliance. Prefer authoritative refetches and explicit status transitions over aggressive optimistic updates.

### 4.2 Every action has a visible lifecycle

For any mutation, show an understandable progression where supported:

1. Ready to submit.
2. Submitting.
3. Accepted or queued.
4. Applied, rejected, partially completed, or failed.
5. Audited or awaiting further review, where applicable.

Never display a completed state before the backend confirms it.

### 4.3 Read-only by default

If the operator lacks the effective permission, if the backend does not expose the capability, or if the record is in an incompatible state, render the view as read-only and explain why where appropriate.

### 4.4 Preserve context

After a successful mutation, preserve the operator’s current filter, search, pagination, tab, and scroll context whenever safe. If the affected record disappears from the current result set, explain the reason instead of silently confusing the operator.

### 4.5 Do not hide important failure

Do not rely only on transient toasts for important failures. Pair them with inline or persistent status where the action affects money, access, publication, verification, compliance, or operational health.

## 5. Shared UI Foundation

Build or reuse a consistent component foundation rather than implementing one-off patterns in each module.

### 5.1 Required shared components

At minimum, identify reusable components for:

- Page header with title, description, breadcrumbs, and contextual actions.
- Permission-aware action button.
- Status badge with a controlled status vocabulary.
- Search input with clear and submit behavior.
- Filter bar and filter chips.
- Date-range selector with timezone clarity.
- Data table with sorting, pagination, selection, and column visibility.
- Responsive data-card fallback for narrower widths.
- Detail drawer or detail panel.
- Section card and metric card.
- Empty state with an actionable next step.
- Loading skeleton and initial-load indicator.
- Inline field error and form-level error summary.
- Confirmation dialog for consequential actions.
- Step-up-authentication prompt when required by the backend.
- Toast or notification feedback for low-risk outcomes.
- Persistent operation-status panel for long-running jobs.
- Copy-to-clipboard control for safe identifiers.
- Audit-reference display.
- Retry control for retryable failures.
- Error boundary fallback.
- Unsaved-changes guard.

Each component must have documented states and predictable keyboard behavior.

### 5.2 Status presentation

Status badges must:

- Use text, not color alone.
- Have a stable mapping from backend status to display label.
- Avoid inventing statuses not returned or documented by the API.
- Distinguish current state from pending action state.
- Display unknown statuses safely as an explicit “Unknown status” state and log the contract mismatch through the approved frontend observability mechanism.

### 5.3 Date, time, currency, and number formatting

- Respect the platform’s documented timezone conventions.
- Display timezone or timezone context for scheduled visits, payment events, jobs, and operational timestamps where ambiguity is possible.
- Format INR values consistently using a shared formatter.
- Never use floating-point arithmetic for financial decisions or totals.
- Treat server-provided monetary values as authoritative display data.
- Preserve exact identifiers and reference numbers without locale formatting.
- Provide an accessible full-value alternative when a value is visually truncated.

## 6. Tables, Search, Filters, and Pagination

### 6.1 Server-side data is authoritative

Use server-side filtering, sorting, pagination, and aggregation whenever the endpoint supports them. Do not download an entire dataset merely to filter it in the browser.

### 6.2 Query-state rules

For list pages:

- Keep filter, sort, page, and page-size state in a predictable location.
- Debounce free-text search only where appropriate.
- Cancel or ignore stale requests when a newer query supersedes them.
- Prevent duplicate requests caused by avoidable effect or component remount behavior.
- Display the active filters clearly.
- Provide a “clear all” action when filters are active.
- Preserve query state on detail-page return where practical.
- Use backend-provided pagination metadata rather than calculating totals from the current page.

### 6.3 Table behavior

Tables must support, as applicable:

- Stable row keys from immutable backend identifiers.
- Sort direction indicators.
- Column headers that are accessible to screen readers.
- Horizontal scrolling without breaking the page shell.
- Safe truncation with accessible full values.
- Row-level loading or disabled state during a mutation.
- Empty results distinct from an empty dataset.
- Error state distinct from zero results.
- Explicit selection counts for bulk operations.
- Confirmation before consequential bulk actions.

Do not implement bulk actions unless the backend contract, permission model, audit behavior, and partial-failure semantics are defined.

### 6.4 Filter correctness

- Use backend-supported filter names and enum values.
- Do not silently drop unsupported filters.
- Validate date ranges before submission.
- Make inclusive/exclusive date boundaries clear.
- Prevent impossible combinations only when the contract documents them; otherwise let the backend remain authoritative.
- Show when results are stale or when a refresh is required.

## 7. Forms and Mutation Workflows

### 7.1 Form state

Separate:

- Initial server state.
- User-edited draft state.
- Submission state.
- Server-returned validation errors.
- Mutation result state.

Do not overwrite an operator’s unsaved edits with background refetches without an explicit policy.

### 7.2 Validation

Client-side validation is for usability only. The backend remains authoritative.

Forms must:

- Use the API contract’s field names and types.
- Mark required fields accurately.
- Show errors beside the relevant field.
- Provide a form-level summary for screen readers and multi-field failures.
- Preserve entered values after validation failure where safe.
- Map backend field-path errors to the correct control.
- Display non-field business-rule errors at the form level.
- Handle unknown or newly introduced server errors without crashing.

### 7.3 Confirmation levels

Use confirmation proportional to impact:

- **Low risk:** immediate action with a clear result indicator.
- **Moderate risk:** confirmation dialog with a concise consequence statement.
- **High risk:** explicit confirmation, affected-resource summary, reason field if required, and step-up authentication when required by the backend.
- **Irreversible or sensitive:** do not expose the control unless the backend explicitly supports the workflow and its safeguards.

Confirmation text must describe the actual action and must not use vague labels such as “Continue” for consequential operations.

### 7.4 Optimistic updates

Do not use optimistic updates for:

- Payments, refunds, commissions, settlements, or subscription status.
- User, broker, agency, or admin access changes.
- Verification, moderation, publication, or suspension actions.
- Audit, compliance, security, or operational actions.
- Any action whose failure could leave the UI materially inconsistent.

Optimistic UI may be used only for low-risk presentational interactions after review, with a reliable rollback path.

## 8. Loading, Empty, Error, and Degraded States

Every route and major component must define the following states:

### 8.1 Initial loading

- Use a layout-preserving skeleton where practical.
- Do not show misleading zero values while data is loading.
- Keep navigation usable unless the session or application shell itself is unavailable.

### 8.2 Refreshing

- Preserve existing valid data while showing a non-disruptive refresh indicator.
- Prevent accidental duplicate refreshes.
- Identify stale data when the backend provides freshness metadata.

### 8.3 Empty state

Differentiate among:

- No records exist.
- No records match the current filters.
- The operator lacks permission to view records.
- The backend has not configured the feature.
- Data is temporarily unavailable.

Each empty state should explain the condition and provide an appropriate next action where possible.

### 8.4 Error state

Error handling must classify failures where the API contract permits:

- Validation error.
- Authentication/session error.
- Authorization error.
- Not-found or stale-resource error.
- Conflict or invalid-state error.
- Rate-limit error.
- Network or timeout error.
- Server error.
- Unsupported capability or contract mismatch.

Provide a safe recovery action such as retry, refresh, return to list, or contact the platform owner. Do not expose stack traces, tokens, internal paths, SQL, provider secrets, or sensitive payloads.

### 8.5 Degraded mode

When only one part of the page fails:

- Keep unaffected sections usable when safe.
- Mark the failed section clearly.
- Avoid replacing the entire page with a generic error.
- Do not allow actions that depend on unavailable authoritative data.

## 9. Accessibility Requirements

Implement accessibility as a baseline requirement, not a final polish item.

### 9.1 Keyboard support

- All interactive controls must be reachable by keyboard.
- Focus order must follow the visual and logical order.
- Dialogs and drawers must trap focus appropriately while open.
- Focus must return to a sensible trigger after closing a dialog or drawer.
- Do not create keyboard traps outside intentional modal focus management.
- Provide visible focus indicators.
- Support keyboard operation for tables, menus, tabs, pagination, and filters.

### 9.2 Semantic structure

- Use semantic headings in a logical hierarchy.
- Use real buttons for actions and links for navigation.
- Associate labels with inputs.
- Use accessible names for icon-only controls.
- Provide table captions or accessible labels where appropriate.
- Use live regions for important asynchronous status changes without over-announcing routine updates.

### 9.3 Visual and interaction accessibility

- Do not communicate status through color alone.
- Ensure readable contrast according to the project’s accessibility target.
- Do not rely only on hover to reveal essential information.
- Make click targets sufficiently usable.
- Support zoom and responsive text without content loss.
- Ensure validation and error messages are perceivable and associated with their controls.

### 9.4 Accessibility testing

Add automated accessibility checks to representative routes and manually verify:

- Login and session-expiry flows.
- Main dashboard and navigation.
- A complex filterable table.
- A detail page with actions.
- A form with server-side validation errors.
- A confirmation dialog.
- A chart or metric-heavy page.

## 10. Responsive Behavior and Layout Quality

The Super Admin Panel is primarily a desktop-oriented administrative application, but it must remain usable on supported smaller widths.

Required behavior:

- Do not allow critical actions to disappear outside the viewport.
- Convert dense tables into horizontally scrollable tables or structured cards where appropriate.
- Keep page-level actions discoverable.
- Avoid fixed-height containers that clip validation errors or long values.
- Preserve readable chart labels and provide a tabular or textual alternative for important metrics.
- Ensure dialogs fit within the viewport and remain keyboard accessible.
- Test common desktop, laptop, and tablet breakpoints used by the existing application.

## 11. Performance Requirements

### 11.1 Performance principles

- Load route-level code on demand where the application architecture supports it.
- Avoid loading heavy charting, export, or document-preview code on routes that do not need it.
- Virtualize very large client-rendered lists only when required and compatible with accessibility.
- Memoize only after identifying a real rendering problem; avoid premature complexity.
- Keep request payloads and selected fields appropriately scoped.
- Prefer server-side aggregation and pagination.
- Avoid repeated fetching of identical data within a short interaction window.
- Use stable query keys and cache invalidation rules.

### 11.2 Suggested frontend budgets

Treat these as engineering targets to validate against the actual hosting and application baseline, not as permission to weaken functionality:

- Fast initial shell rendering under normal production network conditions.
- No avoidable blocking request chain for the initial authenticated shell.
- Interactive controls must provide immediate visual feedback.
- Large tables must remain responsive while filtering, sorting, and paginating.
- Charts must not freeze the main thread when switching date ranges.
- Route transitions must show a clear pending state rather than appearing broken.

Record measured results in the project’s performance documentation rather than claiming compliance without evidence.

### 11.3 Performance verification

Measure at least:

- Initial JavaScript and route payload size.
- Initial authenticated route render.
- Time to usable navigation.
- Table query and render duration.
- Chart render duration for representative datasets.
- Number of network requests per major route.
- Duplicate-request rate during common interactions.
- Memory behavior during long operator sessions.

## 12. Data Fetching, Cache, and Synchronization Rules

Use the project’s approved client-side data-fetching approach. Do not introduce a competing library or pattern without approval.

For each resource, define:

- Query key or equivalent identity.
- Cache duration or freshness behavior, if supported.
- Invalidation triggers after mutations.
- Whether background refetch is safe.
- Whether the resource is sensitive and must not persist to browser storage.
- How unauthorized, expired, and revoked-session responses are handled.

After a successful mutation:

1. Use the mutation response as an immediate status signal.
2. Invalidate or update only the affected resource queries.
3. Refetch authoritative records when business state matters.
4. Preserve unrelated query state.
5. Surface any asynchronous processing state returned by the backend.

Do not persist sensitive admin data, access tokens, personal documents, payment details, or privileged operational data in unapproved browser storage.

## 13. Error Boundaries and Recovery

Implement layered failure containment:

- Application-shell fallback for unrecoverable shell errors.
- Route-level error boundary for isolated route failures.
- Component-level fallback for charts, tables, and optional panels.
- Safe fallback for malformed or unexpected API data.

Each fallback must:

- Explain that the section could not be loaded.
- Avoid exposing internal implementation details.
- Offer retry or navigation recovery where safe.
- Preserve correlation or support references when available.
- Avoid retry loops.

Unexpected contract mismatches should be observable through the approved logging mechanism without including sensitive response bodies.

## 14. Testing Strategy

### 14.1 Unit tests

Test pure utilities and deterministic logic such as:

- Date, time, currency, and number formatters.
- Status-label mapping.
- Permission-to-visibility helpers used only for presentation.
- Query-string serialization and parsing.
- Filter normalization.
- Error-envelope mapping.
- Table column configuration.
- Accessibility label generation.
- Safe redaction and display helpers.

Presentation helpers must not make authorization or business decisions; test that they fail safely for unknown values.

### 14.2 Component tests

Test shared components in meaningful states:

- Loading.
- Empty.
- Error.
- Disabled.
- Read-only.
- Permission denied.
- Validation failure.
- Long labels and long values.
- Keyboard interaction.
- Screen-reader-relevant semantics.

### 14.3 Integration tests

Verify that representative screens correctly integrate with the API client and data layer:

- Correct endpoint and query parameters are used.
- API validation errors appear in the correct locations.
- Unauthorized responses trigger the established session behavior.
- Forbidden responses do not expose privileged controls.
- Mutation success invalidates or refreshes the correct data.
- Conflict responses preserve the operator’s context and explain the issue.
- Long-running operations show the backend-provided processing state.

Use mocked API boundaries for deterministic frontend tests. Do not mock away the behavior that the test is intended to verify.

### 14.4 End-to-end tests

Create a critical-path suite covering at least:

1. Admin login and authenticated shell loading.
2. Permission-aware navigation and route protection.
3. Search, filter, sort, pagination, and detail navigation.
4. User/broker/agency review workflow.
5. Listing moderation workflow with confirmation and result handling.
6. Visit or lead operational status review.
7. Financial or subscription record inspection without exposing secrets.
8. Urgent-requirement review and action-hook visibility where supported.
9. Audit-log lookup after a privileged mutation.
10. Session expiry and reauthentication.
11. Network failure and retry behavior.
12. Unsaved-form protection.

Tests must use isolated test data and must not trigger real payment, messaging, deletion, or production operations.

### 14.5 Accessibility tests

Run automated accessibility checks against representative routes and include manual keyboard verification for dialogs, tables, navigation, forms, and action menus.

### 14.6 Visual regression

If the repository already supports visual regression, add stable coverage for:

- Application shell.
- Dashboard cards and charts.
- Dense data tables.
- Detail drawer.
- Confirmation dialog.
- Validation and error states.
- Responsive layout states.

Do not add a new visual-regression platform without approval.

## 15. Security and Privacy Checks

Before marking this step complete, verify that the frontend:

- Does not place access tokens or secrets in URLs.
- Does not log OTPs, passwords, tokens, payment secrets, or sensitive documents.
- Does not expose document URLs beyond the backend-authorized flow.
- Does not render sensitive data merely because it exists in an API response.
- Redacts sensitive values in error reports and client logs.
- Handles session revocation and expiry consistently.
- Prevents accidental duplicate submission of consequential actions.
- Uses safe external-link behavior and does not trust arbitrary HTML from the API.
- Sanitizes or safely renders rich text supplied by users or operators.
- Does not rely on frontend permission checks as the actual security boundary.
- Does not cache privileged data in unapproved persistent storage.

## 16. Quality Gates and Definition of Done

A Super Admin route or feature is ready for integration only when:

- Its API contract and permission requirements are documented or referenced.
- Loading, empty, error, stale, and success states are implemented.
- Unsupported capabilities are handled safely.
- Consequential actions use the required confirmation and step-up patterns.
- Mutation results are authoritative and do not rely on false optimistic state.
- Keyboard navigation and accessible names are verified.
- Responsive behavior is checked at supported widths.
- Relevant unit, component, integration, and E2E tests exist.
- Sensitive information is not exposed in UI, URLs, logs, or browser storage.
- No duplicated backend business logic has been introduced.
- Linting, formatting, type checking, and relevant tests pass.
- The implementation follows the repository’s existing conventions.

## 17. Antigravity Implementation Instructions

Implement this step as a cross-cutting quality layer over the Super Admin features already specified in Steps 1–10.

1. Inspect the current `apps/super-admin` implementation before creating components.
2. Reuse existing shell, styling, state, API, and testing conventions wherever they exist.
3. Build shared primitives before duplicating patterns across routes.
4. Do not create fake API endpoints or hardcode business records.
5. Use typed API responses and backend-provided enums/statuses.
6. Keep permission checks presentation-only; backend authorization remains authoritative.
7. Add tests alongside each reusable component and representative route.
8. Prefer small, composable changes that can be reviewed independently.
9. Document any missing backend contract, unsupported capability, or unresolved requirement instead of guessing.
10. Do not modify the Shared Core Backend responsibilities from this frontend step.

## 18. Deliverables

The completed implementation should include:

- Reusable Super Admin UX components and documented states.
- Consistent table, filter, form, dialog, notification, and error patterns.
- Accessibility improvements across representative and high-risk routes.
- Performance-conscious data loading and rendering behavior.
- Error boundaries and safe recovery paths.
- Unit, component, integration, accessibility, and critical-path E2E tests.
- A quality-gate checklist or implementation note showing what was verified.
- A list of unresolved API, design, or product questions requiring explicit follow-up.

## 19. Final Acceptance Criteria

This step is accepted only when:

- All Super Admin routes from Steps 1–10 use consistent and documented cross-cutting UX patterns.
- Every major data view has correct loading, empty, error, and stale-data behavior.
- Consequential mutations do not claim success before backend confirmation.
- API validation, authorization, conflict, rate-limit, and server errors are handled safely.
- Tables, filters, pagination, forms, dialogs, and navigation are keyboard usable.
- Important status and feedback are not communicated by color alone.
- Sensitive data is not leaked through logs, URLs, browser storage, or error screens.
- Performance bottlenecks are measured and addressed where evidence requires it.
- Critical administrative workflows have automated coverage.
- The frontend introduces no duplicate business authority, new unapproved policy, or out-of-scope backend implementation.
- Linting, type checking, formatting, and the agreed test suite pass.
- The resulting interface is maintainable by the Super Admin frontend owner and consistent with the shared platform contracts.
