# Step 09 — Payments, Subscriptions, Entitlements, Refunds, and Financial Integrity

## 1. Document Purpose

This document defines the implementation contract for the shared backend capabilities related to:

- Subscription plans and subscription lifecycle
- Platform entitlements
- Razorpay payment integration
- Payment orders and payment attempts
- Webhook verification and processing
- Payment state transitions
- Refunds and reversals
- GST-aware financial metadata
- Payment reconciliation
- Financial auditability
- Secure integration boundaries for future commission and settlement workflows

This document is intended for the shared backend implementation team and for interface developers consuming stable payment and subscription APIs.

The implementation must remain within the approved BRD/SOW scope and the finalized Zero Brokerage decisions. Do not introduce unsupported financial products, lending, wallets, or payment methods.

---

## 2. Objectives

Implement a secure and auditable financial foundation that allows the platform to:

1. Define and manage subscription plans.
2. Assign subscription entitlements to eligible users, brokers, agencies, or other approved account types.
3. Create payment orders through the approved payment provider.
4. Verify payment callbacks and webhooks cryptographically.
5. Handle duplicate, delayed, reordered, or missing payment events safely.
6. Maintain authoritative internal payment states.
7. Support payment success, failure, cancellation, expiry, refund, and reversal flows.
8. Apply subscription activation and expiry rules consistently.
9. Separate payment facts from entitlement decisions.
10. Preserve financial records for audit and reconciliation.
11. Avoid granting access based only on client-side payment claims.
12. Provide operational recovery for provider outages and inconsistent states.

---

## 3. Scope Boundaries

### 3.1 Included

- Subscription plan definitions
- Plan versions and pricing metadata
- Subscription lifecycle
- Entitlement definitions and checks
- Razorpay adapter boundary
- Payment order creation
- Payment attempt tracking
- Payment verification
- Webhook signature verification
- Webhook idempotency
- Payment state machine
- Refund request and processing foundations
- Payment reconciliation
- GST-related metadata
- Financial audit records
- Payment failure handling
- Grace periods where approved
- API contracts and events

### 3.2 Excluded

Do not implement the following in this step unless separately approved:

- Banking or wallet functionality
- Lending or credit products
- Cash collection
- Unsupported payment providers
- Commission calculation and settlement execution
- Complex accounting or double-entry general ledger
- Tax filing
- Legal or tax advice
- Promotional pricing rules not documented in an approved decision
- Arbitrary manual balance adjustments

Commission and settlement modules may consume finalized payment events and financial records but must not alter payment facts directly.

---

## 4. Financial Design Principles

### 4.1 Provider-Agnostic Boundary

Create a provider adapter interface so the domain layer does not depend directly on Razorpay SDK calls.

The domain layer should work with internal concepts such as:

- Payment order
- Payment attempt
- Provider transaction reference
- Payment status
- Refund
- Webhook event

The initial implementation may use Razorpay V1, but provider-specific details must remain inside the adapter or integration layer.

### 4.2 Internal State Is Authoritative

The platform must not mark a payment successful solely because:

- The frontend reports success.
- A client sends a provider payment ID.
- A redirect returns a success query parameter.
- A browser callback appears valid without server verification.

Payment success requires trusted server-side verification or a verified provider webhook, subject to the final consistency policy.

### 4.3 Money Representation

- Store monetary values as integer minor units, such as paise, where supported.
- Store currency explicitly.
- Never use floating-point arithmetic for financial amounts.
- Use decimal-safe calculations for tax and derived values.
- Record the calculation basis and rounding policy.
- Do not silently round values differently across modules.

### 4.4 Immutable Financial Facts

Once a payment attempt or provider transaction fact is recorded, do not overwrite it to make the data appear consistent.

Use:

- Append-only event records
- Status history
- Reconciliation records
- Explicit correction or adjustment records where approved

---

## 5. Subscription and Plan Model

### 5.1 Plan Concepts

