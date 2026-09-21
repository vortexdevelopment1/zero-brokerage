# Super Admin Panel Blueprint — Step 01
## Executive Scope, Product Boundaries, Roles, and Implementation Contract

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network  
**Interface:** Super Admin Panel / VortexCubes Command Center  
**Document path:** `blueprints/04-super-admin-panel/step-01-executive-scope-product-boundaries-and-implementation-contract.md`  
**Status:** Blueprint foundation  
**Primary audience:** Super Admin developer, shared-core backend team, technical lead, QA, security reviewer, and release owner

---

## 1. Purpose

This document establishes the implementation baseline for the Zero Brokerage Super Admin Panel.

The Super Admin Panel is the platform-governance interface used by authorized VortexCubes operators to supervise the complete Zero Brokerage ecosystem. It consumes the Shared Core Backend through approved, versioned APIs and provides controlled operational interfaces for platform governance, moderation, verification, financial oversight, analytics, security, support, and system operations.

This step defines:

- The Super Admin Panel's purpose and product scope.
- The responsibilities of the Super Admin interface versus the Shared Core Backend.
- The boundary between Super Admin operations and User App, Broker App, Agency Portal, and Public Website responsibilities.
- The approved technology and integration baseline.
- The initial navigation and capability map.
- Role, permission, and high-risk-action expectations.
- Non-negotiable security, privacy, audit, and reliability rules.
- The implementation contract that every later Super Admin blueprint step must follow.

This document does **not** implement individual modules. It establishes the contract under which Steps 2–12 will specify and implement those modules.

---

## 2. Mandatory Source and Decision Review

Before implementing this step or any later Super Admin step, the AI IDE and developer must read and reconcile:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. Completed User App Blueprint Steps 1–12.
6. Repository documentation under `docs/`.
7. Current shared packages, API contracts, authentication/authorization plugins, and Super Admin application code.

### 2.1 Decision precedence

When sources or implementation assumptions conflict, use this order of authority:

1. Explicitly finalized critical Zero Brokerage decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Detailed blueprint instructions.
5. Repository architecture and API documentation.
6. Routine implementation decisions approved by the technical lead.

Do not silently resolve a conflict between authoritative sources. Record the conflict as a blocker or decision item and obtain clarification through the project's agreed decision process.

The SOW describes a broader microservices-oriented target architecture, while the finalized implementation decision is to begin with a **modular monolith and one deployable Fastify API**. The Super Admin Panel must therefore integrate with the modular monolith's stable module APIs and must not introduce a separate backend or microservice solely for the admin interface.

---

## 3. Product Context

Zero Brokerage is a unified multi-asset platform for discovering, listing, managing, renting, purchasing, and transacting across:

- Residential properties.
- Commercial properties and office spaces.
- Agricultural, industrial, and commercial land parcels.
- Office furniture rentals and sales.
- Broker and agency operations.
- User subscriptions and micro-transactions.
- Visits, inquiries, leads, and broker check-ins.
- Listing discovery, ranking, verification, moderation, and trust signals.

The BRD and SOW identify the Super Admin interface as the central command center for VortexCubes operators. Its broad responsibilities include:

- Platform-wide governance of users, brokers, agencies, and listings.
- Verification and moderation oversight.
- Subscription and financial management.
- Commission and settlement visibility.
- Urgent-requirement monitoring.
- Operational and system-health visibility.
- Platform analytics and reporting.
- Security and audit oversight.

The Super Admin Panel is an internal, privileged interface. It is not a public-facing website and is not a replacement for the Agency Web Portal or Broker App.

---

## 4. Current Delivery Scope

### 4.1 In scope

The Super Admin Panel blueprint covers the following platform capabilities, subject to the detailed rules in later steps:

1. **Command dashboard**
   - Platform KPIs.
   - Operational alerts.
   - Pending actions.
   - Revenue and subscription summaries.
   - Verification and moderation workload.
   - System and integration health indicators.

2. **User and account governance**
   - Search and inspection of permitted user accounts.
   - Account status and access controls.
   - Security-sensitive account actions.
   - Session and access review where authorized.

3. **Broker and agency governance**
   - Broker and agency directory.
   - Verification status oversight.
   - Suspension, reactivation, and other policy-controlled status actions.
   - Agency and broker relationship visibility.
   - Compliance and operational review.

