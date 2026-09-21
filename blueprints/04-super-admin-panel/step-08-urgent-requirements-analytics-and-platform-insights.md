# Super Admin Panel Blueprint — Step 8: Urgent Requirements, Analytics, and Platform Insights

**Document type:** Interface implementation blueprint  
**Interface:** Super Admin Panel (`apps/super-admin`)  
**Project:** Zero Brokerage / VortexCubes Real Estate & Commercial Asset Network  
**Implementation target:** Next.js + TypeScript + Tailwind CSS + approved charting/visualization library  
**Primary dependency:** Shared Core Backend Blueprint, Steps 1–12  
**Status:** Implementation instruction document

> This document specifies the Super Admin frontend experience for urgent-requirement operations, platform analytics, KPI exploration, and insight workflows. It does not create or reimplement backend algorithms, event processing, search-ranking logic, data aggregation, or business authority. Those responsibilities remain in the Shared Core Backend.

---

## 1. Objective

Build a secure, operationally useful Super Admin experience for:

1. Reviewing automatically detected urgent requirements.
2. Understanding why a requirement was flagged.
3. Managing the human-review and advisory follow-up workflow.
4. Viewing platform, operational, revenue, subscription, marketplace, and transaction insights exposed by approved APIs.
5. Exploring trends through controlled filters and drill-downs.
6. Exporting authorized reports without exposing unnecessary personal data.
7. Distinguishing backend-generated facts from admin-entered notes, actions, and interpretations.

The frontend must make the platform easier to operate without silently changing the backend's source of truth.

## 2. Mandatory Source and Dependency Review

Before implementation, the AI IDE must inspect and respect:

- BRD: `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
- SOW: `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
- All finalized project decisions and decision records.
- Shared Core Backend Blueprint Steps 1–12.
- Super Admin Blueprint Steps 1–7.
- Existing API contracts, shared types, permission definitions, event contracts, observability conventions, and error formats in the repository.

### 2.1 Decision precedence

Apply this precedence when sources appear inconsistent:

1. Explicitly finalized project decisions.
2. Approved current repository contracts and migrations.
3. Shared Core Backend Blueprint.
4. Interface-specific Super Admin Blueprint Steps 1–7.
5. BRD and SOW requirements that remain in scope.
6. Unresolved items must be surfaced as explicit implementation blockers; do not invent backend behavior.

### 2.2 Architectural reconciliation

The SOW may describe an autonomous microservices backend. The finalized implementation direction is a modular monolith initially, exposed through one Fastify API. The Super Admin frontend must therefore consume the stable API boundary and must not assume that separate microservice URLs exist.

The SOW mentions Redis-based urgent-requirement detection based on repeated searches around the month-end/start window. The frontend displays backend-generated flags and workflow states; it does not calculate or recreate the detection algorithm.

## 3. Scope of This Step

### 3.1 Included

- Urgent-requirement queue and detail views.
- Flag explanation and evidence presentation.
- Advisory assignment and follow-up status UI, where supported by the API.
- Urgent-requirement action history.
- Platform KPI dashboard views.
- Product, marketplace, transaction, and operational analytics views.
- Configurable date ranges and supported dimensions.
- Drill-down from aggregate metrics to authorized records.
- Dashboard loading, stale-data, partial-data, and unavailable-data states.
- CSV export initiation and export-status UI.
- Privacy-aware analytics presentation.
- Role and permission-aware visibility.

### 3.2 Explicitly excluded

Do not implement in this step:

- The urgent-requirement detection algorithm.
- Redis time-series tracking or search-velocity calculations.
- Lead assignment business rules.
- Listing ranking or recommendation algorithms.
- Payment, subscription, refund, commission, or payout mutations; those belong to Step 7.
- User, broker, agency, or listing moderation mutations; those belong to Steps 4–5.
- Backend event ingestion, ETL pipelines, warehouse design, or aggregation jobs.
- An Agency Web Portal inside the Super Admin application.
- Unapproved surveillance, profiling, or personal-data enrichment.

