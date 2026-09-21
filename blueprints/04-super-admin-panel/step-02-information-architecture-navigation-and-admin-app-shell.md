# Super Admin Panel Blueprint — Step 02
## Information Architecture, Navigation, Permission-Aware UX, and Admin App Shell

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network  
**Interface:** Super Admin Panel / VortexCubes Command Center  
**Document path:** `blueprints/04-super-admin-panel/step-02-information-architecture-navigation-and-admin-app-shell.md`  
**Status:** Implementation blueprint  
**Primary audience:** Super Admin developer, shared-core backend team, QA, security reviewer, and technical lead

---

## 1. Purpose

This document defines the information architecture, navigation model, application shell, permission-aware user experience, route organization, loading/error behavior, and reusable layout foundations for the Zero Brokerage Super Admin Panel.

The goal is to create a stable internal command-center shell that every later Super Admin module can use without creating competing navigation systems, duplicated authorization logic, inconsistent page layouts, or unsafe privileged-action patterns.

This step establishes the interface foundation only. Detailed domain workflows are specified in later Super Admin blueprint steps.

The implementation must preserve the following principle:

> The Super Admin Panel is a privileged operational client of the Shared Core Backend. It is not a second business-logic layer and it is not a direct database console.

---

## 2. Mandatory Source and Decision Review

Before implementing this step, the AI IDE and developer must read and reconcile:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. Completed User App Blueprint Steps 1–12.
6. Super Admin Blueprint Step 01.
7. Repository documentation under `docs/`.
8. Existing `apps/super-admin` code, shared packages, API contracts, and authentication/authorization utilities.

### 2.1 Decision precedence

Use this order of authority:

1. Explicitly finalized critical Zero Brokerage decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Detailed blueprint instructions.
5. Repository architecture and API documentation.
6. Routine implementation decisions approved by the technical lead.

If a conflict or missing contract is discovered, record it as a blocker or decision item. Do not silently invent a backend route, permission, entity state, or business rule.

### 2.2 Important architectural reconciliation

The SOW describes a broader microservices-oriented target architecture. The finalized implementation baseline is a modular monolith with one deployable Fastify API. Therefore:

- The Super Admin Panel must consume the shared Fastify API.
- No separate admin backend may be introduced.
- No browser code may connect directly to PostgreSQL, PostGIS, Redis, object storage, payment providers, messaging providers, or job infrastructure.
- The Panel must reuse shared authentication, authorization, validation, error, observability, and API-contract conventions.

---

## 3. Scope of This Step

### 3.1 Included

Implement the reusable foundation for:

- Protected admin application entry point.
- Authentication bootstrap and session-aware shell behavior.
- Permission-aware route and navigation rendering.
- Responsive desktop-first admin layout.
- Primary sidebar navigation.
- Header/top bar.
- Breadcrumbs and page titles.
- Workspace/content area.
- Global search entry point placeholder and contract boundary.
- Notifications/alerts entry point placeholder and contract boundary.
- Administrator profile and session menu.
- Environment/status indicator where approved.
- Reusable page, section, table, filter, drawer, modal, and confirmation patterns.
- Loading, empty, error, offline, unauthorized, and forbidden states.
- Unsaved-change protection for forms where technically supported.
- Keyboard navigation and accessibility foundations.
- Route metadata and navigation configuration.
- Feature-flag and capability-aware visibility.
- Testable layout and permission boundaries.

### 3.2 Deferred to later steps

Do not implement full domain behavior here for:

- User, broker, or agency management.
- Listing moderation.
- Verification review.
- Financial operations.
- Analytics calculations.
- Urgent-requirement operations.
- Notification campaigns.
- Security investigations.
- Support and dispute resolution.
- Content management.
- Integration configuration.
- Platform settings.

This step may create typed route placeholders and empty states for those areas, but each domain's business logic belongs in its own later blueprint step.

### 3.3 Explicit exclusions

Do not add:

- Consumer-facing User App screens.
- Broker App workflows.
- Agency Portal workflows.
- Public marketing pages.
- Direct database tools.
- Arbitrary SQL consoles.
- Unapproved impersonation tools.
- Client-side permission enforcement as the only protection.
- Hard-coded administrator privileges.
- Hidden background mutations triggered merely by opening a page.

---

## 4. Information Architecture

