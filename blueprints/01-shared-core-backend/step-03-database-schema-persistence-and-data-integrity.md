# Step 03 — Database Schema, Persistence Strategy, and Data Integrity

## 1. Purpose

This step defines the database and persistence implementation baseline for the Zero Brokerage backend.

The objective is to create a reliable PostgreSQL/PostGIS persistence foundation that supports:

- Multi-role platform workflows.
- Agency and broker ownership.
- Property listings and geospatial search.
- Visits and leads.
- Furniture rentals and sales.
- Payments and subscriptions.
- Transactions and reviews.
- Auditing, analytics, and operational reconciliation.

The implementation must preserve the approved modular-monolith architecture and must not introduce database patterns that bypass module ownership or weaken data integrity.

---

## 2. Database Technology Baseline

The initial persistence layer must use:

- PostgreSQL as the primary relational database.
- PostGIS for geospatial data and location queries.
- Version-controlled database migrations.
- Explicit transaction boundaries.
- Parameterized queries or a safe query builder.
- Database-level constraints for critical invariants.
- Separate configuration for local, test, staging, and production environments.

Redis may be used for caching, rate limiting, short-lived OTP-related data, distributed locks where justified, and background-job coordination. Redis must not become the source of truth for durable business records.

---

## 3. Database Ownership Principle

Every table must have one clearly identified owning module.

The owning module is responsible for:

- Table definition.
- Migrations.
- Constraints.
- Indexes.
- Repository access.
- Data lifecycle.
- Retention and deletion behavior.
- Sensitive-field handling.
- Audit requirements.
- Data-access tests.

Other modules may reference the owner's public application interface or use approved read-only projections. They must not directly mutate another module's tables.

A foreign key does not transfer ownership.

---

## 4. Required Persistence Package Responsibilities

The shared database package should provide technical capabilities such as:

- PostgreSQL connection management.
- Connection-pool configuration.
- Query execution helpers.
- Transaction helpers.
- Migration execution conventions.
- Database health checks.
- Safe shutdown behavior.
- Query logging hooks where appropriate.
- Test-database utilities.
- Standard database error mapping.
- Optional request-scoped transaction support.

The shared package must not contain domain-specific business rules such as broker approval, listing publication, lead ownership, or subscription entitlement decisions.

---

## 5. Migration Rules

All schema changes must be implemented through version-controlled migrations.

Migration rules:

- Never modify an already-applied migration in a shared environment.
- Use descriptive migration names.
- Keep each migration focused and reviewable.
- Include required indexes and constraints with the relevant table.
- Consider table size and locking impact before applying changes.
- Use safe rollout patterns for large production tables.
- Separate destructive changes from additive changes where practical.
- Document irreversible migrations.
- Test both migration application and rollback strategy where rollback is feasible.
- Do not manually change production schema outside the migration process.

Example migration naming pattern:

```text
20260920_001_create_identity_tables
20260920_002_create_user_profiles
20260920_003_create_agencies_and_memberships
```

The exact naming convention may be finalized by the backend team, but it must be consistent across the repository.

---

## 6. Core Data Modeling Rules

### 6.1 Identifiers

Use stable, non-sequential public identifiers where appropriate.

The team must decide and document whether the implementation uses UUID or another approved identifier strategy. The decision must be applied consistently across related tables.

Public identifiers must not expose sensitive internal sequencing or reveal record volume unnecessarily.

### 6.2 Timestamps

Persist timestamps consistently in UTC.

At minimum, important entities should include:

- `created_at`
- `updated_at`

Entities with lifecycle transitions should also include relevant timestamps such as:

- `submitted_at`
- `approved_at`
- `published_at`
- `cancelled_at`
- `completed_at`
- `deleted_at`

Do not use application-server local time as the authoritative timestamp.

### 6.3 Status Fields

Lifecycle statuses must be represented using documented values.

For each status-driven entity, document:

- Allowed statuses.
- Valid transitions.
- Actor permissions.
- Required side effects.
- Transition timestamps.
- Invalid-transition behavior.

