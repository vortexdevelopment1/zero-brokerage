# Super Admin Panel Blueprint — Step 4: Platform Entity Governance, Users, Brokers, Agencies, and Verification

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network  
**Interface:** Super Admin Panel / VortexCubes Command Center  
**Document path:** `blueprints/04-super-admin-panel/step-04-platform-entity-governance-users-brokers-agencies-and-verification.md`  
**Status:** Implementation blueprint  
**Primary audience:** Super Admin developer, Shared Core Backend team, QA, security reviewer, technical lead, and release owner

---

## 1. Purpose

This document defines the implementation contract for the Super Admin Panel's platform-level governance of user accounts, broker profiles, agency organizations, memberships, broker verification, and account lifecycle actions.

The objective is to provide authorized platform operators with controlled, auditable operational tools to inspect and manage platform entities without moving business rules into the frontend. The Super Admin Panel must consume the Shared Core Backend's authoritative APIs for entity state, verification decisions, permissions, ownership, retention, and lifecycle transitions.

This step introduces the operational interface for platform identity and participant governance. It does **not** redefine the underlying identity, user, broker, or agency domain models. Those remain owned by the Shared Core Backend.

The implementation must preserve the following principle:

> The Super Admin Panel is an administrative client of the platform. It may request and display governed actions, but the backend decides whether an action is valid, permitted, safe, and complete.

---

## 2. Mandatory Source and Dependency Review

Before implementing this step, the AI IDE and developer must read and reconcile all of the following:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. User App Blueprint Steps 1–12.
6. Super Admin Blueprint Steps 1–3.
7. Repository documentation under `docs/`, especially:
   - identity and authorization contracts;
   - database/domain inventory;
   - API conventions and error format;
   - security and privacy rules;
   - event and audit contracts;
   - observability and configuration conventions.
8. Existing `apps/super-admin` code and shared packages.
9. The currently implemented backend routes and API schemas for users, brokers, agencies, memberships, verification, sessions, audit logs, and account lifecycle operations.

### 2.1 Decision precedence

Use this order of authority:

1. Explicitly finalized critical Zero Brokerage decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Shared Core Backend contracts.
5. Earlier Super Admin blueprint steps.
6. Repository documentation and existing approved API contracts.
7. Routine implementation decisions approved by the technical lead.

If a conflict or missing contract is discovered:

- record it as a blocker or decision item;
- identify the exact source and affected workflow;
- do not invent a new status, permission, endpoint, or transition in the UI;
- do not silently reinterpret an existing business rule.

### 2.2 Architectural reconciliation

The SOW describes a broader microservices-oriented target architecture. The finalized implementation baseline is a **modular monolith with one deployable Fastify API**. Therefore:

- the Super Admin Panel must use the shared Fastify API;
- no separate admin backend may be created;
- no browser code may connect directly to PostgreSQL, PostGIS, Redis, object storage, payment providers, messaging providers, or job infrastructure;
- verification, suspension, deletion, retention, ownership, and permission rules must remain in the backend;
- the frontend must reuse the shared API client, validation, error, authentication, authorization, audit, and observability conventions.

---

## 3. Scope of This Step

### 3.1 Included

Implement the Super Admin operational experience for:

- platform-wide user directory;
- user detail and safe profile inspection;
- user account status and lifecycle visibility;
- broker directory and broker detail;
- broker onboarding and verification status visibility;
- review of broker verification evidence through approved secure access patterns;
- broker verification actions exposed by the backend contract;
- broker publication/visibility status where supported by the backend;
- agency directory and agency detail;
- agency status and operational metadata;
- agency membership and broker-assignment visibility;
- controlled agency lifecycle actions exposed by the backend;
- account suspension, reactivation, and other supported lifecycle actions;
- controlled deletion or archival request initiation where explicitly supported;
- dependency-aware confirmation and warning interfaces;
- filtering, pagination, sorting, and search parameters supported by the API;
- audit and activity-history entry points for administrative actions;
- permission-aware action visibility;
- safe handling of sensitive personal and verification information;
- unit, integration, security, accessibility, and end-to-end tests for these workflows.

### 3.2 Explicitly excluded

Do not implement or redefine the following in this step:

- a new authentication or session system;
- a new role or permission model;
- broker verification rules in the frontend;
- direct editing of immutable identity fields unless the backend explicitly exposes a governed operation;
- direct database editing or administrative SQL consoles;
- listing creation, listing moderation, listing publication, or property verification workflows;
- visit, lead, commission, payment, subscription, settlement, or transaction business logic;
- agency-side operational workflows that belong in the Agency Portal;
- broker-side workflows that belong in the Broker App;
- user-facing profile or privacy workflows that belong in the User App;
- unapproved impersonation or login-as-user functionality;
- bulk destructive actions without an explicitly approved backend contract;
- permanent deletion implemented only as a frontend record removal;
- exposing raw identity documents, contact information, or financial data merely because the operator has a valid admin session;
- inventing additional verification statuses or lifecycle transitions.

---

## 4. Ownership and Responsibility Boundaries

### 4.1 Shared Core Backend owns

The backend remains authoritative for:

- canonical user, broker, and agency records;
- identity linkage between accounts and profiles;
- account status and lifecycle transitions;
- agency membership and role relationships;
- broker verification requirements and eligibility;
- verification evidence metadata, storage, access policy, and retention;
- verification decision validity;
- broker publication or discoverability eligibility;
- suspension consequences across sessions, listings, leads, visits, and other capabilities;
- deletion, archival, anonymization, and retention behavior;
- authorization and high-risk-action enforcement;
- audit records and actor attribution;
- event publication and asynchronous side effects.

### 4.2 Super Admin Panel owns

The frontend is responsible for:

- presenting searchable, paginated directories;
- rendering authoritative statuses and timestamps;
- showing only actions permitted by the current administrator's effective capabilities;
- collecting required reason, confirmation, or review input;
- presenting evidence through approved secure viewers or short-lived URLs;
- displaying dependency warnings and backend validation errors;
- preventing accidental duplicate submissions;
- showing pending, successful, failed, denied, and conflict states;
- linking each sensitive action to its audit context where supported;
- making destructive or high-impact operations explicit and difficult to trigger accidentally.

### 4.3 Other interfaces

- The User App owns the user's self-service profile, preferences, privacy, and account-management experience.
- The Broker App owns broker self-service onboarding, profile completion, evidence submission, and broker operational workflows.
- The Agency Portal owns agency-side profile, membership, and agency operations.
- The Public Website consumes only backend-authorized public data and must not expose administrative controls.

A Super Admin action must not be implemented by duplicating a user-facing or broker-facing workflow in the wrong application. The Panel should provide governance controls, not replace the operational interfaces.

---

## 5. Information Architecture and Routes

Use the route and layout conventions established in Super Admin Blueprint Steps 1–3. Exact route names must follow the existing application conventions; do not invent routes that conflict with the repository.

A possible capability-oriented route grouping is:

```text
/admin
├── /users
│   ├── /
│   └── /[userId]
├── /brokers
│   ├── /
│   └── /[brokerId]
├── /agencies
│   ├── /
│   └── /[agencyId]
└── /verification
    ├── /brokers
    └── /brokers/[brokerId]
```

These paths are illustrative. The developer must first inspect the current route structure and use the approved naming convention.

### 5.1 Navigation placement

The module may appear under a platform-governance or entity-management navigation group. Navigation visibility must be driven by effective permissions/capabilities returned by the backend.

Do not display a navigation item merely because the current user is labelled `super_admin` in a local object. The UI must use the shared authorization contract.

### 5.2 Deep-link requirements

Deep links to a user, broker, agency, or verification review must:

- revalidate the current admin session;
- re-fetch the entity from the backend;
- re-check the administrator's current permission and resource scope;
- handle deleted, archived, suspended, or no-longer-accessible entities;
- never assume that a previously visible entity remains accessible;
- preserve safe filter context only when it does not leak sensitive information.

---

## 6. Directory and Listing Experience

### 6.1 General directory contract

Each directory must be built on the reusable table, filter, pagination, and state patterns from Step 2.

Every directory must support only API-backed capabilities for:

- pagination;
- sorting;
- filtering;
- text search;
- status filtering;
- date-range filtering, if supported;
- verification-state filtering, where applicable;
- agency or membership filtering, where applicable.