Separate:

- Plan definition
- Plan version
- Price
- Billing interval
- Entitlement set
- Availability state

A plan change must not retroactively alter the meaning of an existing subscription.

### 5.2 Recommended `subscription_plans` Fields

- `id`
- `public_id`
- `code`
- `name`
- `description`
- `audience_type`
- `status`
- `created_at`
- `updated_at`

### 5.3 Recommended `subscription_plan_versions` Fields

- `id`
- `plan_id`
- `version`
- `currency`
- `amount_minor`
- `billing_interval`
- `trial_days`, if approved
- `grace_period_days`
- `effective_from`
- `effective_until`, nullable
- `tax_category`
- `metadata`
- `created_at`

### 5.4 Recommended `subscription_entitlements` Fields

- `id`
- `plan_version_id`
- `entitlement_code`
- `limit_value`, nullable
- `limit_unit`, nullable
- `configuration`
- `created_at`

Entitlement codes must be centrally defined and versioned. Avoid hardcoding plan names throughout the codebase.

### 5.5 Plan Lifecycle

Suggested plan states:

- `DRAFT`
- `ACTIVE`
- `PAUSED`
- `RETIRED`

Retiring a plan must not break existing subscriptions. New subscriptions must not use a retired plan unless an explicit migration policy permits it.

---

## 6. Subscription Lifecycle

### 6.1 Recommended Subscription States

The final enum must be aligned with the shared API contract. A suitable initial lifecycle is:

- `PENDING_PAYMENT`
- `ACTIVE`
- `TRIALING`
- `PAST_DUE`
- `GRACE_PERIOD`
- `CANCELLED`
- `EXPIRED`
- `SUSPENDED`
- `REFUNDED`

Do not permit arbitrary client-provided status updates.

### 6.2 Recommended `subscriptions` Fields

- `id`
- `public_id`
- `subscriber_type`
- `subscriber_id`
- `plan_id`
- `plan_version_id`
- `status`
- `started_at`
- `current_period_start`
- `current_period_end`
- `cancelled_at`
- `cancelled_by`
- `cancel_reason`
- `grace_period_end`
- `ended_at`
- `created_at`
- `updated_at`
- `version`

The subscriber identity must be explicit. Do not infer the subscriber from a request body alone.

### 6.3 Activation Rules

A subscription may become active only after:

1. The subscription request is authorized.
2. The selected plan version is valid.
3. A payment order or approved payment path exists.
4. The payment is verified successfully.
5. The transaction commits successfully.
6. Entitlements are calculated from the immutable plan version.

### 6.4 Renewal and Expiry

If recurring billing is approved later, implement it through an explicit provider and mandate contract. Do not assume recurring payment support from one-time order APIs.

For manually renewed subscriptions:

- Create a new payment order.
- Preserve the prior subscription period.
- Avoid double activation.
- Extend the correct period only after verified payment.
- Record the source payment reference.

Expired subscriptions must not retain active entitlements unless a documented grace-period rule applies.

---

## 7. Entitlement Engine

### 7.1 Centralized Entitlement Evaluation

Create one entitlement service used by:

- Listing creation limits
- Listing publication controls
- Furniture-related access, where applicable
- Broker or agency feature access
- Subscription-protected analytics
- Other approved gated capabilities

Do not duplicate plan checks in individual controllers or interface applications.

### 7.2 Entitlement Result

The service should return:

- Whether access is allowed
- Entitlement code
- Current usage, where relevant
- Maximum allowed usage, where relevant
- Remaining allowance, where relevant
- Subscription context
- Denial reason code
- Grace-period information, where applicable

### 7.3 Usage Limits

If a plan includes quotas:

- Define the measurement period.
- Define whether failed attempts consume quota.
- Define whether deleted or withdrawn records count.
- Define how usage is calculated under concurrency.
- Use database-safe counters or transactional queries.
- Prevent quota bypass through parallel requests.