Do not allow arbitrary client-provided status strings to be persisted.

### 6.4 Monetary Values

Monetary amounts must not be stored as floating-point numbers.

Use a precise database representation, such as:

- Integer minor units, or
- A suitable PostgreSQL numeric type.

The team must select one representation and apply it consistently.

Every monetary record must document:

- Currency.
- Gross amount.
- Applicable fees.
- Tax amount where relevant.
- Discount amount where relevant.
- Net amount.
- Calculation source or version where required.

### 6.5 Sensitive Data

Sensitive fields must be identified during schema design.

Examples include:

- Phone numbers.
- Identity and verification data.
- Legal documents.
- Payment references.
- Personal addresses.
- Private notes.
- Audit metadata containing personal information.

Sensitive data must have appropriate access restrictions, retention rules, and logging protections.

---

## 7. Initial Domain Data Inventory

The following inventory is a planning baseline. The team must refine exact table names and columns during schema design without changing ownership boundaries.

### 7.1 Identity and Users

Potential tables include:

- `users`
- `phone_identities`
- `otp_challenges`
- `sessions`
- `user_devices`
- `user_preferences`
- `account_security_events`
- `account_deletion_requests`

Responsibilities include identity references, session lifecycle, OTP controls, and account-level security records.

---

### 7.2 Agencies and Brokers

Potential tables include:

- `agencies`
- `agency_memberships`
- `agency_roles`
- `broker_profiles`
- `broker_verification_cases`
- `broker_verification_documents`
- `broker_status_history`

The schema must support:

- Independent brokers.
- Agency-affiliated brokers.
- Membership changes.
- Verification lifecycle.
- Suspension and re-verification.
- Auditability of administrative decisions.

---

### 7.3 Listings and Property Data

Potential tables include:

- `properties`
- `property_addresses`
- `property_locations`
- `property_media`
- `listings`
- `listing_ownership`
- `listing_verification_cases`
- `listing_moderation_cases`
- `listing_status_history`
- `listing_attributes`

The design must clearly distinguish:

- A physical property.
- A listing for that property.
- Listing ownership.
- Listing publication state.
- Verification and moderation state.
- Media metadata.

Geospatial data should use PostGIS-compatible types and indexes.

---

### 7.4 Visits and Leads

Potential tables include:

- `property_visits`
- `visit_participants`
- `visit_status_history`
- `leads`
- `lead_assignments`
- `lead_status_history`
- `lead_activities`

The schema must preserve:

- Visit lifecycle.
- Duplicate-request protections.
- Lead ownership.
- Agency-owned leads.
- Broker assignments.
- Audit history.

---

### 7.5 Furniture Marketplace

Potential tables include:

- `furniture_suppliers`
- `furniture_categories`
- `furniture_items`
- `furniture_inventory`
- `furniture_orders`
- `furniture_order_items`
- `furniture_rental_terms`
- `furniture_payments`
- `furniture_deliveries`
- `furniture_returns`
- `furniture_damage_claims`
- `supplier_settlements`

The design must support both rental and sale workflows without conflating their lifecycle rules.

---

### 7.6 Payments and Subscriptions

Potential tables include:

- `payment_orders`
- `payment_attempts`
- `payment_transactions`
- `payment_webhook_events`
- `refunds`
- `payment_reconciliation_records`
- `subscription_plans`
- `subscription_plan_features`
- `subscriptions`
- `subscription_events`
- `entitlement_snapshots` or an equivalent approved model

Payment-provider identifiers must be stored separately from internal identifiers.

Webhook records must support idempotency and replay investigation.

---

### 7.7 Transactions and Reviews

Potential tables include:

- `property_transactions`
- `transaction_participants`
- `transaction_agreements`
- `transaction_status_history`
- `commission_records`
- `settlement_records`
- `reviews`
- `review_category_ratings`
- `review_responses`
- `review_reports`
- `review_status_history`