The Panel should use a domain-oriented information architecture. Navigation labels must describe operational responsibilities rather than internal database tables.

The initial navigation model is:

```text
Super Admin Panel
├── Dashboard
├── Users
│   ├── User Directory
│   ├── Account Status
│   └── Access/Security Review
├── Brokers & Agencies
│   ├── Broker Directory
│   ├── Agency Directory
│   ├── Verification Status
│   └── Relationship Overview
├── Listings
│   ├── Listing Directory
│   ├── Moderation Queue
│   ├── Publication/Availability Review
│   └── Reports & Quality Issues
├── Verification Center
│   ├── Pending Reviews
│   ├── Corrections Required
│   ├── Escalations
│   └── Verification History
├── Visits, Leads & Urgency
│   ├── Visit Operations
│   ├── Lead Operations
│   ├── Urgent Requirements
│   └── Exceptions
├── Subscriptions & Billing
│   ├── Plans
│   ├── Subscriptions
│   ├── Payments & Refunds
│   ├── Commissions & Payouts
│   └── Reconciliation Exceptions
├── Analytics & Reports
│   ├── Platform Overview
│   ├── Revenue & Subscriptions
│   ├── Operations
│   ├── Trust & Conversion
│   └── Exports
├── Trust, Reviews & Disputes
│   ├── Review Reports
│   ├── Trust-Signal Issues
│   ├── Support Tickets
│   └── Disputes & Escalations
├── Notifications & Engagement
│   ├── Templates
│   ├── Delivery Monitoring
│   ├── Segments
│   └── Campaigns/Sequences
├── Security Center
│   ├── Access Activity
│   ├── Suspicious Activity
│   ├── Sessions
│   └── Security Controls
├── Audit Logs
├── Integrations
├── Platform Settings
└── Global Search
```

The exact enabled items must be driven by the current product scope, feature flags, and the administrator's effective permissions. A navigation item must not appear merely because its route exists in source code.

### 4.1 Navigation grouping rules

- Keep the primary sidebar focused on high-level operational domains.
- Use nested navigation for related workflows.
- Avoid more than one canonical route for the same responsibility.
- Do not duplicate a domain under multiple menu groups unless there is a documented discoverability reason.
- Use consistent terminology across navigation, page headings, breadcrumbs, permissions, API documentation, and tests.
- Keep destructive actions out of the primary navigation.
- Make pending-work indicators visible only when the backend provides an authoritative count or status.

### 4.2 Scope and visibility

Navigation visibility may depend on:

- Effective administrator permission.
- Feature flag.
- Product rollout phase.
- Environment.
- Availability of the corresponding backend contract.

Visibility is a usability feature, not a security boundary. Every route and API operation must still be protected by server-side authorization.

---

## 5. Route and URL Conventions

Use a predictable, stable route structure. The final route names must follow the repository's existing Next.js routing convention; do not create a second routing pattern.

A recommended conceptual route map is:

```text
/admin
/admin/dashboard
/admin/users
/admin/users/[userId]
/admin/brokers
/admin/brokers/[brokerId]
/admin/agencies
/admin/agencies/[agencyId]
/admin/listings
/admin/listings/[listingId]
/admin/listings/moderation
/admin/verification
/admin/visits
/admin/leads
/admin/urgency
/admin/subscriptions
/admin/billing
/admin/analytics
/admin/reviews
/admin/disputes
/admin/notifications
/admin/security
/admin/audit-logs
/admin/integrations
/admin/settings
/admin/search
```

These are route concepts, not permission grants or guaranteed API endpoints. Before implementation, verify the exact route convention against the existing application structure.

### 5.1 Route requirements

Each protected route must have:

- A stable route identifier.
- A human-readable page title.
- A navigation group or explicit non-navigation classification.
- Required capability metadata.
- Optional feature-flag metadata.
- A loading-state strategy.
- An error-boundary strategy.
- A not-found strategy where applicable.
- A forbidden-state strategy.
- Breadcrumb metadata.
- A test identifier or stable semantic locator where appropriate.

### 5.2 Deep links

The Panel must support opening an authorized entity page directly through a deep link.

When a deep link is opened:

1. Restore or establish the administrator session.
2. Resolve the route and required capability.
3. Verify authorization through the backend.
4. Load the resource using the approved API contract.
5. Render loading, not-found, forbidden, or error states explicitly.
6. Never expose sensitive data in the URL unless the approved contract explicitly permits it.

