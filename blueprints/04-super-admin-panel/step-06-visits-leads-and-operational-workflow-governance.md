# Super Admin Panel Blueprint — Step 6: Visits, Leads, and Operational Workflow Governance

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network  
**Interface:** Super Admin Panel / VortexCubes Command Center  
**Document path:** `blueprints/04-super-admin-panel/step-06-visits-leads-and-operational-workflow-governance.md`  
**Status:** Implementation blueprint  
**Primary audience:** Super Admin developer, Shared Core Backend team, QA, security reviewer, technical lead, and release owner

---

## 1. Purpose

This document defines the implementation contract for the Super Admin Panel's operational governance of property visits, inquiries, leads, broker assignments, agency ownership, and related workflow exceptions.

The objective is to give authorized platform operators controlled visibility into operational workflows and safe tools for handling exceptions, disputes, abuse reports, assignment problems, and service failures. The Panel must consume the Shared Core Backend's authoritative APIs for eligibility, ownership, assignment, state transitions, notifications, privacy, and auditability.

This step implements the **administrative interface** for operational workflow oversight. It does not create a second visits, leads, communication, broker-assignment, or notification engine.

> The Super Admin Panel may inspect and request governed operational actions. The Shared Core Backend remains responsible for deciding whether an action is valid, authorized, safe, and complete.

---

## 2. Mandatory Source and Dependency Review

Before implementing this step, the AI IDE and developer must read and reconcile:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. User App Blueprint Steps 1–12.
6. Super Admin Blueprint Steps 1–5.
7. Repository documentation under `docs/`, especially:
   - visits and leads contracts;
   - broker and agency ownership rules;
   - notification and event contracts;
   - API conventions and error format;
   - privacy, retention, and audit rules;
   - observability and configuration conventions.
8. Existing `apps/super-admin` code and shared packages.
9. Currently implemented backend routes and schemas for visits, inquiries, leads, assignments, broker and agency relationships, communications, notifications, reports, and administrative actions.

### 2.1 Decision precedence

Use this order of authority:

1. Explicitly finalized critical Zero Brokerage decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Shared Core Backend contracts.
5. Earlier Super Admin blueprint steps.
6. Repository documentation and approved API contracts.
7. Routine implementation decisions approved by the technical lead.

If a conflict or missing contract is discovered:

- record the exact conflict as a blocker or decision item;
- identify the affected workflow, screen, permission, and API contract;
- do not invent a lead owner, assignment rule, state transition, or escalation policy;
- do not silently expose private communication content or bypass an ownership restriction.

### 2.2 Architectural reconciliation

The finalized implementation baseline is a **modular monolith with one deployable Fastify API**, even though the SOW describes a broader microservices-oriented target architecture.

Therefore:

- the Panel must consume the shared Fastify API;
- the browser must not connect directly to PostgreSQL, Redis, queues, object storage, or provider APIs;
- lead ownership and visit eligibility must be calculated by shared backend modules;
- administrative commands must use explicit backend contracts and idempotency protections;
- shared authorization, validation, error, audit, event, and observability utilities must be reused.

---

## 3. Scope of This Step

### 3.1 Included

Implement administrative interfaces for:

- visit directory and visit-detail views;
- visit status, date, property, user, broker, and agency filters;
- visit lifecycle visibility and exception handling;
- inquiry and lead directory views;
- lead ownership and assignment visibility;
- independent-broker versus agency-owned lead distinction;
- broker assignment and reassignment requests where explicitly supported;
- unassigned, stale, duplicated, disputed, or failed lead queues;
- lead timeline and operational event history;
- user, broker, agency, and listing context links subject to permission checks;
- communication and notification delivery status metadata;
- approved support or escalation notes;
- backend-supported cancellation, reassignment, escalation, or resolution actions;
- duplicate, stale, conflicting, pending, and failed command handling;
- operational metrics and queue summaries supplied by the backend;
- audit references for administrative actions;
- safe export of approved operational data where an export contract exists.

### 3.2 Explicitly excluded

Do not implement the following unless an approved backend contract explicitly exists:

- a second lead or visit state machine;
- client-side assignment or ownership decisions;
- arbitrary reassignment of agency-owned leads to individual brokers;
- bypassing broker or agency ownership policies;
- direct editing of database records;
- reading full private message bodies merely for convenience;
- impersonating a user, broker, or agency member;
- sending unapproved messages directly from the browser through provider APIs;
- changing visit outcomes or lead conversion facts without an explicit backend command;
- deleting operational history required for audit, dispute, financial, or retention purposes;
- bulk destructive actions without a documented backend workflow;
- automatic lead scoring, fraud decisions, or prioritization implemented in React;
- exposing private contact information beyond the administrator's approved data scope;
- introducing a separate real-time infrastructure solely for this Panel.

---

## 4. Product and Ownership Rules

The UI must accurately represent the finalized ownership model:

### 4.1 Independent-broker lead ownership

Where a lead is generated for an independent broker, the lead belongs to that broker according to the backend ownership contract. The Panel may display the owner and request permitted administrative actions, but must not transfer ownership through local state or direct mutation.

### 4.2 Agency lead ownership

Where a lead is generated for an agency-owned listing or agency workflow, the lead belongs to the agency. A broker may be assigned to work the lead, but assignment does not automatically change the legal or platform ownership of the lead.

The interface must distinguish at least:

- lead owner;
- assigned broker or working broker;
- agency relationship;
- source listing;
- current workflow status;
- assignment status;
- escalation or dispute status.

### 4.3 Visit authority

The backend remains authoritative for:

- whether a visit can be requested;
- whether the requested slot is valid;
- whether the visit is confirmed, rescheduled, cancelled, completed, missed, or otherwise transitioned;
- whether a user, broker, agency, or listing is eligible for a visit;
- whether a visit can be modified after a cutoff;
- which parties may view visit details.

The Panel must not infer a visit's business meaning from a local status label.

---

## 5. Information Architecture

Add the relevant screens under a permission-aware operational-governance navigation group. The exact route names must follow the existing Super Admin routing convention.

Suggested screens:

```text
Operations
├── Visits
│   ├── Visit Directory
│   ├── Visit Detail
│   └── Visit Exceptions
├── Leads & Inquiries
│   ├── Lead Directory
│   ├── Lead Detail
│   ├── Assignment Exceptions
│   └── Escalations
└── Communication Delivery
    ├── Delivery Overview
    └── Failed Delivery Queue
```

These are proposed information-architecture labels, not permission or API names. Implement only routes and capabilities supported by the backend and approved product scope.

### 5.1 Navigation visibility

- Navigation items must be derived from effective backend permissions.
- A locally stored role label must never be treated as sufficient authorization.
- A user without access must not discover restricted routes through direct URL entry.
- Hidden navigation is not a substitute for backend authorization.

### 5.2 Deep links

Deep links to visits, leads, assignments, or escalations must:

- revalidate the admin session;
- fetch current authoritative data;
- re-check permission and resource scope;
- handle deleted, archived, merged, restricted, or no-longer-accessible records;
- avoid preserving sensitive query parameters in URLs;
- never assume that a previously visible record remains accessible.

---

## 6. Visit Directory and Detail Experience

### 6.1 Visit directory requirements

Use the shared table, filtering, pagination, and asynchronous-state patterns established in earlier Super Admin steps.

The directory should support backend-provided capabilities for:

- visit identifier;
- listing identifier and safe listing summary;
- requester/user identifier or approved display representation;
- broker and agency context;
- requested date and time window;
- visit status;
- creation and last-updated timestamps;
- date-range filtering;
- property, broker, agency, or user filtering;
- exception or escalation state;
- sorting and server-side pagination.

Do not download all visits and filter them locally.

### 6.2 Visit detail requirements

The detail screen may display, where authorized:

- visit summary and current backend status;
- listing context;
- user context with approved privacy masking;
- broker and agency context;
- requested, confirmed, rescheduled, and completed timestamps;
- backend-provided lifecycle timeline;
- cancellation or failure reason categories;
- related lead or inquiry reference;
- notification-delivery metadata;
- administrative notes or escalation records when permitted;
- audit references for prior administrative actions.

