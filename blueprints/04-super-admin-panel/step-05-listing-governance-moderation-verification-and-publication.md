# Super Admin Panel Blueprint — Step 5: Listing Governance, Moderation, Verification, and Publication

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network  
**Interface:** Super Admin Panel / VortexCubes Command Center  
**Document path:** `blueprints/04-super-admin-panel/step-05-listing-governance-moderation-verification-and-publication.md`  
**Status:** Implementation blueprint  
**Primary audience:** Super Admin developer, Shared Core Backend team, QA, security reviewer, technical lead, and release owner

---

## 1. Purpose

This document defines the implementation contract for platform-level governance of property and furniture listings through the Super Admin Panel.

The module gives authorized platform operators a controlled interface to inspect listing records, review moderation queues, examine verification evidence and risk signals, approve or reject supported workflows, manage publication-related actions, and investigate listing reports. It must preserve the Shared Core Backend as the sole authority for listing state, eligibility, verification, moderation, ownership, ranking inputs, and downstream side effects.

This step covers the **administrative interface** for listing governance. It does not create or redefine the listing domain, verification rules, publication state machine, search-ranking algorithm, ownership rules, or fraud-detection engine.

The implementation must preserve this principle:

> The Super Admin Panel can review and request governed listing actions. The Shared Core Backend decides whether a listing action is valid, authorized, safe, auditable, and complete.

---

## 2. Mandatory Source and Dependency Review

Before implementing this step, the AI IDE and developer must read and reconcile:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. User App Blueprint Steps 1–12.
6. Super Admin Blueprint Steps 1–4.
7. Repository documentation under `docs/`, especially:
   - listing and ownership contracts;
   - verification and moderation contracts;
   - search, ranking, and publication contracts;
   - API conventions and error format;
   - database and event contracts;
   - security, privacy, and audit rules;
   - observability and configuration conventions.
8. Existing `apps/super-admin` code and shared packages.
9. Currently implemented backend routes and schemas for listings, listing media, ownership, verification, moderation, reports, publication, search projections, audit records, and administrative commands.

### 2.1 Decision precedence

Use the following precedence order:

1. Explicitly finalized critical Zero Brokerage decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Shared Core Backend contracts.
5. Earlier Super Admin blueprint steps.
6. Repository documentation and approved API contracts.
7. Routine implementation decisions approved by the technical lead.

If a conflict or missing contract is discovered:

- record the exact conflict as a blocker or decision item;
- identify the affected screen, action, entity, and API contract;
- do not invent a status, permission, endpoint, verification rule, or state transition;
- do not silently convert a backend-pending capability into a completed feature.

### 2.2 Architectural reconciliation

The SOW describes a broader microservices-oriented target architecture. The finalized implementation baseline is a **modular monolith with one deployable Fastify API**.

Therefore:

- the Panel must consume the shared Fastify API;
- no separate moderation backend may be introduced;
- no browser code may connect directly to PostgreSQL, PostGIS, Redis, object storage, search infrastructure, or provider APIs;
- listing eligibility and publication decisions must be made by shared backend services;
- the Panel must reuse shared authentication, authorization, validation, error, audit, event, and observability contracts.

---

## 3. Scope of This Step

### 3.1 Included

Implement the administrative interface foundation for:

- platform listing directory;
- property-listing and furniture-listing segmentation where supported;
- moderation queue and review workbench;
- listing detail and review summary;
- listing owner, broker, and agency relationship visibility;
- listing verification status and evidence metadata;
- listing media and document review through approved secure access mechanisms;
- listing reports and issue context;
- backend-supported moderation decisions;
- backend-supported publication, withdrawal, suspension, or restoration commands;
- reason capture and structured decision notes where required;
- review assignment or claim state where supported by the backend;
- duplicate, stale, conflicting, and asynchronous command handling;
- audit references for administrative decisions;
- listing status, verification, moderation, and publication filters;
- safe links to related users, brokers, agencies, and transactions;
- operational diagnostics for failed or pending listing actions.

### 3.2 Explicitly excluded

Do not implement the following in this step unless an approved backend contract explicitly exists:

- a second listing or moderation data model;
- client-side listing approval or verification logic;
- direct editing of database records;
- direct upload to object storage from the browser without the approved backend flow;
- independent ranking or recommendation calculations;
- independent search-index updates;
- automatic fraud decisions in React components;
- ownership adjudication performed by the frontend;
- unapproved administrator impersonation;
- changing listing ownership without an explicit authorized backend command;
- arbitrary editing of financial, agreement, or transaction records;
- exposing private owner contact details merely because an administrator can view a listing;
- bulk destructive actions without a documented backend-supported workflow;
- AI-generated moderation decisions unless separately approved and contractually exposed.

---

## 4. Ownership and Responsibility Boundaries

### 4.1 Shared Core Backend owns

The backend remains authoritative for:

- listing identity and domain schema;
- listing type and category;
- listing ownership and agency/broker relationships;
- listing lifecycle and state transitions;
- required fields and validation;
- media and document metadata;
- verification requirements and verification outcomes;
- moderation rules and decision validity;
- publication eligibility;
- suspension, withdrawal, expiry, and restoration behavior;
- fraud and risk signals;
- duplicate detection;
- search-index synchronization;
- ranking and trust-signal inputs;
- report classification and case state;
- authorization and high-risk action enforcement;
- audit event creation;
- downstream notifications and asynchronous jobs.

### 4.2 Super Admin Panel owns

The Panel is responsible for:

- displaying backend-provided listing information;
- presenting queues and filters supported by the API;
- displaying distinct lifecycle, verification, moderation, and publication states;
- showing the evidence and risk information the current administrator is authorized to see;
- collecting structured review input and confirmation;
- invoking approved administrative commands;
- showing pending, successful, failed, denied, and conflicted outcomes;
- refreshing or invalidating affected server data;
- linking to related platform entities without bypassing authorization;
- showing audit references and decision history when returned by the backend.

### 4.3 Other interfaces

- **User App:** discovers eligible public listings, saves listings, reports issues, and performs user-facing interactions.
- **Broker App:** creates and manages broker-owned or broker-managed listing workflows through its own permissions.
- **Agency Portal:** manages agency-owned listing operations within agency scope when implemented.
- **Public Website:** consumes public, eligible listing projections only; it must not receive moderation or private listing data.
- **Shared Core Backend:** remains the only place where listing governance rules and state transitions are enforced.

---

## 5. Information Architecture and Routes

### 5.1 Navigation placement

Place listing governance under a permission-aware navigation group such as:

- `Listings`;
- `Moderation`;
- `Verification Queue`;
- or a combined `Marketplace Governance` group.

The final label must follow the existing application navigation convention. Do not create duplicate navigation entries for the same backend capability.

Suggested route structure, subject to the actual routing convention:

```text
/admin/listings
/admin/listings/:listingId
/admin/listings/:listingId/review
/admin/moderation/listings
/admin/verification/listings
/admin/reports/listings
```

These are route concepts, not permission to invent routes without checking the existing application structure and backend contracts.

### 5.2 Deep-link requirements

A deep link to a listing or moderation review must:

- revalidate the current administrator session;
- re-check current permissions and resource scope;
- fetch the latest listing state from the backend;
- handle deleted, archived, expired, suspended, withdrawn, or inaccessible listings;
- handle a listing that changed state after the link was created;
- avoid placing sensitive document URLs, private contact details, or internal risk data in the URL;
- preserve non-sensitive queue/filter context only when safe and practical.

A previously visible listing must not be assumed to remain accessible.

---

## 6. Listing Directory

### 6.1 Directory contract

Build the listing directory using the reusable table, filter, pagination, sorting, status, and error patterns established in Super Admin Step 2.

The directory must use server-side capabilities for:

- text search;
- listing type and category;
- property intent such as sale or rent;
- location or geography filters where supported;
- owner type and broker/agency association;
- listing lifecycle status;
- verification status;
- moderation status;
- publication/discoverability status;
- report or risk flags where authorized;
- created, updated, submitted, or reviewed date ranges;
- assignment or queue state where supported;
- stable sorting and cursor/page pagination.

Do not download the full listing dataset and filter it locally.

### 6.2 Required table distinctions

The table must not collapse multiple independent concepts into one ambiguous status badge. Where returned by the backend, display separate columns or clearly grouped fields for:

- listing lifecycle state;
- verification state;
- moderation/review state;
- publication/discoverability state;
- owner or managing party;
- listing category/type;
- last updated timestamp;
- last reviewed timestamp;
- report/risk summary;
- assigned reviewer or queue status.