### 7.4 Administrative Overrides

Administrative overrides must be:

- Explicit
- Time-bounded where possible
- Permission-protected
- Reason-required
- Audited
- Separate from the underlying subscription plan

Do not mutate a plan record to create a one-off customer exception.

---

## 8. Payment Order and Attempt Workflow

### 8.1 Payment Order Creation

When creating a payment order:

1. Authenticate the caller.
2. Authorize the requested product or subscription action.
3. Resolve the authoritative amount from the selected plan or product.
4. Calculate approved tax metadata.
5. Create an internal payment order in a pending state.
6. Call the provider adapter.
7. Store the provider order reference.
8. Return only the client-safe payment initialization data.
9. Do not mark the payment successful at order creation time.

The client must not be allowed to choose the amount independently.

### 8.2 Recommended `payment_orders` Fields

- `id`
- `public_id`
- `order_type`
- `customer_type`
- `customer_id`
- `reference_type`
- `reference_id`
- `amount_minor`
- `tax_amount_minor`
- `total_amount_minor`
- `currency`
- `status`
- `provider`
- `provider_order_id`
- `idempotency_key`
- `expires_at`
- `created_at`
- `updated_at`

### 8.3 Recommended `payment_attempts` Fields

- `id`
- `public_id`
- `payment_order_id`
- `provider_payment_id`
- `status`
- `amount_minor`
- `currency`
- `method_type`
- `provider_payload_reference`
- `failure_code`
- `failure_message_safe`
- `verified_at`
- `created_at`
- `updated_at`

### 8.4 Idempotency

Payment order creation must be idempotent for the relevant business operation.

A retry must not create multiple active orders for the same subscription activation request unless the policy explicitly allows it.

---

## 9. Payment Verification

### 9.1 Verification Sources

Accept payment confirmation only through approved server-side mechanisms:

- Server-side provider verification
- Verified provider webhook
- Approved reconciliation query

Do not trust raw client payloads.

### 9.2 Verification Checks

Verify:

- Provider signature or cryptographic proof
- Provider order ID
- Provider payment ID
- Expected amount
- Expected currency
- Internal payment-order relationship
- Payment status
- Duplicate processing status
- Reference and customer context

A provider payment ID must not be attached to an unrelated internal order.

### 9.3 State Transition

Payment success processing must be transactional:

1. Lock or safely claim the internal payment order.
2. Check whether the event was already processed.
3. Validate provider facts.
4. Record the payment attempt.
5. Transition the internal payment order.
6. Activate or update the related business object.
7. Create audit and outbox records.
8. Commit.
9. Trigger asynchronous notifications and downstream work.

If any mandatory database operation fails, the workflow must not partially activate entitlements.

---

## 10. Webhook Processing

### 10.1 Webhook Endpoint

The webhook endpoint must:

- Accept the provider's required raw payload format.
- Verify the signature before parsing trusted business data.
- Enforce request-size limits.
- Record a provider event identifier.
- Be idempotent.
- Return provider-compatible responses without exposing internal details.

### 10.2 Recommended `payment_webhook_events` Fields

- `id`
- `provider`
- `provider_event_id`
- `event_type`
- `signature_verified`
- `payload_reference`
- `processing_status`
- `received_at`
- `processed_at`
- `failure_reason_safe`
- `retry_count`

Add a unique constraint on the provider plus provider event ID where supported.

### 10.3 Event Ordering

Webhooks may arrive:

- More than once
- Out of order
- After a delay
- Before a client redirect
- After an internal timeout

The implementation must use a state transition policy that safely handles these conditions.

A stale failure event must not overwrite a verified successful payment.

### 10.4 Retry Strategy

Failed webhook processing must support:

- Retry with backoff
- Dead-letter or manual review
- Structured error logging
- Reprocessing by provider event ID
- Safe replay without duplicate business effects

---

## 11. Refunds and Reversals

### 11.1 Refund Rules