The UI must not expose unnecessary personal contact data, private notes, or internal risk signals.

### 6.3 Visit actions

Render actions only when the backend capability contract allows them. Potential actions include:

- view lifecycle history;
- request reschedule through a governed workflow;
- request cancellation or exception resolution;
- escalate a failed or disputed visit;
- add an approved operational note;
- retry a failed administrative command;
- open related listing, user, broker, agency, or lead records.

Every mutation must show:

- confirmation requirements;
- pending state;
- success or failure result;
- authoritative refreshed status;
- audit reference where returned;
- conflict handling if the record changed during the operation.

---

## 7. Lead and Inquiry Directory

### 7.1 Required list information

The lead directory should display only backend-approved fields, such as:

- stable lead identifier or masked identifier;
- source channel;
- related listing;
- lead type or intent;
- lead owner type and owner reference;
- assigned broker, if any;
- agency relationship, if any;
- current lifecycle status;
- assignment status;
- created and updated timestamps;
- last meaningful activity timestamp, if approved;
- escalation or exception indicator;
- conversion or closure indicator only when supplied by the backend.

Do not display a lead as belonging to a broker solely because that broker is currently assigned to work it.

### 7.2 Required filters

Use server-side filters for capabilities that the backend exposes, including:

- lead status;
- owner type;
- broker;
- agency;
- source channel;
- listing or property;
- created or updated date range;
- assigned versus unassigned;
- stale or inactive state;
- escalation state;
- duplicate or suspected-abuse flag where authorized.

The UI must not invent filter categories that have no backend meaning.

### 7.3 Lead detail

The lead detail view should provide a controlled operational timeline containing backend-supplied events, for example:

- lead created;
- ownership established;
- broker assigned or unassigned;
- assignment accepted or declined;
- user or broker activity;
- visit linked or completed;
- escalation created or resolved;
- communication delivery status;
- closure or conversion event.

The timeline is informational unless a specific event supports an approved administrative action.

---

## 8. Assignment, Escalation, and Exception Workflows

### 8.1 Assignment handling

If the backend exposes assignment operations, the UI must:

1. Load the current ownership and assignment state.
2. Display the permitted target brokers or agency members supplied by the backend.
3. Explain whether the operation changes assignment only or ownership as well.
4. Require confirmation for material changes.
5. Submit the backend command with the required idempotency key or request identifier.
6. Display pending state while the operation is processing.
7. Re-fetch the lead after completion.
8. Display the resulting authoritative state and audit reference.

Do not allow an administrator to type an arbitrary broker identifier and bypass eligibility checks.

### 8.2 Escalation workflow

The Panel should support backend-defined escalation categories, such as:

- unassigned lead;
- stale lead;
- repeated assignment failure;
- disputed ownership;
- visit failure;
- notification failure;
- suspected abuse or duplicate submission;
- user support issue.

For each escalation, capture only the fields required by the backend contract:

- category;
- structured reason;
- optional safe note;
- related entity reference;
- urgency or severity only if backend-defined;
- attachments only through an approved secure upload flow.

Do not create a new escalation severity model in the frontend.

### 8.3 Conflict handling

The UI must explicitly handle:

- the lead being reassigned by another operator;
- the listing becoming unavailable;
- the broker or agency losing eligibility;
- the visit changing state during review;
- the record being archived or deleted;
- a command being accepted asynchronously;
- duplicate command submission;
- stale optimistic data.

On conflict, preserve user-entered non-sensitive notes where safe, refresh the record, and explain that the authoritative state changed.

---

## 9. Communication and Notification Visibility

The Panel may display delivery metadata when the backend exposes it, including:

- channel;
- delivery provider or provider category, where appropriate;
- queued, sent, delivered, failed, or unknown state;
- attempt count;
- failure category;
- last attempt timestamp;
- retry eligibility;
- related lead or visit reference.

The Panel must not:

- expose full OTPs, access tokens, secrets, or provider credentials;
- expose private message bodies by default;
- send messages through direct provider calls;
- retry a notification without a backend-supported idempotent operation;
- claim delivery success based only on a local UI update.