4. **Listing governance**
   - Listing review queues.
   - Verification and moderation decisions.
   - Publication and unpublication actions where authorized.
   - Fraud, abuse, and quality reports.
   - Visibility into listing ownership and attribution.

5. **Verification center**
   - Review of broker, agency, ownership, and other approved verification evidence.
   - Evidence status and dependency visibility.
   - Controlled approval, rejection, request-for-correction, and escalation workflows.

6. **Visits, leads, and urgency operations**
   - Operational visibility into visit and lead activity.
   - Urgent-requirement flags and matching-workflow oversight.
   - Exception handling without bypassing domain ownership rules.

7. **Subscriptions, payments, and financial oversight**
   - Plan and entitlement administration through backend contracts.
   - Subscription lifecycle visibility.
   - Payment, refund, payout, commission, and reconciliation visibility according to permission.
   - Financial exception queues and audit trails.

8. **Analytics and reporting**
   - Platform, revenue, subscription, operational, and approved product analytics.
   - KPI dashboards and trend views.
   - Controlled CSV exports through asynchronous, auditable backend jobs.
   - Privacy-aware aggregate reporting.

9. **Reviews, trust, and disputes**
   - Review reports and moderation queues.
   - Trust-signal issues.
   - Support tickets, disputes, escalations, and resolution workflows where included by the relevant domain contract.

10. **Notifications and engagement operations**
    - Operational notification visibility.
    - Approved templates, delivery status, and failure monitoring.
    - Segmented outreach only where explicitly supported, consented, and authorized.

11. **Security and audit**
    - Administrative activity history.
    - Suspicious activity and access anomaly visibility.
    - Integration and security control status.
    - High-risk action review.

12. **Platform settings and integrations**
    - Approved global settings and feature controls.
    - Payment, messaging, email, maps, and other integration health and configuration surfaces where supported by the backend contract.

### 4.2 Explicitly out of scope for this interface

The Super Admin Panel must not become a substitute for any of the following:

- User App consumer journeys.
- Broker App field workflows.
- Agency Web Portal inventory and team workflows.
- Public Website marketing and public content presentation.
- Independent implementation of listing, payment, entitlement, lead, visit, review, or ranking business logic.
- Direct database manipulation from the browser.
- Unrestricted access to sensitive personal, identity, financial, or verification documents.
- Unapproved automated legal, financial, reputational, or fraud decisions.
- AI-generated moderation or enforcement decisions unless separately approved.
- Full accounting, tax filing, or statutory reporting functionality unless separately specified and approved.

The Agency Web Portal remains a separate future/interface workstream. Its absence from the current delivery sequence must not cause Agency Portal functionality to be placed inside the Super Admin Panel.

---

## 5. Approved Technical Baseline

### 5.1 Frontend

The Super Admin Panel must use the repository's approved web application conventions and the SOW's admin-portal baseline:

- Next.js.
- TypeScript.
- Tailwind CSS or the repository-approved styling system.
- Recharts or the approved charting solution for data visualizations.
- Shared design-system components where available.
- Shared API, validation, error, observability, and authorization utilities where available.

The exact Next.js routing, rendering, data-fetching, and state-management patterns must follow the repository's current architecture and the decisions documented in the Super Admin implementation steps. Do not introduce a second competing frontend architecture without an explicit decision.

### 5.2 Backend integration

The Panel consumes the shared Fastify API through documented REST/JSON contracts.

The backend remains authoritative for:

- Identity and administrator account state.
- Administrator authentication and authorization.
- Role and permission evaluation.
- User, broker, agency, and listing state.
- Verification and moderation outcomes.
- Payment, subscription, commission, payout, refund, and reconciliation state.
- Entitlement calculations.
- Visit, lead, urgency, review, and dispute lifecycle rules.
- Analytics definitions and authoritative business metrics.
- Audit records and retention behavior.

The frontend may request actions, display server responses, perform presentation-level validation, and manage UI state. It must never independently determine an authoritative business outcome.

### 5.3 Data and infrastructure boundaries

The Panel must not connect directly to PostgreSQL, PostGIS, Redis, object storage, payment providers, messaging providers, or internal job infrastructure from browser code.