A listing being verified does not automatically mean it is published. A listing being published does not prove that every underlying claim is currently valid. The UI must reflect backend-provided state rather than infer relationships.

### 6.3 Directory states

Explicitly support:

- initial loading;
- first-page success;
- subsequent-page loading;
- empty dataset;
- no results for the selected filters;
- malformed or unsupported filter values;
- permission denied;
- expired session;
- network failure;
- rate limiting;
- server error;
- stale results after a mutation;
- listing changed between list and detail view;
- listing no longer accessible;
- partial or unavailable aggregate counts.

### 6.4 Query persistence and request safety

- Preserve non-sensitive filters when returning from detail to the directory.
- Use deterministic query keys.
- Cancel, ignore, or supersede stale requests when filters change rapidly.
- Use shared debounce behavior for text search.
- Do not place sensitive search terms or private identifiers into URLs without approval.
- Do not assume that a list row remains current after a command succeeds.
- Refresh the affected row or invalidate the relevant query after state-changing actions.

---

## 7. Listing Detail and Review Workbench

### 7.1 Detail layout

The listing detail view should be organized into clear sections, using reusable cards, tabs, drawers, or panels:

1. **Summary:** stable identifier, title or safe display label, listing type, category, intent, and current backend statuses.
2. **Location:** public-safe location data and any restricted location fields only when authorized.
3. **Commercial details:** price, rent, deposit, area, and other approved listing attributes.
4. **Media:** approved image/video/document metadata and secure viewer controls.
5. **Owner and relationships:** owner type, broker, agency, and relevant relationship indicators.
6. **Verification:** verification status, required evidence, review history, and backend-provided reasons.
7. **Moderation:** moderation state, flags, reports, review history, and available decisions.
8. **Publication:** publication eligibility/status, visibility restrictions, and backend-provided blockers.
9. **Trust and search signals:** only the operational signals explicitly authorized for administrators; do not expose internal formulas unnecessarily.
10. **Activity and audit:** timestamps, actor labels, event history, and audit references returned by the backend.
11. **Related entities:** safe links to the relevant user, broker, agency, report, visit, lead, or transaction where permitted.

### 7.2 Read-only by default

The detail view must begin as read-only. Editable controls should appear only for fields backed by an explicit administrative command and permission.

Do not turn every displayed field into an editable form. In particular, do not allow ad hoc edits to ownership, verification outcome, publication state, financial data, or moderation history.

### 7.3 Review workbench structure

The review workbench should make the decision context visible without encouraging rushed approval:

- listing summary and current state;
- review queue metadata;
- evidence checklist returned by the backend;
- media/document preview area;
- owner and relationship context;
- reported issue or moderation trigger;
- previous decisions and reasons;
- known blockers or missing information;
- available backend-supported actions;
- mandatory reason and confirmation area;
- command status and audit reference after submission.

The workbench must clearly distinguish:

- information supplied by the listing owner;
- information verified by the platform;
- information flagged for review;
- administrator-entered notes;
- backend-generated risk or policy signals.

Do not represent an unverified claim as a fact.

---

## 8. Verification and Evidence Review

### 8.1 Backend-defined verification states

Use only backend-defined verification statuses and transitions. Possible states may include pending, under review, approved, rejected, expired, or needs additional information, but the exact values must come from the shared contract.

Do not hardcode an assumed state machine in the frontend.

### 8.2 Evidence presentation

For each evidence item returned by the backend, show only the approved metadata, such as:

- evidence type;
- submission timestamp;
- status;
- review timestamp;
- expiration date, if applicable;
- missing or invalid indicator;
- safe filename or label;
- reviewer outcome;
- secure-view action when permitted.

Sensitive documents must be accessed through the approved backend-mediated mechanism, such as a short-lived authorized URL or streamed response. The Panel must not persist long-lived document URLs in local storage, analytics, logs, query parameters, or application state beyond what is necessary.

### 8.3 Verification decision workflow

When the backend supports a verification decision:

1. Load the latest listing and evidence state.
2. Confirm the administrator has the required permission.
3. Display the backend-provided decision options.
4. Require any mandatory reason, structured category, or missing-information selection.
5. Show the likely operational consequence supplied by the backend, if available.
6. Require explicit confirmation for approval, rejection, or other high-impact actions.
7. Submit through the shared API client with the required idempotency or command token.
8. Show pending state if the operation is asynchronous.
9. Refresh the listing, queue item, evidence status, and audit reference after completion.
10. Handle conflicts if another reviewer changed the record first.