Refunds must be initiated only by authorized workflows.

Before requesting a refund:

- Verify that the payment is refundable.
- Verify the refundable amount.
- Prevent refunding more than the captured amount.
- Record the actor and reason.
- Create an internal refund record.
- Call the provider adapter.
- Reconcile the provider result.

### 11.2 Recommended `refunds` Fields

- `id`
- `public_id`
- `payment_attempt_id`
- `requested_amount_minor`
- `processed_amount_minor`
- `currency`
- `status`
- `provider_refund_id`
- `reason_code`
- `requested_by`
- `requested_at`
- `processed_at`
- `failure_reason_safe`

### 11.3 Refund States

Suggested states:

- `REQUESTED`
- `PROCESSING`
- `SUCCEEDED`
- `FAILED`
- `PARTIALLY_SUCCEEDED`
- `CANCELLED`

The final enum must be aligned with the API contract.

### 11.4 Subscription Effects

A refund does not automatically imply a single universal subscription outcome.

Define and centralize the policy for:

- Full refund
- Partial refund
- Refund before activation
- Refund after activation
- Chargeback or provider reversal

Do not silently revoke access without applying the approved business rule and recording the reason.

---

## 12. GST and Tax Metadata

### 12.1 Tax-Aware Design

The system should store tax-related facts needed for invoices and reporting, including:

- Tax category
- Taxable amount
- Tax amount
- Tax rate or rate metadata
- Currency
- Billing address snapshot where required
- Customer tax identifiers where legally and operationally required
- Calculation version

### 12.2 Policy Boundary

The implementation must not invent final GST treatment.

Any unresolved tax treatment must be documented as a business/legal decision requiring confirmation from the appropriate professional or authorized stakeholder.

### 12.3 Invoice References

If invoices are in scope:

- Store an immutable invoice reference.
- Preserve the billed amount and tax snapshot.
- Avoid regenerating historical invoices from current plan data.
- Restrict invoice access to authorized users.

---

## 13. Reconciliation and Financial Integrity

### 13.1 Reconciliation Sources

Reconcile internal records against provider data for:

- Orders
- Captured payments
- Failed payments
- Refunds
- Reversals
- Missing webhooks
- Duplicate events
- Amount mismatches

### 13.2 Reconciliation States

Recommended outcomes:

- `MATCHED`
- `MISSING_INTERNAL_RECORD`
- `MISSING_PROVIDER_RECORD`
- `AMOUNT_MISMATCH`
- `STATUS_MISMATCH`
- `DUPLICATE_PROVIDER_REFERENCE`
- `REQUIRES_MANUAL_REVIEW`
- `RESOLVED`

### 13.3 Reconciliation Jobs

Jobs must:

- Process bounded batches.
- Be resumable.
- Avoid duplicate corrective actions.
- Record source timestamps.
- Produce actionable mismatch records.
- Never silently modify immutable payment facts.
- Require explicit authorization for manual resolution.

### 13.4 Operational Alerts

The system must surface actionable alerts for:

- Signature verification failures
- Repeated webhook failures
- Amount mismatches
- Unresolved payment states
- Refund failures
- Provider API outages
- Reconciliation backlog
- Unexpected duplicate provider references

---

## 14. API Contract Requirements

The exact route names must be finalized in the shared API contract documentation.

### 14.1 Customer/Broker/Agency APIs

Required capabilities may include:

- View available plans
- View plan details and entitlements
- Create a subscription request
- Create a payment order
- Retrieve payment initialization data
- Confirm or refresh payment status
- View own subscription status
- View own payment history
- View eligible invoices or receipts
- Request an eligible cancellation or refund

### 14.2 Administrative APIs

Required capabilities may include:

- Create and version plans
- Activate, pause, or retire plans
- Configure approved entitlements
- View subscriptions
- View payment orders and attempts
- Inspect webhook events
- Review failed payments
- Initiate authorized refunds
- View reconciliation mismatches
- Resolve operational exceptions with a reason
- View financial audit records