Do not place access tokens, identity documents, payment details, private notes, or sensitive personal data in query parameters.

---

## 6. Application Shell

The application shell must provide a consistent frame around all protected pages.

### 6.1 Shell regions

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: Breadcrumbs | Search | Alerts | Admin Menu         │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│ Primary        │ Page Header                                 │
│ Sidebar        │ Title + Description + Actions               │
│                │                                             │
│ Domain groups  │ Filters / Tabs / Context Bar                │
│ and statuses   │                                             │
│                │ Main Content                                │
│                │                                             │
│                │ Tables / Cards / Forms / Charts              │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

Required shell behavior:

- Desktop-first layout suitable for operational work.
- Usable tablet behavior where practical.
- Horizontal overflow must be controlled for dense tables.
- Sidebar collapse state must not remove access to navigation.
- Page content must remain usable at common laptop resolutions.
- Long-running operations must not freeze the entire shell.
- Global error handling must not erase already-rendered safe content.

### 6.2 Sidebar

The sidebar must support:

- Grouped navigation.
- Active-route highlighting.
- Expand/collapse behavior for nested groups.
- Permission-aware item visibility.
- Feature-flag-aware item visibility.
- Pending-count badges from server-provided data only.
- Keyboard navigation.
- Accessible names and expanded/collapsed states.
- A clear active state that is not communicated by color alone.

Do not calculate pending queues locally by counting partially loaded table rows.

### 6.3 Header/top bar

The header may contain:

- Breadcrumbs or current location.
- Global search trigger.
- Operational alert/notification trigger.
- Environment indicator, if approved.
- Administrator identity menu.
- Session/security actions.

The header must not display sensitive information by default. Any high-risk security or financial indicator must use approved redaction and permission rules.

### 6.4 Page header

Every domain page should use a consistent page-header pattern containing:

- Page title.
- Short operational description.
- Optional context such as current status or scope.
- Primary action only when the administrator has the relevant capability.
- Secondary actions in a predictable overflow or action group.
- Breadcrumbs when the page is deeper than the primary navigation level.

The page header must not imply that an operation succeeded before the backend confirms it.

---

## 7. Permission-Aware UX Contract

The Panel must consume a server-provided administrator capability contract when available. The exact payload shape must come from the shared API contract; do not invent a permission schema in the frontend.

### 7.1 Capability-driven behavior

For every protected action, the UI must distinguish between:

- Not visible because the feature is unavailable.
- Not visible because the administrator lacks permission.
- Visible but disabled because a current state or prerequisite prevents the action.
- Visible and actionable.
- Pending because a backend operation is in progress.

Do not use a generic disabled button for every failure. The UI should explain the reason when disclosure is safe and useful.

### 7.2 Example capability categories

The following are conceptual capability names and must be reconciled with the authoritative permission catalog:

- `dashboard.read`
- `users.read`
- `users.manage_status`
- `brokers.read`
- `brokers.manage_verification`
- `agencies.read`
- `listings.read`
- `listings.moderate`
- `verification.review`
- `visits.read`
- `leads.read`
- `urgency.manage`
- `subscriptions.read`
- `billing.read`
- `billing.manage`
- `analytics.read`
- `analytics.export`
- `reviews.moderate`
- `disputes.manage`
- `notifications.manage`
- `security.read`
- `audit.read`
- `settings.manage`
- `integrations.manage`

These examples must not be treated as a substitute for backend-defined permissions.

### 7.3 High-risk actions

The shell and shared action components must support a standard high-risk-action pattern:

1. Show the action only when the relevant capability is present.
2. Explain the effect and affected entity.
3. Show the current entity state.
4. Require explicit confirmation for destructive, financial, security, or publication actions.
5. Require a reason or additional verification when the backend policy requires it.
6. Submit through the approved API contract.
7. Show a pending state and prevent accidental duplicate submission.
8. Display the server-confirmed result.
9. Refresh or invalidate affected data through the approved data-access layer.
10. Preserve the actual administrator identity in audit records.

The frontend must not manufacture audit entries or claim that an action is auditable unless the shared backend confirms the operation through its audit mechanism.

---

## 8. Reusable UI Foundations