The frontend must not download the entire database and filter it locally for convenience.

### 6.2 Required list states

Each directory must explicitly support:

- initial loading;
- first-page success;
- subsequent-page loading;
- empty result set;
- no-result-for-filter state;
- malformed or unsupported filter state;
- permission denied;
- expired session;
- network failure;
- rate-limited response;
- server error;
- stale result after a mutation;
- entity changed or removed between list and detail navigation.

### 6.3 User directory

The user directory should display only fields approved for administrative visibility, such as:

- stable user identifier or masked identifier;
- display name, where available;
- masked or policy-approved contact identifier;
- account status;
- account creation timestamp;
- last activity or last-seen information only when approved;
- associated broker or agency relationship indicators where relevant;
- verification or trust indicators only when provided by the backend;
- relevant flags or restriction summaries where authorized.

The UI must not expose complete personal data by default. Sensitive values should be masked, redacted, or loaded only through an explicit, permission-checked detail operation.

### 6.4 Broker directory

The broker directory should support backend-provided filters for:

- broker account status;
- verification status;
- publication/discoverability status;
- independent versus agency affiliation, where supported;
- agency association;
- onboarding completion state;
- submitted or last-reviewed date;
- operational flags or restrictions where authorized.

The list should clearly distinguish:

- account status;
- broker-profile completion status;
- verification status;
- publication/visibility status.

These are not interchangeable states and must not be represented by one ambiguous badge.

### 6.5 Agency directory

The agency directory should support backend-provided filters for:

- agency status;
- onboarding state;
- verification or approval state where applicable;
- membership count, if returned as an approved aggregate;
- creation date;
- operational flags or restrictions where authorized.

The directory must not imply that an agency is verified merely because it exists or has active members.

### 6.6 Pagination and query persistence

- Use server-side pagination and stable sort order.
- Preserve filters when navigating to a detail page and returning to the directory, where practical.
- Avoid putting sensitive search terms into URLs unless the approved privacy policy allows it.
- Debounce text search according to the shared frontend convention.
- Cancel or ignore stale requests when filters change rapidly.
- Use request identifiers or query keys that prevent stale responses from overwriting newer results.

---

## 7. User Detail and Account Governance

### 7.1 User detail layout

A user detail page should be organized into explicit sections rather than one unrestricted data dump:

1. **Identity summary** — approved display information and stable identifier.
2. **Account state** — active, restricted, suspended, archived, pending, or other backend-defined state.
3. **Profile summary** — only fields authorized for administrative viewing.
4. **Platform relationships** — broker or agency links, if applicable and permitted.
5. **Activity summary** — only approved aggregates or references.
6. **Restrictions and flags** — backend-provided explanations without exposing internal security details unnecessarily.
7. **Administrative actions** — only permitted operations.
8. **Audit/activity entry point** — administrative history accessible through the audit contract.

The exact state names must come from the backend contract. Do not hardcode an assumed state machine.

### 7.2 Safe account actions

Possible actions include, only if exposed by the backend and allowed by permission policy:

- suspend account;
- reactivate account;
- place or remove a supported restriction;
- initiate an account review;
- request archival or deletion workflow;
- view active sessions or security events through the approved contract;
- add an administrative note if the domain contract supports it.

Each action must declare:

- required capability;
- affected entity;
- whether a reason is mandatory;
- whether step-up authentication is required;
- whether the action is reversible;
- expected asynchronous or pending state;
- expected downstream effects;
- audit event requirement.

### 7.3 Suspension UX

Suspension is a high-impact action. The confirmation flow must:

1. display the exact account/entity being affected;
2. explain the backend-provided consequences;
3. require a reason when required by policy;
4. prevent accidental confirmation through a simple one-click path;
5. require step-up authentication if the backend demands it;
6. submit an idempotent command through the approved API;
7. show the resulting status from the backend;
8. refresh or invalidate affected queries;
9. communicate that related capabilities may be revoked according to platform policy;
10. show failure or conflict details without claiming success prematurely.

The frontend must not independently decide which listings, leads, sessions, visits, or other capabilities are revoked. It must display the consequences returned by the backend or documented by the shared contract.

