# Shared Core Backend Blueprint

## Step 01 — Executive Scope, Technical Baseline, and Implementation Contract

**Document path:** `blueprints/01-shared-core-backend/step-01-executive-scope.md`

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network

**Audience:** Shared backend team, User App developer, Broker App developer, Super Admin developer

**Status:** Blueprint foundation

---

## 1. Purpose

This document establishes the authoritative implementation baseline for the Zero Brokerage shared backend.

It defines:

- Backend responsibilities.
- Product scope.
- Approved architecture.
- Technology baseline.
- Domain boundaries.
- Responsibilities of the three developers.
- Shared-logic and API-consumption rules.
- Non-functional expectations.
- Implementation constraints.
- Acceptance criteria for the backend foundation.

This document must be read before implementing any backend module.

The backend team must use this document together with:

1. The approved BRD.
2. The approved SOW.
3. Finalized project decisions.
4. The remaining Shared Core Backend Blueprint steps.
5. Repository documentation under `docs/`.

If a later blueprint step provides a more detailed rule, that step may expand this document but must not silently contradict an approved project decision.

---

## 2. Source Documents and Authority

The primary source documents are:

- `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`
- `SOW_Developer_Technical_Contract_VortexCubes.pdf`

### 2.1 Decision precedence

When implementing a feature, follow this order of authority:

1. Explicitly approved critical project decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Detailed blueprint instructions.
5. Repository architecture documentation.
6. Routine implementation decisions finalized by the technical lead.

If two authoritative sources conflict, do not silently choose one. Record the conflict and escalate it for resolution.

---

## 3. Product Overview

Zero Brokerage is a unified platform for discovering, listing, managing, renting, purchasing, and transacting across multiple asset categories.

The platform must support:

- Residential properties.
- Commercial properties and office spaces.
- Agricultural, industrial, and commercial land parcels.
- Office furniture rentals and sales.
- Broker and agency operations.
- User subscriptions and micro-transactions.
- Visit scheduling and broker check-ins.
- Listing discovery, ranking, moderation, and trust signals.
- Super Admin governance, financial controls, and operational monitoring.

### 3.1 Real-estate categories

The backend must support category-specific attributes for categories such as:

- Flats and apartments.
- Penthouses.
- Villas.
- Builder floors.
- Bare-shell offices.
- Co-working spaces.
- Retail showrooms.
- Cafeterias.
- Commercial buildings.
- Turnkey office setups.
- Agricultural land.
- Industrial plots.
- Commercial land parcels.

Category-specific attributes may include furnishing status, maintenance fees, tenant preferences, pricing, availability, workstation capacity, carpet area, power backup, amenities, zoning, road width, soil classification, water availability, land-use classification, and relevant documentation.

Flexible category-specific attributes should use PostgreSQL JSONB where appropriate, while frequently queried fields should be modeled explicitly and indexed.

### 3.2 Furniture ecosystem

The furniture marketplace is a first-class business domain and must support:

- Furniture rentals.
- Furniture sales.
- Individual furniture assets.
- Packaged office setups.
- Recurring monthly rent.
- Security deposits.
- Returns.
- Damage claims.
- Supplier settlements.
- Furniture combined with office-space offerings.

---

## 4. Current Delivery Scope

### 4.1 Active interfaces

| Interface | Technology direction | Primary purpose |
|---|---|---|
| User Mobile App | React Native | Property and furniture discovery, visits, subscriptions, contacts, and user workflows |
| Broker Mobile App | React Native | Listing operations, leads, visits, check-ins, status updates, and broker workflows |
| Super Admin Panel | Next.js | Governance, moderation, financial oversight, analytics, and operational controls |
| Public Website | Next.js | Public-facing discovery, marketing, and approved public platform functionality |

All developers must follow the centralized technology-version matrix.

### 4.2 Deferred interface

The Agency Web Portal remains a future-scope placeholder at:

```text
apps/agency-portal/
```

Its full implementation is not part of the current active four-interface delivery scope. However, the backend must retain domain boundaries that can support future agency functionality without a major rewrite.

### 4.3 Shared backend responsibility

The backend provides consistent business rules and APIs to all active interfaces.

Frontend applications must not independently implement authoritative versions of:

- Ownership rules.
- Entitlement rules.
- Commission calculations.
- Payment state transitions.
- Listing publication rules.
- Broker verification rules.
- Lead ownership rules.
- Review eligibility.
- Settlement calculations.
- Administrative permissions.
- Fraud-prevention rules.

---

## 5. Approved Backend Architecture

### 5.1 Architectural decision

The initial backend will be implemented as a:

> **Modular monolith with one deployable Fastify API**

Although the SOW describes a microservices-oriented backend, the approved project decision is to begin with a modular monolith.

This approach is intended to:

- Reduce deployment complexity.
- Simplify local development.
- Avoid premature distributed-system overhead.
- Preserve transactional consistency.
- Allow the three developers to work against one coherent backend.
- Preserve clear boundaries for future service extraction.

The modular monolith must not become an unstructured codebase. Each domain must have clear responsibilities, dependencies, interfaces, and ownership boundaries.

### 5.2 Deployment model

```text
User Mobile App       ┐
Broker Mobile App     │
Super Admin Panel     ├──> Fastify Modular Monolith API
Public Website        ┘              │
                              ┌──────┴──────┐
                              │             │
                       PostgreSQL       Redis
                       + PostGIS       Cache/Jobs
```

External integrations must be connected through dedicated adapters rather than embedded directly into domain services.

---

## 6. Technology Baseline

| Area | Approved technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| HTTP framework | Fastify |
| API style | REST with JSON responses |
| Request validation | JSON Schema with Ajv through Fastify |
| Primary database | PostgreSQL |
| Geospatial capabilities | PostGIS |
| Caching | Redis |
| Background processing | Redis-backed job processing |
| Initial process management | PM2 |
| API documentation | OpenAPI-compatible documentation |
| Logging | Structured JSON logging |
| Testing | Unit, integration, and end-to-end testing |
| Mobile applications | React Native |
| Web applications | Next.js |
| Mobile state management | Zustand, as specified by the SOW |
| Payments | Razorpay as the initial payment adapter |
| Messaging | Approved WhatsApp and SMS providers |

### 6.1 Version-governance rule

All developers must use the same approved versions of shared technologies.

A centralized version matrix must cover, at minimum:

- Node.js.
- TypeScript.
- Fastify.
- PostgreSQL.
- PostGIS.
- Redis.
- React Native.
- Next.js.
- React.
- Zustand.
- TypeScript tooling.
- Linting and formatting tools.
- Database and migration tooling.
- Testing tools.
- Build tools.
- Payment SDKs.
- Infrastructure images.

The version matrix must record:

- Technology or package name.
- Exact version or approved version range.
- Reason for selection.
- Compatibility notes.
- Date of verification.
- Whether the version is mandatory for all developers.

No developer may introduce arbitrary package versions into an individual application or module.

The exact version matrix must be finalized and maintained in shared project documentation before implementation begins.

---

## 7. Repository Responsibilities

The repository separates shared technical infrastructure from backend domain logic.

### 7.1 `packages/config`

Responsible for:

- Shared configuration parsing.
- Environment-variable definitions.
- Configuration validation.
- Typed configuration access.

It must not contain domain-specific rules such as subscription eligibility or broker approval logic.

### 7.2 `packages/database`

Responsible for:

- PostgreSQL client and pool setup.
- Transaction helpers.
- Database connection utilities.
- Database-level errors.
- Migration and seed infrastructure.
- Reusable low-level database helpers.

Domain-specific repositories must remain within their relevant backend modules, for example:

```text
services/api/src/modules/listings/repositories/
```

### 7.3 `packages/events`

Responsible for:

- Shared event contracts.
- Event names.
- Event payload types.
- Event envelope definitions.
- Event-bus interfaces.

It must not contain business workflows.

### 7.4 `packages/observability`

Responsible for reusable observability capabilities such as:

- Structured logging helpers.
- Correlation identifiers.
- Metrics interfaces.
- Lightweight instrumentation utilities.

### 7.5 `packages/shared-types`

Responsible only for genuinely shared types consumed across packages or applications.

Backend domain models must not automatically be placed here.

### 7.6 `packages/validation`

Responsible for reusable validation primitives and validation-related helpers.

Domain-specific schemas should remain close to their owning module unless intentionally shared as API contracts.

---

## 8. Backend Application Structure

The backend implementation lives under:

```text
services/api/src/
```

### 8.1 `app/`

Responsible for:

- Building the Fastify application.
- Registering plugins.
- Registering modules.
- Registering routes.
- Registering hooks.
- Managing startup and shutdown.
- Managing lifecycle ordering.

The `app/` directory must not contain business-domain logic.

### 8.2 `common/`

Reserved for cross-cutting utilities, including:

- Error primitives.
- HTTP helpers.
- Pagination utilities.
- Generic result types.
- Shared backend types.
- General-purpose utilities.

It must not contain domain-specific workflows or repositories.

### 8.3 `plugins/`

Contains Fastify plugins and technical adapters, including:

- Authentication.
- Authorization.
- Database registration.
- Redis registration.
- Rate limiting.
- Request context.
- Error handling.
- Swagger/OpenAPI registration.

Plugins may expose infrastructure capabilities to modules but must not absorb domain business logic.

### 8.4 `modules/`

All domain business logic must live under:

```text
services/api/src/modules/
```

Each module should own its:

- Domain types.
- Routes.
- Handlers or controllers.
- Services and use cases.
- Repositories.
- Validation schemas.
- Domain errors.
- Event handlers.
- Tests.

The exact internal module structure will be defined in later blueprint steps.

---

## 9. Initial Domain Inventory

The initial domain-planning inventory includes:

1. Identity and authentication.
2. Users.
3. Agencies.
4. Brokers.
5. Broker verification.
6. Listings.
7. Listing media.
8. Property categories and attributes.
9. Search and geospatial discovery.
10. Ranking and trust signals.
11. Leads.
12. Visits.
13. Reviews and ratings.
14. Furniture inventory.
15. Furniture rentals.
16. Furniture sales.
17. Furniture deposits and returns.
18. Damage claims.
19. Suppliers and settlements.
20. Subscriptions.
21. Entitlements.
22. Payments.
23. Refunds.
24. Transactions and agreements.
25. Commission and settlements.
26. Notifications.
27. Real-time communication.
28. Urgency detection.
29. Moderation.
30. Administration.
31. Analytics.
32. Audit logging.
33. Reconciliation.
34. Operational health and monitoring.

This inventory does not mean that every domain must become a separate deployable service.

---

## 10. Core Backend-Owned Business Rules

The backend must own and enforce:

### Identity and access

- Phone-number and OTP authentication.
- Session and account security.
- Role-based authorization.
- Resource-level authorization.
- Administrative permissions.
- Broker verification restrictions.
- Agency and broker access boundaries.
- Auditing of sensitive actions.

### Ownership

The approved hybrid lead-ownership model is:

- An independent broker’s lead belongs to that broker.
- An agency lead belongs to the agency.
- Agencies may assign leads to brokers.
- Assignment does not automatically transfer ownership unless explicitly permitted by an approved rule.

### Listings

The backend must enforce:

- Listing ownership.
- Listing lifecycle transitions.
- Category-specific validation.
- Verification requirements.
- Moderation requirements.
- Publication eligibility.
- Availability status.
- Duplicate and fraud-prevention controls.
- Removal of stale or unavailable inventory.

### Ranking

The approved baseline is:

```text
Rank Score =
    Verification Score × 0.40
  + Customer Rating × 0.30
  + Verified Closures × 0.30
```

The implementation must also support:

- Geospatial discovery.
- Category-specific filters.
- Verified trust signals.
- Clearly separated sponsored placements.
- Governance over boosts.
- Removal of unavailable inventory from active discovery.

Sponsorship must never be presented deceptively as organic ranking.

### Visits and leads

The backend must own:

- Visit-slot availability.
- Visit booking.
- Broker acceptance.
- Rescheduling.
- Cancellation.
- Visit status.
- Broker check-in.
- Geolocation verification.
- Visit notes.
- Review eligibility.
- Lead-status transitions.

Relevant status actions include:

- `DEAL_DONE`
- `NOT_AVAILABLE`
- `NOT_INTERESTED`

These transitions must be validated and audited.

### Subscriptions and entitlements

The backend must own:

- Subscription plans.
- Subscription lifecycle.
- Payment-to-subscription reconciliation.
- Grace periods.
- Entitlement calculation.
- Usage limits.
- Contact-dial limits.
- Listing limits.
- Broker-seat limits.
- Boost credits.
- Feature access.