Administrative payment actions require explicit permissions and additional audit controls.

### 14.3 Provider-Facing Endpoints

Provider webhook endpoints must:

- Be isolated from ordinary authenticated application routes.
- Use provider-specific signature verification.
- Enforce request limits.
- Avoid exposing internal records in responses.
- Support safe retry behavior.

---

## 15. Events and Background Jobs

### 15.1 Domain Events

Define versioned events for at least:

- `subscription.created`
- `subscription.activated`
- `subscription.renewed`
- `subscription.entered_grace_period`
- `subscription.expired`
- `subscription.cancelled`
- `subscription.suspended`
- `payment_order.created`
- `payment.succeeded`
- `payment.failed`
- `payment.reversed`
- `refund.requested`
- `refund.succeeded`
- `refund.failed`
- `entitlement.changed`
- `reconciliation.mismatch_detected`
- `reconciliation.resolved`

Events must include stable IDs, schema versions, correlation IDs, actor/source context, and occurred-at timestamps.

### 15.2 Background Jobs

Implement or register jobs for:

- Subscription expiry
- Grace-period evaluation
- Payment status reconciliation
- Webhook retry
- Refund status refresh
- Provider reconciliation
- Unresolved-payment detection
- Entitlement cache refresh, if caching is used
- Invoice or receipt generation, if approved
- Financial audit consistency checks

Every job must be idempotent, observable, retry-safe, and bounded.

---

## 16. Security Requirements

- Never trust client-provided payment amounts.
- Verify provider signatures using the correct raw payload.
- Keep provider secrets outside source control.
- Use environment-specific credentials.
- Restrict webhook processing paths.
- Prevent replay of already-processed provider events.
- Enforce ownership and subscriber authorization on payment history.
- Protect invoices and financial documents.
- Redact payment secrets and sensitive provider payloads from logs.
- Do not log full card, bank, or authentication secrets.
- Apply strict administrative permissions to refunds and plan changes.
- Use transactions for payment-to-entitlement activation.
- Maintain audit records for all manual financial actions.
- Avoid exposing whether another user's payment or subscription exists.

---

## 17. Observability and Auditability

Capture structured logs and metrics for:

- Payment order creation
- Provider API latency and failures
- Payment success and failure rates
- Webhook verification failures
- Webhook processing latency
- Duplicate webhook events
- Refund success and failure
- Subscription activation latency
- Grace-period transitions
- Entitlement denial rates
- Reconciliation mismatches
- Manual financial overrides
- Provider outages

Every important financial action must be traceable through:

- Internal public ID
- Provider reference where appropriate
- Subscriber or customer context
- Correlation ID
- Previous state
- New state
- Amount and currency
- Actor or source
- Reason
- Timestamp

---

## 18. Testing Requirements

### 18.1 Unit Tests

Cover:

- Money and minor-unit calculations
- Plan-version selection
- Entitlement evaluation
- Subscription transitions
- Payment state transitions
- Signature verification helpers
- Webhook event deduplication
- Refund amount validation
- Tax metadata calculation boundaries
- Reconciliation classification

### 18.2 Integration Tests

Cover:

- Subscription creation
- Payment order creation with server-derived amounts
- Provider adapter behavior through mocks
- Successful payment verification
- Failed payment handling
- Duplicate webhook processing
- Out-of-order webhook processing
- Payment-to-entitlement atomicity
- Refund initiation and status updates
- Subscription expiry and grace-period jobs
- Reconciliation mismatch creation
- Administrative audit records

### 18.3 End-to-End Tests

At minimum:

1. An eligible account views an active plan.
2. The account creates a subscription request.
3. The backend creates a payment order using the authoritative amount.
4. A verified payment activates the subscription.
5. Entitlement checks reflect the active plan.
6. A duplicate webhook does not duplicate activation.
7. An invalid signature is rejected.
8. A failed payment does not activate entitlements.
9. An expired subscription loses gated access unless a valid grace rule applies.
10. An authorized refund follows the approved workflow.
11. A reconciliation mismatch is visible to authorized administrators.