## 4. Product Principles

The implementation must follow these principles:

1. **Backend-authoritative analytics:** every metric, status, score, threshold, and count is supplied by the backend.
2. **Operational clarity:** an operator must understand what requires action, why it requires action, and what has already happened.
3. **Evidence before action:** an urgent flag must show the evidence and confidence/qualification data exposed by the API before an admin acts.
4. **No hidden mutation:** viewing analytics must never mutate business data.
5. **Privacy by minimization:** display only the personal data required for the authorized operational purpose.
6. **Time-zone clarity:** every date range and timestamp must show the applicable timezone or clearly state the platform default.
7. **Reproducibility:** a report must show its filters, generated time, data freshness, and source scope.
8. **Graceful degradation:** one unavailable metric must not blank the entire dashboard.

## 5. Information Architecture

Add the following conceptual navigation areas under the existing authenticated admin shell. Use the established navigation and permission framework from Steps 2–3.

Suggested routes; adapt names to the repository's route conventions:

- `/urgent-requirements`
- `/urgent-requirements/[id]`
- `/analytics`
- `/analytics/platform`
- `/analytics/marketplace`
- `/analytics/operations`
- `/analytics/transactions`
- `/analytics/brokers`
- `/analytics/listings`
- `/analytics/reports`
- `/analytics/exports`

Do not expose routes merely because they exist in the filesystem. Route visibility and API access must be driven by backend-issued permissions.

## 6. Urgent-Requirement Queue

### 6.1 Queue purpose

The queue is an operational worklist for backend-generated urgent-requirement flags. It is not a replacement for the lead-management system and must not create an alternative lead ownership model.

### 6.2 Required list columns

Display only fields returned by the API. Where available, include:

- Urgent requirement ID.
- Created/flagged timestamp.
- Current status.
- Priority or severity as a backend-provided value.
- Requirement category: residential, commercial, land, office, furniture, or another approved category.
- Broad location or search area.
- Requirement intent, such as rent, buy, lease, or furniture need.
- Detection reason summary.
- Assigned advisory operator or team.
- Last action timestamp.
- Next follow-up due time, if supported.
- Privacy-safe user reference.

Avoid displaying a full phone number, government ID, or unnecessary personal profile data in the queue.

### 6.3 Filters

Support only filters documented by the API contract, such as:

- Status.
- Priority/severity.
- Category.
- Geographic area.
- Created/flagged date range.
- Assignment state.
- Follow-up due state.
- Source channel.

Use server-side filtering and pagination. Do not fetch the entire queue to filter in the browser.

### 6.4 Queue behavior

- Show a clear active-filter summary.
- Preserve filters during navigation when practical.
- Provide a reset-filters action.
- Make the data refresh time visible.
- Do not auto-refresh so aggressively that it disrupts active work.
- If live updates are supported by an approved event or polling contract, show a non-disruptive “new items available” indicator before refreshing the list.
- Preserve the user's current page and selection when safe.

## 7. Urgent-Requirement Detail Experience

### 7.1 Detail sections

The detail screen should contain the following sections where supported:

1. **Summary:** ID, status, priority, category, broad location, timestamps, and assigned owner.
2. **Why this was flagged:** backend-generated reason codes and human-readable explanations.
3. **Requirement context:** normalized requirement attributes, budget/range, preferred area, property type, timing, and other permitted fields.
4. **Activity evidence:** permitted aggregate search/activity evidence, including the relevant time window and count. Do not expose raw behavioral data beyond the approved contract.
5. **Related records:** authorized links to related user, lead, visit, listing, or advisory records.
6. **Follow-up timeline:** backend-recorded actions, notes, status transitions, and timestamps.
7. **Assignment panel:** current assignee, team, assignment timestamp, and supported reassignment action.
8. **Privacy and access indicators:** any masking or restricted-field explanation.