Frontend applications may display entitlement information but must not be the final authority for access control.

### Payments

The payment subsystem must own:

- Payment creation.
- Payment state transitions.
- Provider references.
- Webhook verification.
- Idempotency.
- Refunds.
- Payment reconciliation.
- Payment-failure handling.
- Audit records.

Razorpay is the initial payment adapter. Provider-specific details must be isolated behind a payment interface.

### Financial workflows

The backend must maintain auditable records for:

- Commissions.
- Transactions.
- Agreements.
- Settlements.
- Payouts.
- Refunds.
- Supplier settlements.
- Ad-related revenue where applicable.

Tax and legal rules requiring professional confirmation must be marked unresolved rather than invented.

### Reviews

The backend must enforce:

- Verified-visit eligibility.
- Review creation rules.
- Review editing and deletion rules.
- Screening status.
- Owner responses.
- Review reporting.
- Anti-manipulation safeguards.
- Rating aggregation safeguards.

### Urgency detection

The urgency engine must track relevant search behavior using Redis-based activity tracking.

The implementation must define:

- Event capture.
- Time-window handling.
- Deduplication.
- Threshold evaluation.
- Flag creation.
- Notification behavior.
- Super Admin visibility.
- Privacy controls.
- Reprocessing behavior.

---

## 11. External Integration Principles

External integrations must be isolated behind adapters or provider interfaces.

Expected integration categories include:

- Payment providers.
- WhatsApp Business API.
- SMS providers.
- Email providers, if approved.
- Object storage.
- Mapping or geolocation services.
- Push-notification providers.
- Monitoring providers.

Domain code must depend on internal interfaces rather than directly on provider SDKs.

Example:

```ts
interface PaymentGateway {
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<WebhookResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundResult>;
}
```

Concrete provider implementations should live in an infrastructure or integration layer.

---

## 12. API Contract Principles

All backend APIs must follow shared conventions.

### General rules

- Use RESTful resource-oriented routes.
- Use consistent HTTP status codes.
- Use JSON request and response bodies.
- Validate inputs at the API boundary.
- Use typed response contracts.
- Return consistent error structures.
- Apply authorization before sensitive operations.
- Avoid leaking internal implementation details.
- Document externally consumed endpoints.
- Support request correlation identifiers.
- Use pagination for potentially large collections.
- Use idempotency for retryable operations.
- Use appropriate concurrency controls.

### API consumers

The backend must provide stable contracts for:

- User Mobile App.
- Broker Mobile App.
- Super Admin Panel.
- Public Website.
- Future Agency Portal.

Frontend developers must consume approved backend APIs rather than accessing the database or reproducing business logic.

### Contract changes

Breaking API changes require:

- Explicit documentation.
- Impact analysis.
- Coordination with affected developers.
- Versioning or a controlled migration strategy.
- Updated API contracts.
- Updated tests.
- A migration or deprecation plan.

---

## 13. Security Baseline

Required security areas include:

- Secure OTP handling.
- Session security.
- Authorization checks.
- Input validation.
- Rate limiting.
- Abuse prevention.
- Sensitive-document protection.
- Audit logging.
- Secure secrets management.
- Webhook signature verification.
- Idempotency protection.
- Safe database-query mechanisms.
- Secure file access.
- Privacy-aware analytics.
- Administrative action auditing.

Sensitive verification documents must be stored in encrypted object storage and accessed through short-lived pre-signed URLs. The SOW specifies a maximum pre-signed URL validity of 15 minutes.

No sensitive document may be exposed through a permanent public URL.

---

## 14. Non-Functional Baseline

### Performance

The backend must be designed for:

- Efficient PostGIS queries.
- Spatial indexes.
- Appropriate database indexes.
- Redis caching where justified.
- Efficient pagination.
- Bounded payload sizes.
- Controlled concurrency.
- Background processing for slow operations.

The SOW identifies:

- A target below 120 ms for specified property filter-and-fetch operations across 50,000 seeded records.
- A p95 latency target below 200 ms for core APIs.
- A 99.9% uptime expectation.

These targets must be validated through realistic benchmarks.

### Reliability

The system must include:

- Timeouts.
- Retry policies.
- Idempotency.
- Graceful error handling.
- Background-job retry handling.
- Failure-management strategies.
- Scheduled reconciliation.
- Database backups.
- Restore testing.
- Operational audit logs.

### Observability

The backend must provide:

- Structured logs.
- Request correlation IDs.
- Error tracking.
- Health checks.
- Database health visibility.
- Redis health visibility.
- Job-processing visibility.
- API latency metrics.
- Operational dashboards.
- Actionable alerts for critical failures.

### Data integrity

Critical workflows must use appropriate transactions and concurrency controls, including:

- Payment state changes.
- Inventory availability.
- Listing status changes.
- Visit-slot allocation.
- Furniture deposits.
- Refunds.
- Commission calculations.
- Settlement records.
- Ownership changes.

A read-then-write sequence must not be considered safe when concurrent requests can violate a business invariant.

---

## 15. Development Rules for the Three Developers

### Shared backend ownership

The shared backend team owns:

- Domain modules.
- Database schema.
- API contracts.
- Authentication and authorization.
- Events.
- Background jobs.
- Shared infrastructure.
- Business rules.
- Integration adapters.

### Interface developer responsibilities

Interface developers own:

- UI.
- Navigation.
- Local state.
- API integration.
- Client-side validation for usability.
- Loading states.
- Error presentation.
- Platform-specific interaction patterns.
- Interface-specific tests.

They must not duplicate authoritative backend business rules.

### Shared contract rule

Before consuming an endpoint, an interface developer must use:

- The approved API contract.
- The approved response structure.
- The approved error format.
- The approved authentication mechanism.
- The approved pagination and filtering conventions.

If an endpoint is missing or inadequate, the developer must request a backend contract change rather than implement an undocumented workaround.

### No direct database access

None of the mobile or web applications may connect directly to PostgreSQL or Redis.

All business operations must go through the backend API or an explicitly approved real-time channel.

---

## 16. Scope-Control Rules

The team must remain within the approved BRD, SOW, and finalized project decisions.

The following require approval before implementation:

- Unrelated product features.
- Changes to the ownership model.
- Changes to subscription entitlements.
- Changes to commission policies.
- Replacement of the approved backend architecture.
- A new default payment provider.
- Independent business logic in frontend applications.
- Premature microservice extraction.
- Changes to critical security policies.
- New monetization mechanisms.
- Expansion of the current delivery scope.

Scope modifications must follow the agreed change-control process.

---

## 17. Definition of Done

This step is complete when the team has:

- [ ] Read and understood the approved BRD and SOW.
- [ ] Accepted the modular-monolith backend architecture.
- [ ] Confirmed the active interface scope.
- [ ] Confirmed React Native for both mobile applications.
- [ ] Confirmed Next.js for the Super Admin Panel and Public Website.
- [ ] Agreed to use one centralized version matrix.
- [ ] Understood backend module-boundary rules.
- [ ] Understood shared-business-logic ownership.
- [ ] Understood API-consumption rules.
- [ ] Confirmed that frontend applications will not access the database directly.
- [ ] Confirmed the security and observability baseline.
- [ ] Confirmed scope-control rules.
- [ ] Recorded unresolved legal, tax, or compliance decisions instead of inventing answers.

---

## 18. Acceptance Criteria

The Shared Core Backend team must not begin detailed domain implementation until:

1. The repository architecture is understood.
2. The approved backend architecture is documented.
3. The active interface scope is clear.
4. Technology-version governance is defined.
5. The domain inventory is accepted as the initial planning baseline.
6. API contract conventions are available.
7. Error-response conventions are available.
8. Database and migration responsibilities are documented.
9. Shared event and observability responsibilities are documented.
10. Critical business decisions are traceable to an approved source.
11. Unresolved legal, tax, or compliance questions are explicitly recorded.
12. All three developers agree to consume shared backend contracts instead of implementing duplicate business logic.

---

## 19. Output of Step 01

After completing this step, the project must have a shared understanding of:

- What the backend is responsible for.
- Which interfaces consume it.
- Which technologies are approved.
- How the modular monolith is organized.
- Where domain logic belongs.
- How developers coordinate.
- Which business rules must remain centralized.
- Which requirements are in scope.
- Which decisions require future clarification.

The next step will define the detailed backend architecture, module boundaries, dependency rules, and application composition strategy.