All privileged operations must pass through authenticated and authorized backend endpoints. Sensitive evidence and documents must be accessed through short-lived, scoped delivery mechanisms defined by the backend, such as approved pre-signed URLs where applicable.

---

## 6. Super Admin Role and Permission Model

### 6.1 Administrator identity

A Super Admin is a privileged platform operator, not an ordinary platform user with a visual flag. The backend must authenticate the administrator and evaluate explicit administrative permissions for every protected operation.

The frontend must treat the permission payload as a capability contract, not as proof that a user may perform every action. The backend must re-check permissions on every request and must enforce object-level and field-level restrictions where necessary.

### 6.2 Permission principles

Implement the Panel around the following principles:

- **Least privilege:** Administrators receive only the permissions required for their duties.
- **Deny by default:** Missing or ambiguous permissions must not grant access.
- **Server enforcement:** Hiding a button is not an authorization control.
- **Scope awareness:** A permission may be limited by entity, operation, tenant/agency scope, status, or sensitivity level.
- **High-risk confirmation:** Destructive, irreversible, financial, security, and publication actions require explicit confirmation and appropriate safeguards.
- **Separation of duties:** Where the finalized policy requires review, approval, or reconciliation separation, the UI must represent that workflow rather than offering a one-click bypass.
- **Traceability:** Every privileged mutation must be attributable to the actual administrator identity and recorded through the shared audit system.
- **No impersonation by default:** Acting on behalf of another user or role requires an explicit, separately authorized support/impersonation contract and must be visibly recorded.

### 6.3 Typical capability categories

The implementation should model permissions around capability categories rather than hard-coded page-level access only. Examples include:

- `dashboard.read`
- `users.read`
- `users.manage_status`
- `brokers.read`
- `brokers.manage_verification`
- `agencies.read`
- `listings.read`
- `listings.moderate`
- `verification.review`
- `subscriptions.manage`
- `payments.read`
- `refunds.manage`
- `payouts.read`
- `analytics.read`
- `analytics.export`
- `reviews.moderate`
- `support.manage`
- `security.read`
- `audit.read`
- `settings.manage`
- `integrations.read`

These identifiers are illustrative until the shared authorization contract confirms the canonical permission names. Do not create frontend-only permission identifiers that diverge from the backend contract.

---

## 7. Initial Navigation and Capability Map

The initial information architecture should be organized around platform operations rather than around the screens of other applications.

Recommended top-level areas:

1. **Dashboard**
2. **Users**
3. **Brokers**
4. **Agencies**
5. **Listings and Moderation**
6. **Verification Center**
7. **Visits, Leads, and Urgent Requirements**
8. **Subscriptions**
9. **Billing, Revenue, and Settlements**
10. **Analytics and Reports**
11. **Reviews, Trust, and Disputes**
12. **Notifications and Engagement**
13. **Security Center**
14. **Audit Logs**
15. **Integrations and Platform Settings**

Navigation visibility must be permission-aware, but navigation visibility alone must never be treated as security enforcement.

Every area must provide:

- Loading states.
- Empty states.
- Permission-denied states.
- Error and retry states.
- Pagination or bounded loading for large datasets.
- Search/filter state that can be reset and shared safely.
- Clear status labels and timestamps.
- Audit-friendly display of actor, action, target, and result where relevant.

The final navigation labels may be refined in later steps, but the separation of responsibilities must remain intact.

---

## 8. Cross-Interface Responsibility Boundaries

### 8.1 Shared Core Backend team

The shared backend team owns:

- Domain models and migrations.
- Business rules and state transitions.
- Authorization enforcement.
- Validation schemas and error contracts.
- Domain events and background jobs.
- Audit records.
- Analytics definitions and aggregation.
- Financial integrity and reconciliation.
- Security controls and sensitive-data access.
- Stable versioned API contracts.

### 8.2 Super Admin developer

The Super Admin developer owns:

- The Next.js admin interface.
- Admin navigation, layouts, tables, forms, dashboards, filters, and workflows.
- Integration with approved administrative APIs.
- Permission-aware rendering and safe action initiation.
- Admin-specific loading, error, confirmation, and recovery UX.
- Frontend tests and end-to-end coverage for administrative journeys.
- Accessible and auditable presentation of privileged operations.