### 7.2 Evidence presentation

The UI must distinguish:

- System-generated detection evidence.
- Backend-calculated priority or confidence.
- Admin-entered notes.
- Admin actions.
- External communication outcomes.

Never label an inference as a confirmed fact. If the backend only provides a reason code, display that reason code with a clear explanation supplied by the backend or approved copy registry.

### 7.3 Supported actions

Only render actions that the permission response and API contract authorize. Potential actions include:

- Assign to self.
- Assign to an authorized operator/team.
- Change workflow status.
- Add an operational note.
- Schedule or record a follow-up, if supported.
- Mark as reviewed.
- Escalate.
- Resolve or dismiss with a mandatory reason, if supported.

Every mutation must use the backend command endpoint and then refresh or reconcile the server state.

### 7.4 Action safeguards

For destructive, privacy-sensitive, or workflow-closing actions:

- Show the exact target record.
- Explain the consequence.
- Require a reason where the API requires one.
- Require confirmation.
- Prevent duplicate submissions.
- Display the final backend result rather than assuming success.
- Record the action in the visible timeline when returned by the API.

## 8. Urgent-Requirement Workflow States

Render states from the backend enum rather than hardcoding assumptions. The UI should support a state-machine presentation such as:

- Detected.
- New/unreviewed.
- In review.
- Assigned.
- Follow-up pending.
- Contacted or advisory initiated, if supported.
- Escalated.
- Resolved.
- Dismissed/invalid, if supported.

The exact values must come from shared types or the API contract. Do not add frontend-only states that imply a backend transition.

For every state, define:

- Label.
- Visual treatment.
- Allowed actions.
- Empty/blocked explanation.
- Transition success behavior.
- Transition conflict behavior.

## 9. Analytics Overview

### 9.1 Dashboard structure

Build a composable analytics workspace with:

- Global filter bar.
- Data freshness indicator.
- KPI summary cards.
- Trend visualizations.
- Breakdown tables.
- Top-level warnings and data-quality notices.
- Drill-down links.
- Export controls.

Do not create a single overloaded dashboard containing every metric. Use domain-specific views with consistent filter behavior.

### 9.2 Approved analytics domains

The frontend may expose the following domains only when corresponding backend endpoints and permissions exist:

1. **Platform health and activity:** user growth, active users, listings, visits, leads, and platform activity.
2. **Listing and discovery:** listing lifecycle counts, publication/moderation throughput, search activity, conversion indicators, and category distribution.
3. **Broker and agency performance:** verified activity, visits, lead outcomes, reviews, and authorized performance measures.
4. **Transactions and commissions:** transaction counts, closure states, commission records, and settlement-related summaries. Detailed financial mutation controls remain in Step 7.
5. **Subscriptions and revenue:** plan adoption, active subscriptions, renewals, churn/cancellation indicators, and revenue summaries. Detailed subscription/payment operations remain in Step 7.
6. **Furniture marketplace:** catalog activity, orders, rentals, returns, deposits, and exception summaries where the backend exposes them.
7. **Urgent requirements:** flag volume, review throughput, resolution times, and outcome summaries.
8. **Operational workflows:** visit completion, lead response, notification delivery, and exception trends.
9. **Geographic insights:** authorized category/location aggregates without exposing sensitive individual movement patterns.

### 9.3 KPI cards

Every KPI card must include, where available:

- Metric name.
- Current value.
- Unit and currency, if applicable.
- Comparison period.
- Direction and delta supplied by the backend or calculated only from compatible backend values.
- Data timestamp/freshness.
- Definition or tooltip.
- Link to the underlying detail view, if authorized.

Avoid displaying unexplained percentages or “health scores.” A metric definition must be accessible.

## 10. Global Analytics Filters

### 10.1 Supported controls

Implement reusable filters for API-supported dimensions:

- Date range.
- Comparison period.
- Asset category.
- Transaction intent.
- Geographic region.
- Broker/agency, subject to permission.
- Subscription segment.
- Workflow status.
- Source channel.

Do not offer a filter if the backend cannot honor it accurately.

### 10.2 Date-range rules

- Use explicit start and end dates.
- Display the selected timezone.
- Validate that the start is not after the end.
- Prevent unsupported future ranges unless the API explicitly supports projections.
- Show whether the end date is inclusive or exclusive according to the API contract.
- Keep the selected range visible in exported-report metadata.

### 10.3 Filter state

- Keep filter state local to the relevant analytics page unless shared URL state is part of the application convention.
- Serialize shareable filters only through an approved, safe format.
- Do not place sensitive identifiers in URLs unless explicitly approved.
- Reset dependent filters when a parent filter changes and the existing value becomes invalid.

## 11. Visualization Requirements

### 11.1 Chart rules

Use the approved charting library and existing design system. Every chart must include:

- Accessible title.
- Text alternative or accessible data table.
- Axis labels and units.
- Legend when multiple series exist.
- Empty state.
- Loading state.
- Error state.
- No-data explanation.
- Tooltip values with exact units.
- Responsive behavior.

### 11.2 Visualization selection

Use chart types according to the data shape:

- Line/area chart for time trends.
- Bar chart for categorical comparisons.
- Stacked chart only when composition is meaningful and readable.
- Table for exact values and auditability.
- Map or geographic visualization only when the backend supplies approved aggregate geospatial data.

Do not use pie/donut charts for large category sets or when exact comparison is important.

### 11.3 Data integrity

- Do not smooth, interpolate, or invent missing values.
- Distinguish zero from unavailable and null.
- Show incomplete-data warnings when the API indicates partial results.
- Preserve backend ordering where ordering is meaningful.
- Do not independently recompute business metrics in the browser.

## 12. Domain Analytics Views

### 12.1 Listing and discovery analytics

Provide authorized views for:

- Listing counts by lifecycle status.
- New, published, paused, rejected, expired, and closed trends.
- Category distribution.
- Search-to-detail or search-to-inquiry conversion metrics, if defined by the backend.
- Moderation queue throughput.
- Verification turnaround indicators.
- Geographic/category breakdowns.

Do not equate impressions, inquiries, visits, and completed deals. Display each metric with its backend definition.

### 12.2 Broker and agency analytics

Where authorized, display:

- Verified broker/agency activity.
- Lead response and visit outcomes.
- Verified closures.
- Review and rating aggregates.
- Listing quality and availability indicators.
- Agency/broker segmentation.

Do not create an independent ranking or alter the production ranking formula. The established ranking formula remains backend-owned: verification status 40%, customer rating 30%, and verified closures 30%, subject to the finalized backend contract.

### 12.3 Transaction and revenue analytics

Display read-only summaries such as:

- Gross and net amounts as separately defined by the backend.
- Commission summaries.
- Subscription revenue summaries.
- Refund totals.
- Settlement status counts.
- Revenue by plan or category.
- Outstanding or exception totals.

Link to Step 7 for detailed financial records and authorized financial actions. Do not duplicate payment or settlement mutation flows here.

### 12.4 Furniture marketplace analytics

Where supported, display:

- Active furniture listings.
- Rental versus sale distribution.
- Order and rental volume.
- Recurring-rent status distribution.
- Deposit and return exception summaries.
- Damage-claim and supplier-settlement summaries.
- Category and geographic breakdowns.

Avoid exposing supplier or customer personal information in aggregate views.

### 12.5 Operational analytics

Where supported, display:

- Visit booking, acceptance, reschedule, cancellation, and completion trends.
- Lead assignment and response indicators.
- Notification delivery success/failure rates.
- Urgent-requirement detection and resolution trends.
- Integration exception counts.

If a metric is not yet available, show “Not available from backend” rather than a fabricated placeholder value.