The frontend must not decide whether documents are authentic, whether ownership is valid, or whether a listing satisfies policy.

### 8.4 Additional-information workflow

If the backend supports a request for additional information:

- use backend-defined reason categories;
- validate required fields locally for usability but rely on backend validation for authority;
- show the recipient-facing consequence only when returned by the backend contract;
- prevent duplicate submissions;
- show pending status and the resulting review state;
- avoid exposing internal moderation notes to listing owners through the admin UI unless explicitly intended by the backend.

---

## 9. Moderation, Reports, and Publication Actions

### 9.1 Moderation queue

The moderation queue should support only backend-provided queue semantics, including where available:

- unreviewed listings;
- listings requiring additional information;
- reported listings;
- listings with risk or duplicate flags;
- listings whose publication status is blocked;
- listings awaiting verification;
- listings requiring re-review after an update;
- assigned, claimed, or unassigned review items.

If queue assignment or claiming is not supported by the backend, do not simulate ownership of a review item locally.

### 9.2 Report context

A listing report view may display:

- report category;
- report description;
- submission time;
- reporter visibility permitted by policy;
- attached evidence metadata;
- report status;
- related listing state;
- prior administrative actions;
- duplicate or linked report indicators when provided.

Protect reporter identity and personal information according to the privacy contract. Do not reveal internal case notes or sensitive reporter details by default.

### 9.3 Supported moderation actions

Expose only actions returned by the backend for the current listing state and administrator permission. Examples may include:

- approve a moderation review;
- reject or decline a listing;
- request additional information;
- mark a report as reviewed;
- escalate a case;
- suspend or restrict visibility;
- restore visibility;
- withdraw or unpublish a listing;
- reopen a review;
- assign or claim a review item;
- close or link a report.

The exact action names, prerequisites, reasons, and transitions must come from the API contract.

### 9.4 Publication and discoverability

The UI must treat publication as a backend-governed outcome. It must not equate:

- profile completion with publication eligibility;
- verification approval with automatic publication;
- moderation approval with guaranteed search-index availability;
- a successful command response with immediate propagation to every projection.

When the backend reports an asynchronous publication or indexing process, show a pending state and explain that downstream propagation is in progress without promising a fixed completion time unless the backend supplies one.

### 9.5 Search and ranking boundary

The Super Admin Panel may display supported operational information about search visibility, ranking eligibility, sponsored status, or indexing health, but it must not:

- calculate the quality-first ranking score in the browser;
- change the 40% verification, 30% rating, and 30% verified-closure formula locally;
- modify search indexes directly;
- expose internal risk or ranking metadata to unauthorized users;
- create unapproved sponsored placement or ranking boosts.

Any administrative control over sponsored listings or ranking governance must be implemented only in a separately approved contract and must preserve clear labeling and auditability.

---

## 10. Action Safety and Confirmation Matrix

| Action category | UI behavior | Required safeguards |
|---|---|---|
| Read listing details | Immediate navigation or panel open | Current permission and data fetch |
| Open approved evidence | Explicit viewer action | Permission check, short-lived access, no insecure persistence |
| Assign/claim review | Confirmation where required | Backend authorization and conflict handling |
| Request more information | Structured dialog | Backend-defined reason, validation, auditability |
| Approve or reject review | Explicit confirmation | Required reason, current-state check, idempotency, audit |
| Suspend, withdraw, or restore visibility | High-impact confirmation | Impact summary, reason, step-up where required, audit |
| Bulk operation | Separate approved workflow only | Preview, bounded selection, server-side validation, progress and partial-failure handling |
| Destructive or irreversible action | Strong confirmation | Exact entity context, typed confirmation where required, step-up and audit |

### 10.1 Double-submit protection

- Disable or guard command controls while a request is in flight.
- Use the shared idempotency mechanism when required.
- Do not retry a non-idempotent command blindly.
- Preserve the command result if the network response is lost and the backend supports status lookup.
- Do not display success merely because a button was clicked.

### 10.2 Stale and conflicting data

Before a high-impact action, use the latest backend state or a backend-provided version/ETag/concurrency token.

If the backend reports a conflict:

- explain that the listing changed;
- discard or revalidate stale action context;
- reload the latest listing and review state;
- require the administrator to reassess the action;
- do not silently overwrite the other reviewer's decision.

---

## 11. API Integration Contract

### 11.1 Read operations

Before implementation, document the actual contracts for:

- paginated listing search;
- listing detail;
- listing status and lifecycle summary;
- verification summary and evidence metadata;
- secure evidence access;
- moderation queue;
- moderation history;
- report list and report detail;
- publication/search visibility summary;
- related owner, broker, agency, or transaction references;
- audit references and activity timeline.

For each operation record:

- HTTP method and route;
- request parameters;
- response schema;
- pagination and sorting rules;
- required permission;
- resource-scope requirements;
- redaction rules;
- cacheability;
- error codes;
- freshness expectations.

### 11.2 Command operations

Document the actual contracts for each supported command, including:

- verification decisions;
- moderation decisions;
- additional-information requests;
- review assignment or claiming;
- report updates;
- publication-related actions;
- suspension, withdrawal, or restoration;
- escalation or reopening.

Every command must specify:

- allowed source states;
- allowed target outcomes;
- required fields and reason codes;
- permission and scope requirements;
- idempotency requirements;
- step-up requirements;
- synchronous or asynchronous behavior;
- conflict behavior;
- audit behavior;
- resulting events and cache invalidation expectations.

### 11.3 Query and mutation separation

Keep read operations and commands separate in the frontend architecture. A query hook must not silently mutate state, and a mutation hook must not fabricate an optimistic final status when the authoritative outcome is asynchronous or uncertain.

Use shared API, validation, error, authentication, and query/cache utilities. Do not create a second API client or error format.

---

## 12. Frontend Structure Guidance

Use the existing Super Admin application structure and adapt names to the actual repository. A possible organization is:

```text
apps/super-admin/src/
├── app/
│   └── routes/
│       ├── listings/
│       ├── moderation/
│       ├── verification/
│       └── reports/
├── features/
│   └── listing-governance/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── schemas/
│       ├── state/
│       ├── mappers/
│       └── tests/
├── components/
│   └── shared/
└── lib/
```

### 12.1 Component responsibilities

Components should focus on:

- rendering backend data;
- collecting user input;
- presenting loading, pending, error, and conflict states;
- invoking typed hooks or command services;
- displaying permission-aware controls.

Do not place listing eligibility, verification validity, ownership adjudication, moderation policy, ranking formulas, or publication transitions in components.

### 12.2 Local state versus server state

- **Server state:** listing details, queue results, evidence metadata, reports, statuses, history, and command outcomes.
- **Local UI state:** selected tab, open dialog, evidence preview state, filter panel visibility, draft reason text, and confirmation state.
- **Navigation state:** safe listing identifiers and non-sensitive filter context.
- **Session/authorization state:** current administrator, effective permissions, session state, and step-up state.

Do not store full sensitive listing or evidence payloads in navigation parameters. Do not cache secure document URLs longer than necessary.

---

## 13. Privacy and Security Requirements

### 13.1 Data minimization

- Show only the listing and owner information needed for the current administrative task.
- Mask or redact private contact data unless the policy and permission explicitly allow access.
- Do not expose private property coordinates or sensitive ownership documents by default.
- Do not include personal data, document contents, or internal risk data in analytics events.
- Avoid logging complete API responses.

### 13.2 Authorization

- Enforce permissions on the backend for every read and command.
- Treat UI visibility as convenience, not authorization.
- Re-check permissions for deep links and high-impact actions.
- Respect administrator scope restrictions where the platform introduces scoped administrative roles.
- Handle permission revocation during an active session safely.

### 13.3 Secure media and document handling

- Use backend-approved short-lived access or streaming.
- Do not place document URLs in query strings, persistent logs, or analytics.
- Revoke or discard temporary viewer state when leaving the listing.
- Prevent unauthorized download or sharing controls from appearing.
- Avoid browser caching of sensitive documents where the platform security contract disallows it.

### 13.4 Auditability

For every high-impact action, ensure the backend can attribute:

- actual administrator identity;
- action and target entity;
- previous and resulting state where supported;
- reason or decision category;
- timestamp;
- correlation/request identifier;
- step-up or confirmation context where required.

The frontend must not allow an administrator to choose another actor identity or rewrite historical audit entries.