Create or reuse a consistent set of primitives. Prefer existing repository components and shared design-system packages before adding new components.

Recommended foundational components include:

- `AdminShell`.
- `AdminSidebar`.
- `AdminHeader`.
- `Breadcrumbs`.
- `PageHeader`.
- `PermissionGate` for visibility and presentation only.
- `CapabilityButton` or equivalent capability-aware action wrapper.
- `StatusBadge`.
- `MetricCard`.
- `DataTable`.
- `FilterBar`.
- `SearchInput`.
- `PaginationControls`.
- `EmptyState`.
- `LoadingState`.
- `ErrorState`.
- `ForbiddenState`.
- `NotFoundState`.
- `ConfirmActionDialog`.
- `ReasonDialog`.
- `Drawer`.
- `Modal`.
- `AuditSummary`.
- `CopyableIdentifier` with privacy-safe behavior.
- `DateTimeDisplay`.
- `CurrencyDisplay`.
- `AsyncOperationStatus`.

Each component must have a clear responsibility. Avoid creating multiple components that solve the same problem with slightly different conventions.

### 8.1 Tables

The reusable table foundation must support, where needed:

- Server-side pagination.
- Server-side sorting.
- Server-side filtering.
- Stable row keys.
- Loading and skeleton states.
- Empty states.
- Error recovery.
- Column visibility controlled by approved configuration.
- Responsive overflow behavior.
- Row-level action permissions.
- Safe bulk-selection patterns only when explicitly supported.
- Export entry points that trigger backend export jobs rather than client-side unrestricted extraction.

Do not assume that all records can be loaded into the browser.

### 8.2 Forms

Reusable forms must support:

- Server-backed validation errors.
- Field-level and form-level error messages.
- Required-field indicators.
- Accessible labels and descriptions.
- Dirty-state tracking.
- Unsaved-change warnings where applicable.
- Explicit submission state.
- Retry-safe submission behavior.
- Read-only rendering for administrators who can view but not edit.

The frontend may validate obvious input shape issues, but backend validation remains authoritative.

---

## 9. Data Fetching and State Boundaries

Use the repository-approved data-fetching and caching approach. Do not introduce a competing global state library or request abstraction without an explicit decision.

### 9.1 Server state

Server state includes:

- Administrator identity and capabilities.
- Navigation metadata.
- Dashboard summaries.
- Entity records.
- Queues and counts.
- Operational alerts.
- Job statuses.
- Audit entries.
- Feature flags.

Server state must be loaded through the approved API client and query/cache conventions.

### 9.2 Local UI state

Local state may include:

- Sidebar collapsed state.
- Open modal or drawer.
- Current filter draft before submission.
- Selected table rows.
- Active tab.
- Temporary form values.
- Toast visibility.
- Presentation preferences.

Do not store authoritative entity status, permissions, payment state, moderation outcomes, or audit state solely in local state.

### 9.3 Cache invalidation

After a successful mutation:

- Use the approved cache invalidation or refetch strategy.
- Update only data that the backend response authoritatively supports.
- Do not optimistically change high-risk or financially sensitive state unless the product contract explicitly allows it.
- Handle stale data and concurrent administrator changes visibly.

---

## 10. Global Search and Operational Alerts Boundaries

The shell may expose entry points for global search and operational alerts, but the underlying capabilities must remain contract-driven.

### 10.1 Global search

The global search entry point must:

- Use a debounced request strategy if live suggestions are supported.
- Query only permitted entity types.
- Avoid displaying unauthorized results.
- Avoid logging sensitive search terms unnecessarily.
- Support loading, no-result, error, and restricted-result states.
- Navigate only to authorized entity pages.
- Never perform client-side searching across an unrestricted downloaded dataset.

The actual searchable entities, ranking, pagination, and authorization rules belong to the backend search contract.

### 10.2 Alerts and notifications

The shell may show operational alerts when the backend provides them. It must distinguish between:

- Informational notifications.
- Action-required work items.
- Security warnings.
- Payment or integration failures.
- Critical service-health incidents.

The UI must not turn every ordinary API error into a global alert. Global alerts should be deduplicated and governed by the shared notification/observability contract.

---

## 11. Loading, Error, and Recovery Standards

Every route and major data region must explicitly handle:

- Initial loading.
- Background refresh.
- Empty result.
- Partial data availability, where supported.
- Authentication expiry.
- Forbidden access.
- Not found.
- Validation failure.
- Conflict or stale-state response.
- Rate limiting.
- Network failure.
- Backend service failure.
- Timeout.
- Unknown/unmapped error.

### 11.1 Error behavior

- Use the shared error-normalization contract.
- Display safe, actionable messages.
- Do not expose stack traces, SQL details, provider secrets, internal service names, or sensitive payloads.
- Preserve correlation/request identifiers when the approved UX exposes them to support troubleshooting.
- Provide retry actions only when retrying is safe.
- Never automatically retry a non-idempotent high-risk mutation without an approved idempotency contract.
- Do not clear all page state merely because one secondary request failed.

### 11.2 Session expiry

When the administrator session expires:

1. Stop protected requests that cannot be authorized.
2. Preserve non-sensitive local UI context where safe.
3. Show a clear session-expired state.
4. Require reauthentication through the approved flow.
5. Avoid redirect loops.
6. Never expose protected data after logout or session invalidation.

---

## 12. Security and Privacy Requirements

The application shell must comply with the shared security baseline.

Required controls include:

- Secure session handling according to the approved authentication architecture.
- No tokens in unsafe browser storage unless explicitly approved by the security design.
- No sensitive data in URLs, logs, analytics events, or error messages.
- No direct provider credentials in client bundles.
- No direct access to private object-storage URLs without backend authorization.
- Automatic redaction for sensitive identifiers where appropriate.
- Clear indication when a page contains restricted or privileged data.
- Protection against accidental cross-entity navigation.
- Safe handling of copied identifiers and links.
- Explicit confirmation for high-risk operations.
- No false attribution of administrator actions.
- Logout and session-revocation behavior that removes protected client state.

The frontend must not assume that an administrator can view every field of every entity. Field-level visibility must follow the backend response and permission contract.

---

## 13. Accessibility and Usability Requirements

The Panel must be usable for prolonged operational work.

Implement:

- Semantic landmarks for navigation, header, main content, and complementary regions.
- Keyboard access to all interactive controls.
- Visible focus indicators.
- Correct dialog focus management.
- Escape behavior for dismissible overlays where appropriate.
- Accessible labels for icon-only buttons.
- Meaningful table headers and row/action associations.
- Non-color status communication.
- Sufficient contrast according to the approved design standard.
- Reduced-motion-friendly behavior where animations exist.
- Clear text for destructive actions.
- Consistent date, time, and currency formatting.
- Responsive behavior without hiding critical controls solely on smaller screens.

Do not use color, icons, or position as the only way to communicate status or permission.

---

## 14. Observability and Diagnostics

The frontend must use the repository's approved observability utilities.

Track only necessary, privacy-safe events such as:

- Route/view access where approved.
- Major UI error occurrences.
- Failed API interactions.
- Long-running operation states.
- Export initiation and completion states where approved.
- Security-relevant UX events where explicitly defined.

Do not treat client-side analytics as proof of a financial, moderation, verification, publication, or security outcome.

When an error is reported, include safe correlation information through the approved mechanism. Do not log:

- Access tokens.
- OTPs.
- Full identity-document contents.
- Payment credentials.
- Unredacted personal data.
- Private moderation notes.
- Secrets or provider credentials.

---

## 15. Testing Requirements

Create tests for the shared shell and navigation foundation.

### 15.1 Unit tests

Test:

- Navigation configuration filtering.
- Capability-to-visibility mapping.
- Active-route resolution.
- Breadcrumb generation.
- Shell state transitions.
- Confirmation-dialog behavior.
- Loading/error/empty-state rendering.
- Sensitive-value masking helpers.
- Route metadata validation.

### 15.2 Integration tests

Test:

- Unauthenticated access to protected routes.
- Expired-session handling.
- Forbidden route access.
- Permission-aware action visibility.
- Feature-flag-aware navigation.
- Server-provided pending counts.
- API error normalization.
- Safe retry behavior.
- Logout state clearing.
- Deep-link behavior for authorized and unauthorized entities.

### 15.3 Accessibility tests

Test:

- Keyboard navigation through the shell.
- Focus handling for dialogs and drawers.
- Accessible names for controls.
- Landmark structure.
- Table semantics.
- Non-color status communication.

### 15.4 Security tests