## 13. Drill-Down and Traceability

A user should be able to move from an aggregate metric to an authorized record list when the API supports a traceable relationship.

Required behavior:

- Carry only safe, supported filter parameters into the destination page.
- Display the originating metric and filter context.
- Provide a “Back to analytics” path.
- Avoid exposing records that the current admin cannot access.
- Handle records disappearing or changing between the aggregate query and detail query.
- Show when the drill-down is approximate, sampled, delayed, or unavailable.

## 14. Reports and Export Experience

### 14.1 Report catalogue

Create a report catalogue only for report types exposed by the backend, such as:

- Platform activity report.
- Listing and moderation report.
- Visits and leads report.
- Urgent-requirement operations report.
- Subscription/revenue summary report.
- Commission and settlement report.
- Furniture marketplace report.
- Audit/compliance report, subject to permission.

### 14.2 Export workflow

The frontend must support the backend's actual export model:

- Synchronous download for small reports, if supported.
- Asynchronous export job for large reports, if supported.
- Export request confirmation.
- Export progress/status polling or approved event updates.
- Successful download through an authorized, short-lived URL or approved file mechanism.
- Failure and expiration handling.
- Export history where provided.

Do not generate sensitive reports entirely in the browser from partially loaded data.

### 14.3 Export metadata

Show:

- Report type.
- Requesting admin.
- Requested time.
- Filter summary.
- Data period.
- Generated time.
- Expiry time, if applicable.
- Status.
- Failure reason, if safe to display.

## 15. API Integration Contract

### 15.1 Integration rules

- Use the shared API client and request-context conventions.
- Use generated/shared types where available.
- Validate response shape at the boundary if required by the repository standards.
- Use server-side pagination, sorting, filtering, and aggregation.
- Respect correlation IDs and error envelopes.
- Abort obsolete requests when supported.
- Prevent stale responses from overwriting newer filter results.
- Avoid duplicate requests caused by component remounts or uncontrolled effects.

### 15.2 Query keys and cache behavior

Use a consistent query-key strategy containing the complete semantic input:

- Domain.
- Endpoint/version.
- Date range.
- Timezone.
- Filters.
- Pagination.
- Sort order.

After a workflow mutation, invalidate or refetch the affected urgent-requirement/detail queries. Do not broadly invalidate all analytics unless required.

### 15.3 Freshness and delayed data

The API may provide `generatedAt`, `asOf`, `updatedAt`, `isPartial`, or equivalent metadata. Use the exact contract fields. Display:

- Current/fresh.
- Delayed.
- Partial.
- Unavailable.

Do not imply real-time data when the backend provides a batch snapshot.

## 16. Permissions and Privacy

### 16.1 Permission-aware rendering

Apply the permission model from Step 3 at:

- Route level.
- Navigation level.
- Page level.
- Widget level.
- Record/detail level.
- Action level.
- Export level.

The frontend guard is for usability only. The backend must remain authoritative.

### 16.2 Privacy requirements

- Mask personal identifiers unless necessary and authorized.
- Do not expose raw search histories when an aggregate is sufficient.
- Do not expose precise user location trails.
- Do not include government IDs, verification documents, or payment secrets in analytics.
- Avoid storing sensitive analytics responses in persistent browser storage.
- Prevent sensitive values from appearing in logs, error messages, URLs, or analytics telemetry.
- Respect server-side redaction and field-level access decisions.

## 17. Error, Loading, and Conflict UX

Implement explicit states for:

- Initial loading.
- Background refresh.
- Empty result.
- No data for selected period.
- Partial data.
- Permission denied.
- Authentication/session expiry.
- Rate limiting.
- Backend timeout.
- Export queued.
- Export failed.
- Stale or conflicting urgent-requirement mutation.
- Record no longer available.

For analytics, preserve successfully loaded widgets when another widget fails. Show a localized retry action instead of forcing a full-page failure.