---

## 14. Accessibility and Usability Requirements

The listing governance interface must provide:

- keyboard-accessible tables, tabs, dialogs, drawers, and evidence controls;
- visible focus states;
- semantic headings and landmarks;
- accessible labels for status badges and action buttons;
- non-color-only status communication;
- clear confirmation and cancellation paths;
- readable error and pending messages;
- adequate contrast and responsive behavior;
- accessible alternatives when media cannot load;
- confirmation dialogs that identify the exact listing and action;
- preserved context after closing a review dialog or returning from detail.

Avoid dense tables that hide critical distinctions. Important state differences must remain understandable to users relying on assistive technology.

---

## 15. Observability and Diagnostics

The frontend should integrate with existing observability utilities without sending sensitive listing data.

Track operationally useful, privacy-safe signals such as:

- listing directory load success/failure;
- moderation queue load latency;
- command initiation and outcome category;
- permission-denied occurrences;
- conflict responses;
- secure evidence-view failures;
- pending-command duration buckets;
- API rate-limit responses;
- unexpected schema or state values.

Do not log:

- full personal contact details;
- document contents;
- secure document URLs;
- private coordinates;
- authentication secrets;
- raw moderation notes;
- complete listing payloads containing sensitive data.

Use correlation IDs and backend audit references where available.

---

## 16. Testing Requirements

### 16.1 Unit and component tests

Test:

- status rendering when lifecycle, verification, moderation, and publication states differ;
- permission-aware action visibility;
- reason and confirmation validation;
- query parameter serialization and parsing;
- stale response protection;
- pending, success, error, denied, and conflict states;
- safe rendering of missing or redacted fields;
- evidence viewer cleanup;
- accessible labels and keyboard behavior.

### 16.2 Integration tests

Test:

- paginated listing directory integration;
- filter and sort contract handling;
- listing detail loading;
- moderation queue loading;
- verification evidence metadata retrieval;
- secure evidence access flow;
- command submission and query invalidation;
- asynchronous command polling or status refresh where required;
- audit-reference display;
- related-entity navigation with permission checks.

### 16.3 Security tests

Test that:

- unauthorized administrators cannot read restricted listings;
- forbidden commands cannot be triggered by manually calling frontend handlers;
- private owner information is not rendered by default;
- secure evidence URLs are not persisted or logged;
- stale permissions do not permit high-impact actions;
- listing IDs cannot be used to enumerate inaccessible records;
- internal risk, moderation, and ranking data is not exposed to lower-privilege roles;
- malformed filters and unsupported action values are rejected safely;
- duplicate commands do not create duplicate decisions;
- conflict responses do not overwrite newer decisions.

### 16.4 End-to-end tests

Cover at least:

1. Administrator opens the listing directory and applies supported filters.
2. Administrator opens a listing detail page and sees distinct state categories.
3. Administrator opens a moderation queue item.
4. Administrator views approved evidence through the secure flow.
5. Administrator submits a valid review decision with a required reason.
6. The UI displays pending state for an asynchronous backend operation.
7. A second reviewer changes the listing before the first reviewer submits; the first action receives a safe conflict outcome.
8. A listing becomes inaccessible after the directory was loaded.
9. A listing is suspended or withdrawn and the UI refreshes its state correctly.
10. A user without the required permission cannot access the review route or command.
11. A failed command can be retried safely according to its idempotency contract.
12. A report is reviewed without exposing unauthorized reporter information.

### 16.5 Accessibility testing

Run automated accessibility checks and manual keyboard/screen-reader checks for:

- directory tables;
- filter controls;
- detail tabs;
- evidence viewer;
- review dialogs;
- confirmation dialogs;
- status and error announcements.

---

## 17. Implementation Deliverables

The developer must deliver:

1. Permission-aware listing directory.
2. Listing detail and review workbench.
3. Moderation and verification queue surfaces supported by the backend.
4. Listing status, verification, moderation, publication, and report filters.
5. Secure evidence metadata and viewer integration.
6. Backend-backed review and moderation command controls.
7. Safe reason, confirmation, and high-impact-action components.
8. Listing-to-user, broker, agency, report, and related-entity links where permitted.
9. Query keys, invalidation, refresh, and asynchronous-state handling.
10. Reusable listing-governance status and audit-reference components.
11. Privacy-safe observability instrumentation.
12. Unit, integration, security, accessibility, and E2E tests.
13. API-contract inventory for all consumed listing-governance operations.
14. Documentation of unavailable backend capabilities and unresolved blockers.

