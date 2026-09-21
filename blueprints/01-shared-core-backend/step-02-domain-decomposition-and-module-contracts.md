# Step 02 — Backend Domain Decomposition and Module Contracts

## 1. Purpose

This step defines the backend domain boundaries, module responsibilities, dependency rules, and ownership contracts for the Zero Brokerage platform.

The implementation team must use this document to establish a modular-monolith structure that is internally separated by business domain while remaining deployable as one Fastify API.

This document is an implementation contract. It is not permission to introduce unrelated products, workflows, or infrastructure outside the approved Zero Brokerage scope.

---

## 2. Architectural Direction

The initial backend must be implemented as a **modular monolith**.

The system must have:

- One deployable Fastify API.
- Clear domain modules inside the API.
- Shared infrastructure packages for database access, events, validation, observability, and configuration.
- Explicit module interfaces.
- No uncontrolled cross-module database access.
- No business logic duplicated in frontend applications.
- No premature microservice deployment.

The modular monolith must be designed so that a future extraction into services remains possible, but service extraction is not part of the initial implementation.

---

## 3. High-Level Backend Structure

The backend should follow a structure similar to:

```text
services/api/src/
├── app/
│   ├── build-app.ts
│   ├── lifecycle.ts
│   ├── register-hooks.ts
│   ├── register-modules.ts
│   └── register-routes.ts
├── common/
│   ├── errors/
│   ├── http/
│   ├── pagination/
│   ├── result/
│   ├── types/
│   └── utils/
├── config/
├── modules/
│   ├── administration/
│   ├── agencies/
│   ├── analytics/
│   ├── brokers/
│   ├── furniture/
│   ├── identity/
│   ├── leads/
│   ├── listings/
│   ├── notifications/
│   ├── payments/
│   ├── reviews/
│   ├── search/
│   ├── subscriptions/
│   ├── transactions/
│   ├── users/
│   └── visits/
└── plugins/
```

The exact folder names may be refined during implementation, but the business boundaries must remain explicit.

---

## 4. Required Module Responsibilities

### 4.1 Identity Module

The Identity module owns authentication and account-security workflows.

Responsibilities include:

- Phone-number-based identity.
- OTP request and verification.
- Session creation and revocation.
- Refresh-token or session-token lifecycle.
- Device/session tracking.
- Login-attempt controls.
- OTP expiry and retry rules.
- Account lock or temporary throttling workflows.
- Authentication-related security events.

The Identity module must not own business-specific broker verification, property listing approval, or payment logic.

---

### 4.2 Users Module

The Users module owns user profiles and user-level preferences.

Responsibilities include:

- User profile data.
- Profile updates.
- User preferences.
- Saved properties or other approved user-level saved items.
- User account status.
- User-facing privacy and deletion requests.
- User activity references where required by the approved scope.

The module must not directly implement authentication internals. It must consume authenticated identity information from the Identity module.

---

### 4.3 Agencies Module

The Agencies module owns agency organizations and agency membership relationships.

Responsibilities include:

- Agency creation and profile management.
- Agency status.
- Agency membership.
- Agency roles and internal permissions.
- Agency-level ownership of applicable leads and listings.
- Agency-level settings allowed by the product scope.
- Agency-level operational metadata.

Agency membership must not be inferred from frontend claims. The backend must verify membership and role on every protected operation.

---

### 4.4 Brokers Module

The Brokers module owns broker-specific workflows.

Responsibilities include:

- Broker profile and professional details.
- Broker type and affiliation.
- Broker verification lifecycle.
- Broker legal and verification document metadata.
- Broker approval, rejection, suspension, and re-verification states.
- Broker availability or operational status where required.
- Broker-specific subscription or entitlement references.
- Broker-specific performance data references.

The module must not independently create payment transactions or bypass central entitlement checks.

---

### 4.5 Listings Module

The Listings module owns property listing lifecycle and listing-related business rules.

Responsibilities include:

- Listing creation and editing.
- Property details.
- Property classification.
- Sale/rent listing modes.
- Location and geospatial data.
- Media metadata.
- Listing ownership.
- Listing verification status.
- Listing moderation status.
- Listing publication status.
- Listing expiry and archival.
- Listing availability.
- Listing audit history.
- Listing ownership and agency/broker relationship checks.

The Listings module must enforce ownership and publication rules server-side.

A listing must not become publicly visible merely because a client submits a `published` or `approved` flag.

---

### 4.6 Visits Module

The Visits module owns property-visit scheduling and visit lifecycle.

Responsibilities include:

- Visit request creation.
- Visit scheduling.
- Visit rescheduling.
- Visit cancellation.
- Visit status transitions.
- Participant references.
- Broker or agency assignment references.
- Visit completion evidence where required.
- Visit-related notifications and events.
- Eligibility checks for review creation.