### 7.4 Deletion, archival, and retention

The Panel must treat deletion as a governed lifecycle workflow, not a local record removal.

If the backend exposes deletion or archival operations, the UI must:

- explain whether the operation is immediate, scheduled, reversible, or review-based;
- show retention-related warnings supplied by the backend;
- distinguish anonymization from physical deletion;
- preserve required financial, legal, fraud, security, and audit history;
- require explicit confirmation and any required reason;
- display blockers when dependencies prevent the operation;
- never promise that all historical records will disappear if retention rules require preservation.

If no approved backend operation exists, the UI must not add a fake delete button. It may provide a documented support or review entry point only if that capability is approved.

---

## 8. Broker Governance and Verification Review

### 8.1 Broker detail layout

The broker detail page should separate the following concepts:

- identity/account summary;
- broker profile and professional information;
- independent or agency affiliation;
- agency memberships or assignments, if authorized;
- onboarding completion;
- verification status and review history;
- evidence metadata and secure document access;
- publication/discoverability status;
- platform restrictions or flags;
- related administrative actions;
- audit/activity history.

Do not combine account activation, profile completion, professional verification, and public discoverability into one status.

### 8.2 Verification status handling

The frontend must render the exact verification states supplied by the backend. The implementation must not assume that a generic sequence such as `pending → approved → rejected` is complete.

The UI must be prepared for backend-defined states such as:

- not submitted;
- draft or incomplete;
- submitted;
- under review;
- additional information required;
- approved;
- rejected;
- expired;
- suspended or revoked;
- superseded by a newer submission.

These examples are not permission to create new backend states. If the API exposes a different state vocabulary, use that vocabulary and document any display-label mapping.

### 8.3 Evidence review

Evidence review must follow the security contract for sensitive documents:

- document metadata may be displayed only to authorized administrators;
- raw documents must not be embedded as publicly accessible URLs;
- use short-lived, permission-checked access URLs or an approved secure viewer;
- do not persist document URLs in local storage, analytics events, logs, or query strings unless explicitly approved;
- revoke or allow expiry of temporary access according to backend policy;
- show document type, submission version, status, and timestamps only when returned by the API;
- show missing, expired, inaccessible, or quarantined evidence states clearly;
- prevent accidental bulk downloading unless specifically authorized;
- avoid rendering sensitive documents in a way that bypasses browser or application access controls.

The SOW's sensitive-document storage and access expectations must be reconciled with the actual backend contract before implementation. The frontend must not invent an object-storage integration.

### 8.4 Verification review workflow

Where the backend exposes a verification-review command, the UI should provide:

1. a review queue or filtered broker directory;
2. a review summary with required evidence and missing items;
3. secure evidence inspection;
4. an internal review checklist based on backend-provided requirements;
5. a decision form with backend-supported outcomes;
6. a mandatory reason or notes field when required;
7. a clear distinction between approval, rejection, request-for-information, suspension, and other outcomes;
8. a final confirmation step;
9. an idempotent command submission;
10. a pending state for asynchronous processing;
11. a result view showing the authoritative new status;
12. a link to the audit record or review history.

The checklist may assist the administrator, but it must not be treated as the legal or business authority. The backend must validate whether the selected outcome is allowed and whether all required evidence/dependencies are satisfied.

### 8.5 Rejection and additional-information UX

When a review outcome requires a reason or missing-information explanation:

- use structured reason options only if the backend supplies them;
- allow free-text notes only within the approved length and content constraints;
- do not expose internal fraud/security signals to the broker unless the backend provides a safe external explanation;
- display the exact externally visible message returned by the backend when applicable;
- avoid presenting an administrative note as a user-facing reason by default.

### 8.6 Publication and discoverability

Broker verification and public discoverability are separate concepts. The Panel may display or manage publication status only through an explicit backend capability.

The frontend must not:

- publish a broker by merely toggling a local switch;
- infer public eligibility from a verification badge;
- bypass required verification, moderation, subscription, or policy dependencies;
- expose a broker publicly while a backend command is still pending or failed.

---

## 9. Agency Governance and Membership Visibility

### 9.1 Agency detail layout

The agency detail page should include, subject to permission and data-minimization rules:

- agency identity and profile summary;
- agency status;
- onboarding or verification state where applicable;
- approved contact and business metadata;
- membership summary;
- broker membership/assignment list;
- agency-owned listing or lead summary only as permitted aggregate/reference data;
- restrictions and flags;
- supported lifecycle actions;
- audit/activity entry point.

Do not reproduce the full Agency Portal. The Panel should provide platform governance and visibility, not agency operational management.

### 9.2 Membership and assignment visibility

The UI must distinguish:

- membership existence;
- membership role;
- membership status;
- broker assignment or operational responsibility;
- agency ownership of applicable resources.

The hybrid lead-ownership decision must be respected: agency-owned leads remain associated with the agency, while broker assignments are relationships managed under the approved backend rules. The Panel must not silently transfer ownership by changing a displayed membership or assignment field.

### 9.3 Agency lifecycle actions

Only expose backend-supported actions such as:

- suspend or reactivate agency;
- initiate review;
- manage an approved agency status transition;
- request archival or deletion workflow;
- inspect membership or restriction information.

Any action affecting agency-owned listings, leads, broker access, or public visibility must display backend-provided impact information and use the backend command as the source of truth.

### 9.4 Membership changes

If Super Admin membership-management actions are approved, the UI must:

- show the exact agency and broker relationship;
- distinguish add, remove, suspend, and role-change operations;
- require the appropriate capability for each operation;
- validate the target role through backend-provided options;
- show ownership and operational impact warnings;
- use idempotency where supported;
- refresh affected agency, broker, and membership queries;
- record or link the resulting audit event.

Do not add membership-edit controls merely because the directory displays memberships.

---

## 10. Action Safety and Confirmation Matrix

The implementation must use the privileged-action patterns from Step 3.

| Action category | UI requirement | Backend requirement |
|---|---|---|
| View ordinary approved metadata | Normal navigation | Permission and field-level policy enforcement |
| View sensitive evidence metadata | Explicitly scoped detail access | Permission, redaction, and audit policy |
| Open a temporary document viewer | Clear access context and expiry indication | Short-lived, authorized access mechanism |
| Suspend user, broker, or agency | Confirmation plus reason where required | State transition validation, side effects, audit |
| Reactivate entity | Confirmation and current-state recheck | Eligibility and transition validation |
| Approve/reject verification | Review summary, required reason/notes, final confirmation | Evidence/dependency validation and authoritative decision |
| Change membership or role | Impact-aware confirmation | Scope, ownership, role, and conflict validation |
| Archive/delete/request deletion | Strong confirmation and retention warning | Governed workflow, retention protection, audit |
| Bulk operation, if approved | Explicit selection summary and bulk safeguards | Dedicated validated bulk command and partial-result contract |

The table is a UX safety guide. It does not grant any operation that is not present in the backend API and permission contract.

### 10.1 Double-submit protection

- Disable or guard the submit action while a command is in flight.
- Use the backend's idempotency mechanism where required.
- Do not treat a network timeout as proof of failure.
- Provide a safe retry or status-refresh path.
- Avoid automatically repeating high-impact commands without explicit idempotency guarantees.

### 10.2 Conflict handling

The UI must handle cases where:

- another administrator changed the entity first;
- the entity's status changed while the detail page was open;
- a verification submission was superseded;
- required evidence expired or was removed;
- the administrator's permission was revoked during the workflow;
- the entity became inaccessible or was archived.

Use the shared error taxonomy and show a recovery action such as refresh, return to queue, or reopen review. Do not overwrite newer backend state with stale local state.

---

## 11. API Integration Contract

Before implementation, the developer must identify the actual backend contracts for each operation. Do not guess endpoint names or response fields.

For every query or command, document:

- HTTP method and route;
- API version;
- authentication requirements;
- required capability/permission;
- resource scope rules;
- request schema;
- response schema;
- pagination and sorting behavior;
- filter vocabulary;
- status vocabulary;
- error codes;
- idempotency requirements;
- asynchronous/pending behavior;
- audit behavior;
- cache invalidation requirements;
- privacy and redaction rules.

### 11.1 Read operations

Likely read categories, subject to actual backend availability:

- paginated users;
- user detail;
- paginated brokers;
- broker detail;
- broker verification history;
- secure evidence metadata/access;
- paginated agencies;
- agency detail;
- agency memberships;
- supported audit/activity references.

### 11.2 Command operations

Likely command categories, subject to actual backend availability:

- suspend entity;
- reactivate entity;
- submit verification decision;
- request additional information;
- manage approved membership relationship;
- initiate archival/deletion workflow;
- add approved administrative note or review annotation.

If a category is not implemented by the backend, mark it as unavailable and do not mock a successful mutation in production code.

### 11.3 Query and mutation separation

Use separate client abstractions for:

- directory queries;
- detail queries;
- verification/evidence queries;
- lifecycle commands;
- membership commands;
- audit/activity queries.

Do not place domain decisions inside generic UI hooks. API hooks may coordinate fetching, caching, invalidation, and error normalization, but they must not decide whether a broker is legally verified or whether an agency may retain ownership.

---

## 12. Frontend Structure Guidance

Adapt this structure to the repository's existing conventions rather than creating a parallel architecture:

```text
apps/super-admin/src/
├── app/
│   └── (protected)/
│       ├── users/
│       │   ├── page.tsx
│       │   └── [userId]/page.tsx
│       ├── brokers/
│       │   ├── page.tsx
│       │   └── [brokerId]/page.tsx
│       ├── agencies/
│       │   ├── page.tsx
│       │   └── [agencyId]/page.tsx
│       └── verification/
│           └── brokers/
│               ├── page.tsx
│               └── [brokerId]/page.tsx
├── features/
│   ├── users/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── schemas/
│   ├── brokers/
│   ├── agencies/
│   ├── verification/
│   └── entity-governance/
├── components/
│   ├── entity-status-badge/
│   ├── secure-evidence-viewer/
│   ├── action-confirmation/
│   └── audit-link/
└── lib/
    ├── permissions/
    ├── query-keys/
    └── api/
```

This is guidance only. Reuse existing shared components and patterns where they already exist.

### 12.1 Component responsibilities

- Directory components render server-backed rows and filters.
- Detail components render approved fields and backend-defined status labels.
- Action components collect user intent and call command hooks.
- Permission guards control visibility but never replace backend authorization.
- Confirmation dialogs explain impact and gather required confirmation data.
- Secure evidence viewers handle temporary access without persisting sensitive URLs.
- Query invalidation utilities refresh all affected views after successful mutations.

### 12.2 Local state versus server state

Keep the following in server-state management:

- users, brokers, agencies, memberships, verification records, statuses, and audit data.

Keep the following local to the UI:

- open/closed dialogs;
- selected table rows;
- filter draft values;
- confirmation text;
- active detail tab;
- temporary viewer state;
- unsaved form values.

Do not copy authoritative entity status into a long-lived local store and treat it as truth.

---

## 13. Privacy and Security Requirements

The implementation must satisfy the security baseline from the earlier blueprints and the finalized project decisions.

### 13.1 Data minimization

- Request only fields required for the current view.
- Mask or redact sensitive contact information by default.
- Do not display identity documents in list views.
- Avoid exposing internal fraud, risk, or security signals unless the administrator has an explicit need-to-know capability.
- Do not send sensitive fields to analytics, error trackers, or client logs.
- Do not put sensitive data in URLs, browser titles, or notification previews.

### 13.2 Authorization

- Protect every route, query, detail view, and command.
- Treat permission data as dynamic and revocable.
- Enforce resource scope server-side.
- Do not rely on hidden buttons as a security control.
- Handle `401`, `403`, and policy-specific denial errors distinctly.

### 13.3 Secure document handling

- Use approved short-lived access mechanisms.
- Do not persist evidence files or URLs in local storage.
- Do not expose object-storage credentials to the browser.
- Prevent accidental download or sharing where the backend/viewer contract requires it.
- Clear temporary viewer state when leaving the page or when access expires.

### 13.4 Auditability

Every high-impact action must be attributable to the actual administrator who performed it. The frontend must not allow an actor identifier to be supplied by the user or taken from a client-controlled field.

The UI should surface the resulting audit reference when available, but the backend owns the audit record and actor attribution.