If a retry action exists, it must use the shared notification/job contract and display asynchronous processing states.

---

## 10. API Integration Contract

Before implementing any screen, confirm the approved backend contract for each operation:

- HTTP method and route;
- request and response schema;
- required permission and resource scope;
- pagination and sorting rules;
- supported filters;
- status and lifecycle enumerations;
- idempotency requirements;
- asynchronous behavior;
- error codes;
- conflict semantics;
- audit-reference format;
- versioning expectations.

Use the centralized API client, query/cache layer, validation utilities, and error mapper.

Recommended state separation:

- **Server state:** visits, leads, ownership, assignments, timelines, delivery statuses, escalations.
- **Local UI state:** selected filters, open panels, confirmation dialogs, note drafts, table density.
- **Navigation state:** stable record identifiers and safe filter context.
- **Session state:** authenticated administrator and effective capabilities.

Never store full lead or visit objects in route parameters.

---

## 11. Loading, Empty, Error, and Pending States

Every directory and detail screen must handle:

- initial loading;
- subsequent-page loading;
- empty dataset;
- no results for current filters;
- malformed or unsupported filters;
- permission denied;
- expired session;
- network failure;
- rate limiting;
- server error;
- stale record after mutation;
- record not found;
- record archived or restricted;
- command pending;
- command succeeded but asynchronous processing continues;
- conflict or version mismatch;
- retryable versus non-retryable failure.

Use shared error codes and safe user-facing messages. Never display stack traces, SQL errors, provider secrets, private message contents, or internal implementation details.

---

## 12. Security and Privacy Requirements

The implementation must:

- enforce backend authorization on every read and mutation;
- apply least-privilege display rules to personal and contact data;
- mask sensitive identifiers by default;
- avoid logging complete lead, visit, or communication payloads;
- prevent unauthorized enumeration through predictable IDs;
- avoid placing private data in URLs, analytics events, or browser storage;
- protect privileged actions with confirmation and, where required, step-up authentication;
- preserve accurate administrator attribution in audit records;
- prevent cross-agency or cross-owner data leakage;
- use secure file access mechanisms for any approved attachments;
- keep provider credentials and internal job payloads out of the browser bundle;
- treat all backend status and permission data as authoritative;
- prevent duplicate submissions through disabled controls and idempotency support.

Any support or escalation note must be treated as potentially sensitive and must follow the approved retention and access policy.

---

## 13. Performance and UX Requirements

- Use server-side pagination and bounded result sizes.
- Debounce text search using the shared frontend convention.
- Cancel or ignore stale requests when filters change.
- Avoid refetching unrelated datasets after a mutation.
- Invalidate only affected queries after a successful assignment, escalation, visit, or retry operation.
- Use accessible tables, labels, keyboard navigation, focus management, and status announcements.
- Make destructive or high-impact actions visually distinct from read-only actions.
- Clearly distinguish owner, assignee, agency, and status fields.
- Do not rely on color alone for status or severity communication.
- Preserve safe filter context when returning from detail screens.

---

## 14. Testing Requirements

### 14.1 Unit tests

Test:

- owner-versus-assignee presentation;
- permission-based action visibility;
- status and lifecycle rendering;
- filter serialization;
- pagination behavior;
- stale-response protection;
- error mapping;
- confirmation and cancellation behavior;
- safe masking of personal data.

### 14.2 Integration tests

Test:

- visit and lead list API integration;
- detail loading and refresh;
- server-side filters and pagination;
- assignment command submission;
- escalation creation;
- asynchronous command states;
- conflict and version-mismatch handling;
- notification retry integration where supported;
- query invalidation after successful mutations.

### 14.3 Security tests

Test:

- unauthorized route access;
- direct URL access without permission;
- cross-agency data exposure;
- private contact-data leakage;
- unauthorized assignment or ownership changes;
- duplicate command submission;
- ID enumeration patterns;
- sensitive data in URLs, logs, analytics, and browser storage;
- privilege changes during an active session.

### 14.4 End-to-end tests

Cover at least:

1. An authorized administrator searches and opens a visit.
2. An administrator reviews a failed or cancelled visit.
3. An administrator searches an unassigned lead.
4. An administrator distinguishes agency ownership from broker assignment.
5. An authorized administrator submits a permitted assignment or escalation action.
6. The UI displays pending and final authoritative states.
7. A stale record conflict is handled without falsely reporting success.
8. A restricted administrator cannot view or mutate an unauthorized lead.
9. A failed notification retry is represented accurately.
10. Audit references are visible after supported privileged actions.

---

## 15. Definition of Done

This step is complete only when:

- visit and lead directories use approved server-side APIs;
- ownership and assignment are displayed as separate concepts;
- independent-broker and agency-owned lead rules are represented correctly;
- visit lifecycle state comes from the backend;
- assignment, escalation, cancellation, and retry actions use explicit backend contracts;
- asynchronous, duplicate, stale, and conflicting operations are handled safely;
- private contact and communication data is appropriately protected;
- all privileged actions are attributable and auditable;
- operational filters and pagination are deterministic and validated;
- no frontend business rule duplicates lead, visit, ownership, or notification logic;
- unit, integration, security, and end-to-end tests cover critical workflows;
- unresolved API or policy gaps are documented as blockers rather than hidden.

---

## 16. Acceptance Criteria

1. An authorized administrator can view permitted visits using server-side pagination and filters.
2. Visit details show the authoritative lifecycle state and safe related-entity context.
3. An authorized administrator can view permitted leads and inquiries.
4. The interface clearly distinguishes lead ownership from broker assignment.
5. Agency-owned leads are not incorrectly presented as broker-owned.
6. Unsupported actions are hidden or disabled according to the shared capability contract.
7. Supported assignment and escalation actions require appropriate confirmation and idempotent submission.
8. The UI correctly handles pending, successful, failed, stale, and conflicting operations.
9. Communication views expose only approved delivery metadata and do not leak secrets or private content.
10. Cross-agency, cross-owner, and unauthorized access attempts are rejected safely.
11. Administrative actions display safe results and audit references where provided.
12. All list and detail screens implement loading, empty, denied, error, and retry states.
13. Shared API, validation, authorization, error, query, event, and observability utilities are reused.
14. No duplicate backend state machine, ownership rule, assignment engine, or notification provider integration is created.
15. Critical workflows are covered by automated tests and verified in a staging environment.

---

## 17. Deliverables

The Super Admin developer must deliver:

- visit directory and detail screens;
- lead and inquiry directory and detail screens;
- ownership and assignment presentation components;
- supported assignment and escalation workflows;
- exception and failed-delivery views where backend contracts exist;
- permission-aware action guards;
- API client/query integrations;
- loading, empty, error, pending, conflict, and retry states;
- privacy-safe display and masking utilities;
- unit, integration, security, and end-to-end tests;
- updated route, API-integration, and operational documentation;
- a list of unresolved backend or product blockers.

---

## 18. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Read the BRD, SOW, finalized decisions, Shared Core Blueprint Steps 1–12, User App Blueprint Steps 1–12, and Super Admin Blueprint Steps 1–5 before changing code.
2. Inspect the existing Super Admin shell, authorization layer, API client, query/cache utilities, shared components, and error mapper.
3. Locate the authoritative visit, lead, assignment, agency-ownership, notification, audit, and event contracts.
4. Reuse backend-provided status and capability metadata instead of recreating business rules.
5. Keep owner, assignee, agency, and listing relationships visibly distinct.
6. Do not invent assignment targets, escalation categories, lifecycle statuses, or permissions.
7. Use stable identifiers in routes and fetch authoritative data on navigation.
8. Implement all mutations with the required idempotency, confirmation, pending, refresh, and conflict behavior.
9. Do not read private message bodies or personal contact data unless the approved permission and privacy contract explicitly permits it.
10. Add tests before marking the relevant workflow complete.
11. Do not introduce a second backend, direct database access, provider integration, or duplicate domain logic.
12. Document every missing backend capability or unresolved policy as a blocker.
13. Do not mark this step complete until the Definition of Done and Acceptance Criteria have been verified.