The Super Admin developer must not duplicate shared domain services in frontend code or create private database access paths.

### 8.3 Other interfaces

- **User App:** consumer discovery, user account, user visits, user orders, user subscriptions, and user-facing support journeys.
- **Broker App:** broker field operations, listing operations, broker visits, lead handling, and broker-facing performance workflows.
- **Agency Portal:** agency inventory, agency team management, agency campaigns, and enterprise workflows; this remains a separate interface.
- **Public Website:** public marketing, public discovery, SEO, and public content presentation.

An administrative view of an entity does not transfer ownership of that entity's business logic to the Super Admin frontend.

---

## 9. UX and Interaction Rules for Privileged Operations

The Panel must make the consequences of administrative actions clear.

For every mutation workflow:

1. Load the current server state.
2. Display the target entity and relevant status clearly.
3. Explain the action's effect and any downstream impact.
4. Require explicit confirmation for high-risk actions.
5. Collect a reason or structured note when the policy requires one.
6. Submit through the approved API with the required idempotency or concurrency controls.
7. Show pending/asynchronous status when the backend does not complete immediately.
8. Refresh or invalidate affected data using server-confirmed results.
9. Surface failures without falsely showing success.
10. Make the resulting audit information visible where appropriate.

Examples of actions requiring special treatment include:

- Suspending or reactivating accounts.
- Approving or rejecting verification evidence.
- Publishing, unpublishing, or suppressing listings.
- Issuing refunds or changing financial states.
- Managing subscriptions or entitlements.
- Triggering bulk notifications.
- Changing global settings or feature flags.
- Accessing sensitive verification documents.
- Exporting data.
- Modifying security controls.

The frontend must never describe an operation as successful until the host/API response confirms success.

---

## 10. Security, Privacy, and Compliance Baseline

The Super Admin Panel handles high-value and sensitive information and must be designed as a privileged security boundary.

Mandatory requirements:

- Use the approved administrator authentication and session mechanism.
- Apply secure session handling, timeout, revocation, and re-authentication rules where required.
- Do not store access tokens, identity documents, payment data, or sensitive personal data in unsafe browser storage.
- Do not place sensitive data in URLs, route parameters, logs, analytics events, or error messages.
- Mask or redact sensitive fields by default.
- Display sensitive documents only after backend authorization and through approved short-lived access mechanisms.
- Prevent cross-entity and cross-scope data exposure.
- Apply CSRF, XSS, clickjacking, and unsafe-navigation protections according to the web security baseline.
- Respect data retention, deletion, legal hold, financial, and audit-history requirements.
- Ensure all privileged mutations and sensitive reads are auditable according to policy.
- Avoid bulk operations unless the backend exposes an explicit, bounded, authorized workflow.
- Treat exported files as sensitive artifacts with access control, expiry, and auditability.

A Super Admin permission must not be interpreted as unrestricted access to every personal, verification, financial, or operational field.

---

## 11. Performance, Reliability, and Accessibility Baseline

The Panel must be usable under real operational data volumes rather than only seeded demo data.

Required baseline:

- Use server-side pagination, filtering, sorting, and search for large datasets.
- Avoid loading entire user, broker, listing, transaction, or audit collections into the browser.
- Use bounded chart ranges and lazy-load expensive reports.
- Clearly distinguish cached, stale, pending, and live data.
- Handle API timeouts, rate limits, partial failures, and expired sessions gracefully.
- Prevent duplicate submissions through disabled pending states and backend idempotency where required.
- Preserve user-entered form data when safe during recoverable failures.
- Provide keyboard-accessible controls, visible focus states, semantic labels, and usable table interactions.
- Ensure color is not the only carrier of status or severity.
- Provide responsive behavior suitable for the supported admin viewport range, while prioritizing desktop operational workflows.
- Instrument important admin journeys with approved observability and error-reporting conventions without leaking sensitive information.

The SOW's general platform targets, including high availability and low-latency core APIs, must be validated at the backend and integration levels. The frontend must not conceal slow or failed operations behind indefinite spinners.

---

## 12. Testing Contract

The Super Admin implementation must include tests at multiple levels.

### 12.1 Unit and component tests

Cover:

- Permission-aware rendering.
- Status and severity presentation.
- Form validation and normalization.
- Confirmation and cancellation behavior.
- Loading, empty, error, and retry states.
- Pagination, filtering, and sorting behavior.
- Redaction and sensitive-field presentation.

### 12.2 Integration tests

Cover:

- Authenticated API requests.
- Permission-denied responses.
- Expired or revoked sessions.
- Validation errors.
- Conflict and stale-state responses.
- Pending/asynchronous operations.
- Cache invalidation and server-confirmed refresh.
- Export and document-access restrictions.

### 12.3 End-to-end tests

At minimum, later steps must define end-to-end tests for:

- Administrator sign-in and sign-out.
- Dashboard loading with partial widget failures.
- Reviewing a pending verification item.
- Moderating a listing or report.
- Performing a protected account-status action.
- Viewing financial or subscription information within permission scope.
- Reviewing an audit event generated by an administrative mutation.
- Handling a denied high-risk action.

Tests must verify that a hidden or disabled UI control is not the only protection; unauthorized API attempts must also be rejected by the backend.

---

## 13. Implementation and Documentation Rules for Antigravity

When implementing this blueprint in Antigravity:

1. Read the BRD, SOW, finalized decisions, Shared Core Blueprint Steps 1–12, and User App Blueprint Steps 1–12 before modifying code.
2. Inspect the existing repository structure and current Super Admin application state before creating files or moving modules.
3. Identify and reuse existing API clients, query/cache utilities, shared types, validation schemas, error handling, authentication, authorization, observability, and UI components.
4. Confirm the exact backend endpoint, request schema, response schema, permission requirement, error codes, pagination contract, and asynchronous behavior before integrating each feature.
5. Never guess API routes, response fields, permission names, status values, or financial meanings.
6. Do not implement domain logic in the frontend merely because an admin user can see or trigger the outcome.
7. Keep privileged actions explicit, confirmable, auditable, and recoverable where possible.
8. Record unresolved API, policy, legal, privacy, or permission questions as blockers instead of inventing behavior.
9. Keep each logical implementation unit runnable and testable.
10. Update relevant API-contract and interface documentation alongside implementation.
11. Do not add Agency Portal, Broker App, or public marketing features to this application.
12. Do not mark a feature complete because its screen renders; verify the complete API, authorization, error, audit, accessibility, and test behavior.

---

## 14. Definition of Done for Step 01

This step is complete only when:

- The Super Admin Panel's purpose and scope are documented.
- In-scope and out-of-scope responsibilities are explicit.
- The modular-monolith/Fastify integration baseline is preserved.
- Backend authority and frontend responsibility boundaries are clear.
- The initial navigation and capability map is documented.
- Administrator permission and high-risk-action principles are defined.
- Cross-interface ownership boundaries are documented.
- Security, privacy, audit, accessibility, reliability, and testing baselines are stated.
- The implementation instructions prohibit duplicate business logic and direct browser-to-database access.
- Later Super Admin blueprint steps can reference this document without redefining the same foundation.

---

## 15. Acceptance Criteria

1. A developer can identify exactly what the Super Admin Panel is responsible for and what it must not implement.
2. The Panel is clearly defined as an internal privileged interface rather than a public website, User App, Broker App, or Agency Portal.
3. The Panel integrates only through approved shared backend APIs.
4. The backend remains authoritative for all privileged business outcomes.
5. Every protected operation is expected to be enforced server-side.
6. High-risk actions require explicit confirmation, appropriate safeguards, and auditability.
7. Sensitive personal, financial, and verification data is not exposed merely because an administrator is authenticated.
8. Large datasets are handled through bounded, server-supported data access patterns.
9. Loading, empty, denied, failure, retry, pending, and conflict states are part of the required UX contract.
10. The implementation plan includes unit, integration, security, and end-to-end testing expectations.
11. The document does not introduce a second backend, direct database access, duplicated domain logic, or out-of-scope interface functionality.
12. Any unresolved conflict between source documents, finalized decisions, and repository contracts is recorded rather than silently resolved.

---

## 16. Next Blueprint Step

**Step 02** should define the Super Admin application architecture, route/layout structure, shared UI foundations, authenticated application shell, permission-aware navigation, API client integration, and frontend module boundaries without implementing the individual business modules yet.