For urgent-requirement mutations, refetch the record after a conflict and explain that another operator or process changed it.

## 18. Suggested Frontend Structure

Adapt this to the existing Super Admin codebase rather than creating parallel architectural patterns:

```text
apps/super-admin/src/
├── app/
│   ├── urgent-requirements/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── analytics/
│       ├── page.tsx
│       ├── platform/page.tsx
│       ├── marketplace/page.tsx
│       ├── operations/page.tsx
│       ├── transactions/page.tsx
│       ├── brokers/page.tsx
│       ├── listings/page.tsx
│       ├── reports/page.tsx
│       └── exports/page.tsx
├── features/
│   ├── urgent-requirements/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   └── types/
│   └── analytics/
│       ├── api/
│       ├── components/
│       ├── charts/
│       ├── hooks/
│       ├── filters/
│       └── types/
├── components/
│   ├── data-freshness/
│   ├── metric-card/
│   ├── filter-bar/
│   ├── data-table/
│   ├── export-status/
│   └── permission-gate/
└── lib/
    ├── api/
    ├── query-keys/
    ├── formatting/
    └── permissions/
```

This is a conceptual structure. Reuse existing folders, hooks, API clients, table components, and design tokens where available.

### 18.1 State separation

Keep separate:

- URL/navigation state.
- Filter form state.
- Server query state.
- Mutation state.
- Permission state.
- Local UI state such as open dialogs.
- Export-job state.

Do not store full analytics datasets in global state unless the existing architecture explicitly requires it.

## 19. Accessibility and UX Requirements

- All controls must be keyboard accessible.
- Charts must have text alternatives or data tables.
- Color must not be the only status indicator.
- Tables must support readable headers and appropriate responsive behavior.
- Focus must move into dialogs and return to the triggering control.
- Loading indicators must communicate status without trapping users.
- Date/time and currency formats must be consistent.
- Long IDs and error codes must be copyable.
- Use clear labels for system-generated versus admin-generated information.

## 20. Testing Requirements

### 20.1 Unit tests

Test:

- Filter serialization and validation.
- Query-key stability.
- Metric formatting.
- Null/zero/unavailable distinction.
- Status-label mapping.
- Permission-based action visibility.
- Export metadata rendering.
- Evidence and activity timeline formatting.

### 20.2 Component and integration tests

Test:

- Queue pagination, filtering, sorting, and refresh.
- Urgent-requirement detail rendering.
- Assignment/status/note mutation flows.
- Optimistic-update prevention or rollback behavior.
- Partial analytics widget failures.
- Date-range and timezone behavior.
- Drill-down filter propagation.
- Export request and status handling.
- Permission-denied responses.
- Expired sessions and retry behavior.

### 20.3 Security tests

Verify that:

- Unauthorized roles cannot access protected routes or actions.
- Hidden controls cannot bypass backend authorization.
- Sensitive fields are not rendered when redacted.
- Sensitive values do not appear in URLs or client logs.
- Export links are not reused after expiration.
- Cross-tenant or cross-scope records cannot be accessed through manipulated IDs or filters.

### 20.4 End-to-end tests

Cover at least:

1. Authorized admin opens the urgent-requirement queue.
2. Admin filters and opens a flagged requirement.
3. Admin reviews backend evidence and performs an authorized workflow action.
4. A concurrent change produces a conflict and the UI recovers safely.
5. Admin opens analytics with a date range and category filter.
6. One widget returns an error while other widgets remain usable.
7. Admin drills down from a metric to an authorized record list.
8. Admin requests an export and handles queued, completed, expired, and failed states.
9. Restricted admin cannot view sensitive analytics or export data.

## 21. Definition of Done

This step is complete only when:

- Urgent-requirement workflows use approved backend contracts.
- No detection or analytics business logic is duplicated in the frontend.
- All routes, widgets, records, and actions are permission-aware.
- Queue filtering and analytics filtering are server-backed.
- Data freshness and partial-data states are visible.
- Aggregate metrics are traceable where supported.
- Export flows are secure and backend-authoritative.
- Privacy and redaction rules are respected.
- Accessibility, responsive behavior, and error states are implemented.
- Unit, integration, security, and E2E tests cover critical paths.
- No financial, listing, lead, or identity ownership logic is duplicated from other blueprint steps.

## 22. Acceptance Criteria

1. An authorized operator can view, filter, paginate, and open urgent-requirement records.
2. Each opened flag clearly separates backend-generated evidence from admin-entered activity.
3. Only backend-authorized workflow actions are available.
4. Concurrent changes do not silently overwrite another operator's work.
5. Analytics pages display backend-defined KPIs with units, time range, and freshness metadata.
6. The UI distinguishes zero, null, unavailable, delayed, and partial data.
7. Charts provide accessible alternatives and exact-value access.
8. Drill-down navigation preserves safe filter context and respects permissions.
9. Exports follow the backend's synchronous or asynchronous contract and do not expose unauthorized data.
10. Restricted admins cannot access protected analytics, urgent-requirement details, or exports through direct URL manipulation.
11. The implementation reuses shared API, auth, permission, error, observability, and design-system infrastructure.
12. The implementation does not create a second backend workflow, duplicate business algorithm, or Agency Portal feature.

## 23. Deliverables

The implementation should produce:

- Urgent-requirement queue page.
- Urgent-requirement detail page.
- Authorized assignment/status/note/follow-up interactions.
- Analytics overview and domain pages.
- Reusable filter, KPI, chart, data-table, freshness, and partial-data components.
- Drill-down navigation.
- Report catalogue and export-status experience.
- API hooks/client integration using shared conventions.
- Permission and privacy-aware rendering.
- Unit, integration, security, and E2E tests.
- Updated route and feature documentation.

## 24. AI IDE Execution Instructions

Implement this step in the following order:

1. Inspect the existing Super Admin application, routing, layout, auth/session state, permission utilities, API client, shared types, query library, and design system.
2. Read the Shared Core Backend contracts for urgent requirements, analytics, audit events, permissions, pagination, errors, and exports.
3. Locate the actual endpoint names and response schemas before writing UI code.
4. Reuse existing components and patterns from Steps 1–7.
5. Implement the urgent-requirement queue and detail flow first.
6. Add workflow mutations only after confirming their exact backend commands and permission requirements.
7. Implement reusable analytics filters and data-state components.
8. Implement analytics domain pages incrementally; do not create fake metrics for missing endpoints.
9. Add drill-down and export behavior only where the backend contract supports it.
10. Add privacy, accessibility, conflict, partial-data, and failure handling.
11. Write tests for each critical flow.
12. Run type-checking, linting, tests, and production build checks.
13. Document any missing backend contract as a blocker instead of inventing an implementation.

## 25. Dependency Boundary with Other Blueprint Steps

- **Step 3:** supplies admin identity, session, permission, and secure-action patterns.
- **Step 4:** owns user, broker, agency, and verification governance interfaces.
- **Step 5:** owns listing moderation, verification, and publication interfaces.
- **Step 6:** owns primary visits, leads, assignments, and operational workflow governance.
- **Step 7:** owns detailed financial oversight, payment, subscription, refund, commission, settlement, and payout interfaces.
- **Step 8:** owns urgent-requirement operations and analytics/insight presentation, but not the underlying backend algorithms or financial mutations.
- **Future steps:** must consume the components and contracts created here rather than creating duplicate dashboards, export systems, filter systems, or permission gates.

## 26. Final Implementation Rule

> Build the Super Admin interface as a secure operational and analytical client of the Shared Core Backend. Display backend-authoritative urgent-requirement evidence and metrics, provide only explicitly authorized actions, preserve privacy and traceability, and never recreate backend detection, ranking, ownership, financial, or aggregation logic inside the frontend.