---

## 14. Accessibility and Usability Requirements

- All tables, filters, tabs, dialogs, and action menus must be keyboard accessible.
- Confirmation dialogs must have clear focus management.
- Destructive actions must have descriptive accessible labels, not only color cues.
- Status badges must include text or accessible labels.
- Evidence-viewer loading and expiry states must be announced appropriately.
- Validation errors must be associated with their inputs.
- Long tables must preserve usable headers and readable row context.
- Do not rely on hover alone to expose critical information.
- Ensure sufficient contrast and responsive behavior for smaller screens, while preserving the desktop-first admin layout.
- Provide clear copy for pending, denied, restricted, expired, and conflict states.

---

## 15. Observability and Diagnostics

Use the shared observability conventions. The frontend may record safe operational telemetry such as:

- route or feature identifier;
- request outcome category;
- latency bucket;
- retry count;
- permission-denied category;
- verification workflow step completion;
- UI error boundary events.

Do not record:

- OTPs or tokens;
- full identity documents;
- raw document URLs;
- complete phone numbers or email addresses;
- sensitive free-text verification notes;
- internal security or fraud details.

For support diagnostics, include correlation/request identifiers when returned by the API. Do not expose internal stack traces to administrators unless an approved diagnostic mode exists.

---

## 16. Testing Requirements

### 16.1 Unit and component tests

Test:

- directory filter serialization;
- pagination and stable sorting behavior;
- status-label mapping from backend values;
- distinction between account, profile, verification, and publication statuses;
- permission-aware action visibility;
- confirmation-dialog requirements;
- reason/notes validation;
- double-submit prevention;
- query invalidation after successful commands;
- masking and redaction behavior;
- secure-viewer expiry and cleanup;
- loading, empty, error, denied, and conflict states.

### 16.2 Integration tests

Test against mocked or staging API contracts for:

- user list and detail retrieval;
- broker list and detail retrieval;
- agency list and detail retrieval;
- verification queue and review details;
- evidence metadata and temporary access flow;
- suspension and reactivation commands;
- verification decisions;
- additional-information requests;
- supported membership operations;
- archival/deletion request initiation, if available;
- `401`, `403`, validation, conflict, rate-limit, timeout, and server-error responses;
- stale-data refresh after a mutation.

### 16.3 Security tests

Verify that:

- unauthenticated users cannot access protected routes;
- an authenticated but unauthorized administrator cannot access restricted modules;
- hidden controls cannot bypass backend authorization;
- sensitive fields are not rendered when omitted or redacted by the API;
- temporary evidence access is not persisted insecurely;
- sensitive values do not appear in logs or analytics payloads;
- stale permissions are handled safely;
- an administrator cannot supply a forged actor identifier;
- destructive actions require the intended confirmation and step-up flow;
- browser navigation cannot reopen an expired or revoked evidence session.

### 16.4 End-to-end tests

Create realistic staging scenarios for:

1. An authorized admin searches for a user and opens a permitted detail page.
2. An admin without the required capability sees a denied state and cannot execute the action.
3. An authorized admin suspends an account with a required reason and sees the authoritative resulting state.
4. A broker verification reviewer opens a queue item, inspects permitted evidence, and submits an approved backend-supported outcome.
5. A verification decision is rejected because a backend dependency is missing; the UI displays the blocker without claiming success.
6. A broker's verification status changes while the review page is open; the UI handles the conflict safely.
7. An agency detail page shows membership information without granting unauthorized membership-management controls.
8. A session expires during a sensitive workflow and the UI safely stops the action.
9. A deletion or archival request is blocked by retention/dependency rules and the UI presents the backend explanation.
10. A temporary evidence URL expires and the viewer clears access state.

### 16.5 Accessibility testing

Run automated accessibility checks and manual keyboard/screen-reader checks for:

- directories;
- detail pages;
- filters;
- confirmation dialogs;
- verification review forms;
- secure evidence viewer states;
- denied and error states.

---

## 17. Implementation Deliverables

The developer must deliver:

1. Permission-aware user directory and user detail experience.
2. Permission-aware broker directory and broker detail experience.
3. Agency directory and agency detail experience.
4. Verification review surfaces only for backend-supported workflows.
5. Secure evidence metadata/viewer integration using approved access mechanisms.
6. Account and entity lifecycle action components for approved commands.
7. Agency membership/assignment visibility and approved management actions, if available.
8. Reusable status, warning, confirmation, and audit-reference components.
9. API client hooks or services using the shared contract conventions.
10. Query keys and invalidation rules for affected entity data.
11. Loading, empty, denied, failure, pending, and conflict states.
12. Unit, integration, security, accessibility, and E2E tests.
13. Documentation of any unavailable backend capability or unresolved contract blocker.

---

## 18. Acceptance Criteria

This step is complete only when:

1. Authorized administrators can access the user, broker, and agency directories through approved routes.
2. Directory data is fetched through the shared backend API with server-side pagination and supported filtering.
3. User, broker, and agency detail pages clearly separate account, profile, verification, publication, membership, and lifecycle concepts.
4. Sensitive data is minimized, masked, redacted, or permission-gated according to the backend contract.
5. Broker verification review uses backend-defined statuses, evidence requirements, and decision outcomes.
6. Evidence is accessed only through an approved secure mechanism and sensitive URLs are not persisted insecurely.
7. Suspension, reactivation, verification, membership, archival, and deletion-related actions are exposed only when supported by the backend and permitted by the current administrator.
8. High-impact actions require the confirmation, reason, and step-up safeguards required by the shared security contract.
9. The UI never independently decides verification validity, account state, ownership, retention, or downstream side effects.
10. Backend conflicts, stale data, permission revocation, expired sessions, and asynchronous command states are handled safely.
11. Administrative actions are attributable to the actual administrator and integrate with audit behavior.
12. The implementation does not create a second authentication system, backend, database access path, or duplicate domain logic.
13. User App, Broker App, Agency Portal, and Public Website boundaries remain intact.
14. Automated and manual tests cover normal, denied, invalid, sensitive, destructive, asynchronous, and conflict scenarios.
15. Any missing or contradictory source/API contract is documented as a blocker rather than silently resolved.

---

## 19. AI IDE Execution Instructions

Implement this step in the following order:

1. Read all mandatory source documents, finalized decisions, earlier blueprints, repository documentation, and current code.
2. Inspect the actual backend contracts for users, brokers, agencies, memberships, verification, evidence access, lifecycle commands, and audit references.
3. Produce a short implementation inventory mapping each UI capability to an existing API contract and permission.
4. Identify missing endpoints, missing schemas, missing status definitions, or unresolved policy questions before writing production UI.
5. Reuse the Step 2 application shell, table, filter, dialog, error, permission, and server-state foundations.
6. Implement read-only directories and detail pages first.
7. Add verification evidence viewing only after the secure access contract is confirmed.
8. Add lifecycle and verification commands one by one, with explicit confirmation and query invalidation.
9. Add agency membership operations only if the backend contract and authority boundaries explicitly support them.
10. Add tests for each capability before marking it complete.
11. Verify that no sensitive data is logged, cached insecurely, placed in URLs, or sent to analytics.
12. Run type checks, linting, unit tests, integration tests, accessibility checks, and relevant E2E tests.
13. Record all unresolved blockers in the project's agreed decision or issue format.
14. Do not mark a feature complete merely because a page or button renders; the complete contract includes authorization, API behavior, error handling, auditability, privacy, and tests.

### Non-negotiable implementation rules

- Do not invent API routes, status values, permissions, or lifecycle transitions.
- Do not implement business logic in React components.
- Do not use direct database or infrastructure access from the browser.
- Do not treat hidden UI controls as authorization.
- Do not create fake successful mutations when the backend capability is unavailable.
- Do not bypass verification, ownership, retention, or suspension policies.
- Do not add unapproved impersonation.
- Do not duplicate shared authentication, API, error, permission, audit, or observability utilities.
- Do not expose sensitive evidence or personal data by default.

---

## 20. Definition of Done

The step is done when the Super Admin Panel provides a secure, tested, contract-driven operational interface for governing users, brokers, agencies, and supported verification/account-lifecycle workflows, while all authoritative decisions remain in the Shared Core Backend and all cross-interface boundaries remain intact.