The module must prevent invalid state transitions and must handle duplicate requests safely.

---

### 4.7 Leads Module

The Leads module owns lead creation, assignment, routing, and lifecycle.

Responsibilities include:

- Lead creation from approved user actions.
- Lead source tracking.
- Lead ownership.
- Independent-broker lead ownership.
- Agency-owned lead workflows.
- Broker assignment and reassignment.
- Lead status transitions.
- Lead activity history.
- Lead routing rules.
- Lead notification events.
- Lead audit history.

The finalized ownership rule is:

- An independent broker's lead belongs to that broker.
- An agency lead belongs to the agency.
- Agency leads may be assigned to one or more eligible brokers according to the approved workflow.
- Broker assignment must not transfer agency ownership unless an explicit backend rule permits it.

All lead access must be scoped by the authenticated user's role and ownership relationship.

---

### 4.8 Furniture Module

The Furniture module owns the furniture marketplace and rental lifecycle.

Responsibilities include:

- Furniture supplier and inventory references.
- Furniture item records.
- Furniture categories.
- Furniture rental and sale modes.
- Pricing.
- Rental duration.
- Recurring rent schedules.
- Security deposits.
- Item availability.
- Reservation or order lifecycle.
- Delivery and return references.
- Damage claims.
- Supplier settlement references.
- Furniture-related notifications and events.

The furniture domain must not embed payment-provider-specific code directly in its core business logic. It must use the Payments module through a defined interface.

---

### 4.9 Transactions Module

The Transactions module owns property transaction and agreement lifecycle where included in the approved scope.

Responsibilities include:

- Transaction records.
- Transaction participants.
- Agreement metadata.
- Transaction status transitions.
- Document references.
- Closure information.
- Commission calculation inputs.
- Transaction audit history.
- Transaction-related events.

The module must not mark a transaction as completed based only on a client request. Completion must satisfy the applicable verification and authorization rules.

---

### 4.10 Payments Module

The Payments module owns all monetary payment orchestration.

Responsibilities include:

- Payment intent/order creation.
- Payment-provider adapter integration.
- Razorpay V1 integration.
- Payment status synchronization.
- Webhook verification.
- Idempotent webhook processing.
- Refund initiation and tracking.
- Payment failure handling.
- Payment reconciliation references.
- Payment audit history.
- Payment-related domain events.

Provider-specific code must remain behind an adapter boundary.

Business modules may request a payment operation, but they must not directly call Razorpay SDKs or manipulate provider signatures.

---

### 4.11 Subscriptions Module

The Subscriptions module owns plans, subscriptions, and entitlement inputs.

Responsibilities include:

- Subscription-plan definitions.
- Plan features and limits.
- Subscription lifecycle.
- Trial or grace-period handling where approved.
- Renewal and cancellation states.
- Subscription payment references.
- Subscription entitlement data.
- Subscription audit history.
- Subscription-related events.

The Subscriptions module must work with a central entitlement mechanism. Individual routes must not invent their own plan checks.

---

### 4.12 Notifications Module

The Notifications module owns notification orchestration.

Responsibilities include:

- In-app notification records.
- Notification preferences.
- Notification templates.
- Notification delivery attempts.
- Delivery status.
- Email, SMS, WhatsApp, or push-provider adapters where approved.
- Retry handling.
- Notification event consumption.
- Notification audit metadata.

Notifications should normally be triggered through domain events rather than tightly coupling every business module to a delivery provider.

Notification delivery must not block critical synchronous business transactions unless the business rule explicitly requires confirmation.

---

### 4.13 Administration Module

The Administration module owns Super Admin and platform-governance workflows.

Responsibilities include:

- Platform-level administrative actions.
- Broker verification decisions.
- Listing moderation decisions.
- User, broker, agency, and listing status controls.
- Subscription-plan administration.
- Platform configuration allowed by scope.
- Reports and escalations.
- Audit-log access.
- Operational controls.
- Platform-level analytics access.

Administrative permissions must be explicitly checked. A generic `isAdmin` flag must not be treated as sufficient for every sensitive action.

---

### 4.14 Reviews Module

The Reviews module owns review creation, moderation, and response workflows.

Responsibilities include:

- Verified-visit eligibility checks.
- Overall star ratings.
- Written reviews.
- Category ratings.
- Automatic screening.
- Publication status.
- Review editing and deletion.
- Listing-owner responses.
- Review reports.
- Anti-abuse checks.
- Weighted rating aggregation.
- Review audit history.

Only eligible users may create reviews. Review eligibility must be checked on the backend using visit and participant records.

---

### 4.15 Search Module

The Search module owns search and ranking behavior.

Responsibilities include:

- Search query interpretation.
- Filtering.
- Geospatial search coordination.
- Ranking inputs.
- Verified-listing filtering.
- Category filtering.
- Sponsored-result separation.
- Search-related caching.
- Search analytics events.
- Rate limiting for search endpoints.

The approved quality-first ranking inputs are:

- Verification quality: 40%.
- Rating: 30%.
- Verified closures: 30%.

The implementation must preserve a clearly separated and visibly labelled sponsored section. Sponsored placement must not silently override trust-related controls.

---

### 4.16 Analytics Module

The Analytics module owns event collection and role-scoped reporting.

Responsibilities include:

- Domain-event tracking.
- Product analytics events.
- Broker and agency metrics.
- Super Admin platform metrics.
- Revenue and subscription reporting.
- Furniture and transaction analytics.
- Conversion metrics.
- CSV export workflows.
- Retention controls.
- Aggregation jobs.
- Privacy-safe reporting.

Analytics must not expose personal data beyond the viewer's authorization scope.

---

## 5. Module Internal Structure

Each domain module should use a predictable internal structure.

Recommended structure:

```text
modules/<module-name>/
├── index.ts
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   └── events/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── services/
│   └── ports/
├── infrastructure/
│   ├── repositories/
│   ├── providers/
│   └── mappers/
├── interfaces/
│   ├── http/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── handlers/
│   └── event-handlers/
└── README.md
```

A small module may begin with fewer folders, but the separation between HTTP, application logic, domain rules, and infrastructure must remain clear.

---

## 6. Dependency Rules

### 6.1 General Rules

- A module must not import another module's private implementation files.
- Cross-module interaction must use a public module interface, application service, port, or domain event.
- Shared packages must contain technical primitives, not product-specific business decisions.
- A module must not directly access another module's repository.
- A module must not modify another module's tables through ad hoc SQL.
- Circular module dependencies are prohibited.
- Cross-module workflows must be documented.

### 6.2 Allowed Dependency Direction

Use this general direction:

```text
HTTP Interface
      ↓
Application Layer
      ↓
Domain Layer
      ↓
Ports / Interfaces
      ↓
Infrastructure Implementations
```

Infrastructure may implement application-defined ports, but business rules must not depend directly on infrastructure providers.

### 6.3 Cross-Domain Access

If a module needs data owned by another module:

1. Determine whether a stable public query/service interface exists.
2. Use that interface where practical.
3. Use a domain event for asynchronous reactions.
4. Use a carefully documented read model only when justified.
5. Do not duplicate the source-of-truth record.

---

## 7. Shared Core Versus Interface Applications

The following responsibilities belong to the shared backend:

- Authentication and authorization enforcement.
- Role and ownership checks.
- Validation of business invariants.
- Listing publication decisions.
- Broker verification decisions.
- Lead ownership and routing.
- Visit state transitions.
- Review eligibility.
- Payment and subscription state.
- Entitlement checks.
- Audit logging.
- Notification event creation.
- Rate limiting and security controls.

The following responsibilities belong to interface applications:

- Screen layout.
- Navigation.
- Local form state.
- Client-side presentation.
- Optimistic UI behavior that can safely be rolled back.
- Device-specific behavior.
- Accessibility presentation.
- API request orchestration.

The mobile apps, Super Admin panel, and public website must not duplicate backend business rules.

---

## 8. Database Ownership Rules

Each module must document the tables or database objects it owns.

For every table, define:

- Owning module.
- Purpose.
- Primary key.
- Foreign-key relationships.
- Sensitive fields.
- Required indexes.
- Unique constraints.
- Soft-delete or archival policy.
- Retention policy.
- Audit requirements.
- Transaction boundaries.

A foreign key to another module's table does not grant permission to mutate that module's data.

Database migrations must be version-controlled and reviewed.

---

## 9. Transaction Boundaries

A transaction must be used when multiple database changes must succeed or fail together to preserve an invariant.

Examples include:

- Creating a listing and its required ownership records.
- Assigning an agency lead and recording the assignment event.
- Completing a visit and creating the eligibility record required for a review.
- Updating a payment state and recording its internal event.
- Releasing a furniture reservation and updating inventory availability.
- Applying a verified administrative decision and its audit record.

External provider calls must not be assumed to participate in the PostgreSQL transaction.

Use an explicit state machine, outbox/event pattern, reconciliation process, or compensating action where an external side effect is involved.

---

## 10. Domain Events

Domain events should be used for decoupled reactions.

Examples of event categories include:

- `user.created`
- `identity.otp_verified`
- `broker.verification_submitted`
- `broker.verification_approved`
- `listing.created`
- `listing.submitted_for_review`
- `listing.published`
- `listing.suspended`
- `visit.created`
- `visit.completed`
- `lead.created`
- `lead.assigned`
- `payment.created`
- `payment.succeeded`
- `payment.failed`
- `subscription.activated`
- `subscription.expired`
- `review.submitted`
- `review.published`
- `furniture.order_created`
- `furniture.item_returned`
- `transaction.closed`