---

## 18. Acceptance Criteria

This step is complete only when:

1. Authorized administrators can access the listing directory through the shared Super Admin shell.
2. Listing data is loaded through approved backend APIs with server-side pagination and supported filtering.
3. Lifecycle, verification, moderation, and publication states are displayed as distinct concepts.
4. Listing detail pages clearly separate summary, ownership, evidence, moderation, publication, reports, and audit information.
5. The Panel does not independently decide listing validity, ownership, verification, moderation, or publication eligibility.
6. Evidence is accessed only through an approved secure backend mechanism.
7. Only backend-supported actions are shown and executed.
8. High-impact actions require the confirmation, reason, idempotency, and step-up safeguards required by the shared contract.
9. Asynchronous publication, indexing, or moderation operations are represented as pending until authoritative completion is known.
10. Stale data, permission revocation, inaccessible listings, duplicate submissions, and concurrent review conflicts are handled safely.
11. Private owner information, documents, coordinates, internal risk signals, and moderation notes are not exposed by default.
12. Search ranking, sponsored placement, and index synchronization logic are not duplicated in the frontend.
13. Administrative decisions are attributable to the actual administrator and expose audit references where supported.
14. Related User App, Broker App, Agency Portal, and Public Website boundaries remain intact.
15. Automated and manual tests cover normal, denied, sensitive, destructive, asynchronous, and conflict scenarios.
16. Missing or contradictory source/API contracts are documented as blockers rather than silently resolved.

---

## 19. AI IDE Execution Instructions

Implement this step in the following order:

1. Read the BRD, SOW, finalized decisions, Shared Core Blueprint Steps 1–12, User App Blueprint Steps 1–12, Super Admin Steps 1–4, repository documentation, and current code.
2. Inspect the actual listing, ownership, verification, moderation, report, publication, search, audit, and secure-media API contracts.
3. Produce a capability inventory mapping every proposed screen and action to an existing endpoint, schema, permission, and backend state.
4. Identify missing endpoints, unsupported filters, missing state definitions, or unresolved policy questions before writing production UI.
5. Reuse the Step 2 application shell and the Step 4 entity-detail, permission, table, dialog, status, and audit patterns.
6. Implement the read-only listing directory and detail view first.
7. Add moderation and verification queues only where backend queue semantics are available.
8. Add secure evidence viewing only after the access mechanism and redaction policy are confirmed.
9. Add one command workflow at a time, with explicit confirmation, idempotency handling, query invalidation, and audit-reference behavior.
10. Add conflict, stale-data, permission-revocation, asynchronous, and rate-limit handling.
11. Add tests for each capability before marking it complete.
12. Verify that sensitive data is not logged, cached insecurely, placed in URLs, or sent to analytics.
13. Run type checks, linting, unit tests, integration tests, security checks, accessibility checks, and relevant E2E tests.
14. Record all unresolved blockers in the agreed project decision or issue format.
15. Do not mark a feature complete merely because a table, button, or review page renders; the full contract includes authorization, backend behavior, privacy, auditability, error handling, and tests.

### Non-negotiable implementation rules

- Do not invent API routes, permissions, statuses, reason codes, or transitions.
- Do not implement business rules in React components.
- Do not use direct database or infrastructure access from the browser.
- Do not treat hidden controls as authorization.
- Do not fabricate successful moderation, verification, publication, or suspension outcomes.
- Do not bypass ownership, evidence, retention, moderation, or publication policies.
- Do not directly update search indexes or ranking data from the Panel.
- Do not expose sensitive evidence, private contact data, or internal risk signals by default.
- Do not add unapproved impersonation or bulk destructive operations.
- Do not duplicate shared authentication, API, validation, error, audit, event, or observability utilities.
- Do not silently resolve contradictions between the BRD, SOW, finalized decisions, backend contracts, and this blueprint.

---

## 20. Definition of Done

The step is done when the Super Admin Panel provides a secure, tested, contract-driven interface for reviewing and governing platform listings, verification evidence, moderation cases, reports, and supported publication-related actions, while all authoritative listing rules and state transitions remain in the Shared Core Backend and all cross-interface boundaries remain intact.