### 18.4 Security Tests

Test:

- Client-side amount tampering
- Invalid webhook signatures
- Webhook replay
- Cross-account payment-history access
- Unauthorized refunds
- Unauthorized plan changes
- Provider-secret exposure
- Sensitive payload logging
- Duplicate payment processing
- Concurrent subscription activation

---

## 19. Implementation Deliverables

The implementation team must deliver:

- Plan and plan-version migrations
- Entitlement model and evaluation service
- Subscription lifecycle service
- Payment order and payment attempt models
- Provider adapter interface
- Razorpay adapter implementation boundary
- Secure payment verification flow
- Webhook endpoint and processing pipeline
- Refund model and workflow foundations
- GST/tax metadata structures
- Reconciliation records and jobs
- Financial audit integration
- Versioned API schemas
- Domain events and outbox integration
- Background jobs with retry and dead-letter handling
- Unit, integration, security, and end-to-end tests
- Updated API and architecture documentation

---

## 20. Definition of Done

This step is complete only when:

- Payment amounts are always derived server-side.
- Money is stored safely without floating-point calculations.
- Provider-specific code is isolated behind an adapter boundary.
- Payment verification and webhook signatures are enforced.
- Duplicate and out-of-order provider events are handled safely.
- Payment-to-entitlement activation is atomic.
- Subscription states and transitions are centralized.
- Plan versions preserve historical pricing and entitlement meaning.
- Refunds are authorized, auditable, and amount-safe.
- Reconciliation detects and records financial mismatches.
- Sensitive payment data is protected and redacted from logs.
- Administrative financial actions require explicit permissions.
- Interface teams can consume payment and subscription APIs without duplicating financial logic.

---

## 21. Acceptance Criteria

1. An authorized account can view active subscription plans and their entitlements.
2. The backend derives the payment amount from the selected plan version.
3. A client cannot activate a subscription by submitting a fabricated success payload.
4. Invalid provider signatures are rejected.
5. Duplicate webhook events do not duplicate payment or subscription effects.
6. Out-of-order events cannot incorrectly downgrade a verified successful payment.
7. A verified payment activates the related subscription transactionally.
8. A failed or unverified payment does not grant paid entitlements.
9. Plan retirement does not corrupt existing subscriptions.
10. Entitlement checks are centralized and reusable by other modules.
11. Refunds cannot exceed the eligible refundable amount.
12. Financial records preserve immutable provider facts and auditable state history.
13. Reconciliation mismatches are visible and actionable to authorized administrators.
14. Subscription expiry and grace-period processing is retry-safe.
15. Shared database, validation, events, observability, and authorization packages are reused.
16. No interface duplicates payment, subscription, entitlement, refund, or reconciliation business rules.

---

## 22. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the existing shared-core architecture before making changes.
2. Read the API conventions, database architecture, identity, authorization, events, and configuration documents first.
3. Reuse the shared database, transaction, validation, event, observability, and authorization packages.
4. Do not create a second payment client, subscription checker, or entitlement engine.
5. Keep provider-specific logic behind a clearly defined adapter interface.
6. Implement migrations before using new financial tables.
7. Use integer minor units and explicit currency fields.
8. Verify all provider callbacks and webhooks on the server.
9. Add tests for duplicate, delayed, reordered, and replayed provider events.
10. Never log secrets or sensitive provider payloads.
11. Keep financial state transitions and entitlement activation transactional.
12. Document unresolved GST or accounting decisions instead of inventing them.
13. Do not implement UI code in this step.
14. Do not implement commission settlement or complex accounting unless separately approved.
15. Update API contracts and operational documentation alongside implementation.
16. Do not mark the step complete until the Definition of Done and Acceptance Criteria have been verified.