The design must ensure that transaction completion and review eligibility cannot be forged by client input.

---

### 7.8 Notifications and Analytics

Potential tables include:

- `notifications`
- `notification_preferences`
- `notification_deliveries`
- `notification_templates`
- `analytics_events`
- `analytics_daily_aggregates`
- `export_jobs`

Analytics storage must respect retention and privacy requirements.

---

### 7.9 Administration and Audit

Potential tables include:

- `audit_logs`
- `administrative_actions`
- `moderation_actions`
- `platform_settings`
- `operational_incidents`
- `reconciliation_runs`

Audit records must be append-oriented and protected from ordinary business-user modification.

---

## 8. Constraints and Integrity Rules

Critical business invariants must be enforced at the database level wherever practical.

Examples include:

- Unique phone identity constraints.
- Unique active session or token identifiers.
- Unique agency membership relationships.
- Unique active ownership relationships where required.
- Preventing duplicate active assignments.
- Preventing duplicate webhook-event processing.
- Preventing duplicate active reservations.
- Preventing conflicting inventory allocations.
- Enforcing valid references between related records.
- Preventing negative inventory quantities where applicable.
- Enforcing unique external provider identifiers within the relevant provider scope.

Application checks are still required, but application checks alone are insufficient for race-sensitive invariants.

---

## 9. Concurrency and Race-Condition Controls

The team must identify all workflows where two requests can compete for the same resource.

Examples include:

- Two users requesting the same visit slot.
- Two users attempting to reserve the same furniture item.
- Two administrators acting on the same verification case.
- Two webhook deliveries updating the same payment.
- Two brokers attempting conflicting lead assignments.
- Two processes changing listing publication state.
- Two requests attempting to release or allocate the same inventory.

Possible controls include:

- Unique or partial unique indexes.
- Transactions.
- Appropriate row-level locks.
- Optimistic concurrency checks.
- Version columns.
- Idempotency keys.
- State-transition guards.
- Serializable or stricter isolation only when justified.

Every concurrency control must document the invariant it protects and the failure behavior returned to the client.

---

## 10. Repository Rules

Repositories must:

- Encapsulate persistence operations for their owning module.
- Use parameterized queries or safe query APIs.
- Avoid leaking raw database records into HTTP responses.
- Map database errors into application-level errors.
- Support pagination for list operations.
- Avoid unbounded queries.
- Avoid N+1 query patterns.
- Make transaction participation explicit.
- Include tests for constraints and failure cases.
- Avoid hidden side effects in read methods.

Repositories must not decide user-facing authorization policy unless the policy is explicitly a data-access constraint. Authorization belongs in the application/domain layers.

---

## 11. Pagination and Query Performance

All potentially large list endpoints must define a pagination strategy.

The team must standardize:

- Default page size.
- Maximum page size.
- Cursor or offset pagination policy.
- Stable sort order.
- Tie-breaker fields.
- Invalid cursor behavior.
- Filtering rules.
- Query timeout behavior.

For high-volume or frequently changing datasets, cursor pagination should be evaluated before using offset pagination.

Queries must be reviewed for:

- Index usage.
- Join cardinality.
- Sort cost.
- Full-table scans.
- Geospatial query performance.
- Count-query cost.
- Potential data leakage through filters.

---

## 12. Geospatial Persistence

Property location data must be modeled using a consistent coordinate reference system.

The implementation must define:

- Coordinate storage format.
- Coordinate reference system.
- Input validation.
- Latitude and longitude bounds.
- Geospatial indexes.
- Radius-search behavior.
- Bounding-box behavior where applicable.
- Missing or approximate location handling.
- Privacy rules for displaying exact addresses.

User-facing search must not expose private location data beyond the approved product behavior.

---

## 13. Soft Deletion, Archival, and Retention

For each entity, document whether it uses:

- Hard deletion.
- Soft deletion.
- Archival.
- An anonymization workflow.
- Permanent retention for audit purposes.

The decision must account for:

- Legal and compliance obligations.
- User deletion requests.
- Financial records.
- Audit records.
- Fraud-prevention requirements.
- Referential integrity.
- Reporting requirements.

Do not apply soft deletion indiscriminately. It can complicate uniqueness, indexing, and query correctness.

---

## 14. Outbox and Reliable Event Publication

When a database change and an event publication must remain consistent, use an approved reliable-publication pattern.

The preferred approach is a transactional outbox or an equivalent documented mechanism.

The pattern should support:

- Event persistence in the same database transaction as the business change.
- Safe event dispatch.
- Retry handling.
- Idempotent consumers.
- Failure visibility.
- Dead-letter or manual-recovery handling.
- Event versioning.
- Operational monitoring.

Do not publish a critical event only after a successful database commit without a recovery strategy for process failure between the two operations.

---

## 15. Backup, Recovery, and Operational Requirements

The database implementation must support:

- Automated backups according to the approved operational plan.
- Separate backup storage.
- Backup monitoring.
- Restoration testing.
- Documented recovery procedures.
- Recovery-point and recovery-time expectations.
- Migration compatibility checks.
- Protection of backup credentials and encryption keys.

The team must not claim that backups are usable until restoration has been tested.

---

## 16. Database Testing Requirements

The team must implement tests for:

### Schema Tests

- Migration application.
- Required tables and columns.
- Constraints.
- Index creation.
- Foreign-key behavior.

### Repository Tests

- Create, read, update, and delete behavior.
- Pagination.
- Filtering.
- Mapping.
- Error conversion.
- Transaction behavior.

### Integrity Tests

- Duplicate prevention.
- Invalid state prevention.
- Ownership constraints.
- Idempotency constraints.
- Race-sensitive workflows.

### Performance Checks

- Query plans for critical queries.
- Geospatial search queries.
- Large-list pagination.
- High-frequency lookup paths.
- Index effectiveness.

---

## 17. Required Deliverables

The implementation team must produce:

1. A database ownership matrix.
2. An initial ERD or equivalent schema diagram.
3. Version-controlled migrations for the first database slice.
4. A documented identifier strategy.
5. A documented monetary-value strategy.
6. A timestamp and timezone policy.
7. A status-transition data model policy.
8. An index and query-performance plan.
9. A concurrency-control inventory.
10. A retention and deletion matrix.
11. A reliable event-publication design.
12. Database and repository test coverage for the implemented slice.

---

## 18. Definition of Done

This step is complete when:

- PostgreSQL and PostGIS connectivity is working locally.
- The migration workflow is established.
- Database ownership is assigned to modules.
- Initial schemas follow the module boundaries.
- Critical constraints are implemented or explicitly tracked.
- Transaction requirements are documented.
- Concurrency-sensitive workflows have identified controls.
- Pagination and geospatial conventions are documented.
- Sensitive-data and retention decisions are recorded.
- Repository patterns are consistent.
- Database tests run reliably in the development environment.
- No business module bypasses the persistence ownership rules.

---

## 19. Acceptance Criteria

- [ ] PostgreSQL is the source of truth for durable business data.
- [ ] PostGIS is configured for approved location-based functionality.
- [ ] All schema changes are version-controlled.
- [ ] Every table has an owning module.
- [ ] Critical uniqueness and integrity rules are enforced at the database level where practical.
- [ ] Monetary values do not use floating-point storage.
- [ ] Timestamps are stored consistently in UTC.
- [ ] Status transitions are documented and guarded.
- [ ] Race-sensitive workflows have explicit concurrency controls.
- [ ] Repositories do not expose raw database records directly to clients.
- [ ] Large list operations use bounded pagination.
- [ ] Geospatial queries have an indexing strategy.
- [ ] Retention and deletion behavior is documented.
- [ ] Reliable event publication is designed for critical state changes.
- [ ] Backup and restoration expectations are documented.
- [ ] Database and repository tests cover the implemented scope.
- [ ] No unrelated schema or product scope is introduced.