Test:

- Client-side permission bypass attempts.
- Direct navigation to hidden routes.
- Unauthorized entity deep links.
- Sensitive data leakage through URL parameters.
- Sensitive data leakage through logs or error boundaries.
- Session invalidation behavior.
- Duplicate high-risk action submission.
- Unauthorized export entry points.

---

## 16. Implementation Deliverables

The implementation team must deliver:

- Stable Super Admin route and navigation configuration.
- Reusable protected application shell.
- Permission-aware navigation and action presentation helpers.
- Shared page-header, breadcrumb, table, filter, modal, drawer, and state components.
- Session bootstrap and protected-route behavior using approved contracts.
- Standard loading, empty, forbidden, not-found, and error states.
- Global search and operational-alert entry-point contracts/placeholders.
- Accessibility baseline for the shell.
- Privacy-safe diagnostics and error handling.
- Unit, integration, accessibility, and security tests.
- Updated route, capability, and UI-component documentation.
- A list of unresolved backend/API/permission blockers, if any.

---

## 17. Definition of Done

This step is complete only when:

- All protected Super Admin pages use one consistent shell.
- Navigation is driven by approved route metadata, permissions, and feature flags.
- Hidden navigation items cannot be used as evidence of authorization.
- Direct access to unauthorized routes is blocked by the application and backend.
- The shell does not connect directly to infrastructure or data stores.
- Shared API, error, validation, authentication, authorization, and observability utilities are reused.
- Loading, empty, forbidden, not-found, session-expired, and error states are implemented consistently.
- High-risk action components prevent accidental duplicate submissions and never claim success prematurely.
- No sensitive data is exposed through URLs, logs, analytics, or generic error screens.
- Keyboard navigation and essential accessibility behavior work across the shell.
- The route and navigation model does not duplicate domain responsibilities.
- Tests cover permission bypass, session expiry, deep links, route visibility, and critical shell behavior.
- The Panel remains runnable after each implementation unit.

---

## 18. Acceptance Criteria

1. An authenticated administrator can enter the protected Super Admin Panel through the approved authentication flow.
2. An unauthenticated visitor cannot access protected admin content.
3. The application shell renders a consistent sidebar, header, breadcrumb/page-header area, and main content region.
4. Navigation items are shown only when their feature and capability conditions are satisfied.
5. Direct navigation to a hidden or unauthorized route results in a safe forbidden or redirect state.
6. The backend remains the authority for permissions and all business outcomes.
7. The shell supports nested navigation and active-route highlighting without duplicate canonical routes.
8. Tables and forms use shared loading, empty, validation, error, and retry patterns.
9. High-risk actions require explicit confirmation and show server-confirmed outcomes.
10. Session expiry is handled without exposing protected data or causing redirect loops.
11. Global search and alert entry points do not access unauthorized datasets or invent backend behavior.
12. Sensitive data is not placed in URLs, logs, client telemetry, or generic error messages.
13. Keyboard navigation, focus handling, semantic landmarks, and accessible control labels are implemented.
14. Tests cover route protection, capability filtering, session invalidation, deep links, error states, and security boundaries.
15. The implementation does not add User App, Broker App, Agency Portal, or Public Website functionality.
16. No duplicate API client, permission engine, error-normalization system, or design-system foundation is created.

---

## 19. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Read Super Admin Blueprint Step 01 before changing the application.
2. Inspect the current `apps/super-admin` structure and repository conventions before creating routes or components.
3. Reuse existing shared packages and utilities before adding new dependencies.
4. Confirm the authoritative authentication, capability, route, API-error, and design-system contracts.
5. Build the shell and reusable primitives before implementing domain-specific pages.
6. Keep route metadata separate from business logic.
7. Treat permission-aware rendering as UX only; rely on backend authorization for security.
8. Do not invent endpoint names, response fields, status values, or permission identifiers.
9. Do not implement domain mutations in this step.
10. Add tests for unauthorized access, hidden-route navigation, session expiry, and high-risk-action safeguards.
11. Keep sensitive values out of URLs, logs, screenshots, telemetry, and error messages.
12. Keep the application runnable after every logical unit of work.
13. Record unresolved API, security, accessibility, or product questions as explicit blockers.
14. Do not mark the step complete until the Definition of Done and Acceptance Criteria have been verified.