Event names must be consistent, versionable, and documented before implementation.

Events must not contain unnecessary personal or financial data. Prefer stable identifiers and minimal metadata.

---

## 11. Public Module Contracts

Each module must publish a short README containing:

- Module purpose.
- Owned business capabilities.
- Owned database tables.
- Public application services.
- Public events emitted.
- Events consumed.
- Authorization requirements.
- Transaction requirements.
- External integrations.
- Known limitations.
- Test responsibilities.

The public contract must be stable enough for other developers to integrate without reading private implementation details.

---

## 12. Error and Validation Responsibilities

Validation must be performed at multiple levels:

1. HTTP request schema validation.
2. Application-level input validation.
3. Domain invariant validation.
4. Database constraint enforcement.

The system must distinguish between:

- Invalid request data.
- Unauthenticated requests.
- Unauthorized requests.
- Missing resources.
- Invalid state transitions.
- Conflict conditions.
- Rate-limit violations.
- External-provider failures.
- Internal failures.

All errors must follow the shared API error format defined in the repository documentation.

---

## 13. Security Requirements

Each module must explicitly document:

- Authentication requirements.
- Role requirements.
- Ownership checks.
- Tenant or organization scoping where applicable.
- Sensitive fields.
- Audit requirements.
- Rate-limit requirements.
- Abuse cases.
- Data exposure risks.

Never trust:

- Client-provided user IDs.
- Client-provided role values.
- Client-provided ownership values.
- Client-provided approval flags.
- Client-provided payment status.
- Client-provided verification status.
- Client-provided subscription entitlement claims.

---

## 14. Testing Requirements

Each module must include tests for:

### Unit Tests

- Domain rules.
- State transitions.
- Permission policies.
- Calculations.
- Validation rules.
- Idempotency behavior.

### Integration Tests

- Repository behavior.
- Database constraints.
- Transaction boundaries.
- Cross-module interfaces.
- Event publication.
- Provider adapters.

### End-to-End Tests

- Critical user journeys.
- Critical administrative workflows.
- Payment and webhook flows.
- Broker verification.
- Listing publication.
- Lead routing.
- Visit completion and review eligibility.
- Furniture order and return lifecycle.

Critical workflows must be tested against duplicate requests, retries, stale data, unauthorized access, and invalid state transitions.

---

## 15. Implementation Sequence

The team should implement the modules in dependency order rather than building every module simultaneously.

Recommended sequence:

1. Shared configuration, logging, request context, and error handling.
2. Database client, migration framework, and transaction utilities.
3. Identity and Users.
4. Agencies and Brokers.
5. Listings and search foundations.
6. Visits and Leads.
7. Payments and Subscriptions.
8. Notifications and event processing.
9. Furniture marketplace.
10. Transactions and settlements.
11. Reviews and analytics.
12. Administration, reporting, and operational hardening.

This is a dependency-oriented sequence, not a promise that every module will be completed before work begins on the next one.

---

## 16. Definition of Done for This Step

This step is complete when:

- Every approved backend domain has an identified owner.
- Module responsibilities are documented.
- Module boundaries are understood by all developers.
- Cross-module dependency rules are agreed upon.
- Database ownership is assigned.
- Public module contract expectations are documented.
- Domain-event conventions are established.
- Shared backend responsibilities are separated from interface responsibilities.
- No developer needs to duplicate business logic in a frontend application.
- The module structure is reflected in the repository without introducing unrelated scope.

---

## 17. Acceptance Criteria

- [ ] The API is organized around explicit business modules.
- [ ] No module directly imports another module's private repository or implementation.
- [ ] Each module has a documented responsibility boundary.
- [ ] Each database table has an owning module.
- [ ] Cross-module access uses approved interfaces or events.
- [ ] Authentication and authorization remain backend-owned.
- [ ] Listing, lead, visit, review, payment, subscription, and furniture rules are not implemented independently in interface applications.
- [ ] Domain events have consistent naming and documented payload principles.
- [ ] Critical transaction boundaries are identified.
- [ ] Each module has a clear testing responsibility.
- [ ] The structure remains compatible with the modular-monolith decision.
- [ ] No new product scope has been introduced.

---

## 18. Output of Step 02

The implementation team must produce:

1. The initial backend module directory structure.
2. A module responsibility matrix.
3. A database ownership inventory.
4. A dependency map.
5. Initial public module README files.
6. A domain-event naming and contract draft.
7. A list of unresolved cross-module decisions requiring explicit approval.
