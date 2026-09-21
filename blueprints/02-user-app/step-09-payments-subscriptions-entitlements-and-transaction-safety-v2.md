# User App Blueprint — Step 9: Payments, Subscriptions, Entitlements, and Transaction Safety

## 1. Purpose

Define the User App implementation contract for subscription-plan discovery, payment initiation, payment-status recovery, subscription visibility, entitlement display, payment history, invoices/receipts, cancellation, and refund-status experiences.

The User App must consume the Shared Core Backend contracts for payments, subscriptions, entitlements, billing, taxation, transaction lifecycle, notifications, authorization, and auditability. It must not implement financial state transitions, webhook verification, tax calculation, refund decisions, reconciliation, or entitlement formulas locally.

## 2. Objectives

The implementation must allow eligible users to:

- View available subscription plans and backend-provided benefits.
- Understand billing interval, currency, limits, exclusions, and renewal terms.
- Start an approved purchase flow.
- Complete payment through the approved provider flow.
- Recover safely from cancellation, interruption, timeout, app restart, or uncertain payment status.
- View server-confirmed subscription and entitlement states.
- View payment history and approved invoices/receipts.
- Access permitted cancellation, renewal, refund, and support workflows.
- Receive clear, accessible feedback for every financial operation.

## 3. Scope Boundaries

### Included

- Plan list and plan details
- Informational plan comparison
- Backend-created payment-session/order initiation
- Approved payment-provider SDK or handoff integration
- Payment return, pending, failure, and recovery screens
- Subscription-status screen
- Entitlement and usage display
- Payment history
- Invoice/receipt access
- Cancellation or renewal-management entry points where supported
- Refund-status display
- Payment-related notifications and deep links
- Security, accessibility, analytics, and automated tests

### Excluded

- Provider secrets or private keys
- Client-side webhook/signature verification
- Local financial confirmation
- Tax or fee calculation
- Refund approval or settlement logic
- Commission calculation
- Administrative payment operations
- Direct database access
- Local entitlement calculation
- Unapproved discounts, coupons, pricing, or legal wording

## 4. Authority Rules

The backend is authoritative for:

- Plan availability, prices, currency, and billing interval
- Taxes, fees, discounts, and payable amounts
- Payment and transaction status
- Subscription activation, renewal, cancellation, and grace periods
- Refund status
- Entitlements and usage counters
- Invoice availability and document validity
- Provider references and reconciliation state

The app must not hardcode prices, benefits, limits, taxes, renewal terms, or payment states. A provider SDK callback is only an input to the flow; it is not proof of final payment success.

## 5. Plan Discovery and Comparison

Render only backend-provided plan data, which may include:

- Plan name and description
- Billing interval
- Display price and currency
- Applicable tax/fee labels
- Included entitlements and usage limits
- Eligibility requirements
- Trial or introductory terms, where approved
- Renewal and cancellation information
- Availability state

If comparison is enabled:

- Compare only approved attributes.
- Label unavailable or non-comparable values clearly.
- Do not invent a “best” plan or personalized recommendation.
- Do not expose internal plan identifiers.
- Keep comparison informational; it must not alter the authoritative purchase configuration.

## 6. Purchase Flow

Implement the following sequence:

1. User selects an available plan.
2. App retrieves or validates current plan details.
3. App requests a purchase session/order from the backend.
4. Backend returns approved provider-session data.
5. App launches the approved provider flow.
6. App handles success, failure, cancellation, interruption, timeout, or backgrounding.
7. App requests authoritative payment and subscription status from the backend.
8. App renders the confirmed or pending result.
9. App refreshes subscription and entitlement data.
10. App provides the next permitted action.

Requirements:

- Prevent duplicate initiation.
- Use backend-supported idempotency keys.
- Never construct payable amounts locally.
- Never alter provider order or subscription identifiers.
- Recover in-progress attempts after app restart where practical.
- Do not claim success merely because the provider flow returned successfully.

## 7. Payment-State Handling

Render only states defined by the shared API contract. Possible states may include:

- Created
- Pending
- Processing
- Succeeded
- Failed
- Cancelled
- Expired
- Requires action
- Refunded
- Partially refunded
- Reconciliation pending

For every state:

- Explain the state in approved user-facing language.
- Show the relevant plan or transaction context.
- Provide only permitted next actions.
- Hide internal provider diagnostics.

When the state is uncertain, show a payment-verification-pending state. Do not immediately encourage another payment. Refresh the backend status and provide support guidance when unresolved.

## 8. Duplicate-Payment Protection

The UI must:

- Disable repeated purchase actions while initiation is active.
- Persist a safe local reference to an in-progress attempt.
- Re-check the backend before allowing a new attempt.
- Handle network retries without creating a new financial operation.
- Recover after app restart where practical.
- Clearly explain why a second payment should not be attempted.

These are usability safeguards only; backend idempotency remains mandatory.

## 9. Subscription Status and Entitlements

The subscription screen may show:

- Current plan
- Subscription state
- Start date and next billing date
- Renewal state
- Cancellation-effective date
- Grace-period or payment-action information
- Entitlements and usage limits
- Permitted upgrade, downgrade, or renewal controls
- Support entry points

Possible states may include pending, active, trialing, past due, in grace period, cancelled, expired, suspended, or payment action required. Render only API-defined states.

Entitlements must come from the centralized entitlement engine. The app may display remaining usage only when supplied by the backend. It must not reproduce entitlement formulas, derive limits from plan metadata, or treat hidden UI controls as authorization.

Refresh entitlements after confirmed purchases, renewals, cancellations, refunds, or relevant account-state changes.

## 10. Cancellation and Renewal Management

Where supported:

1. Display the current server-confirmed subscription state.
2. Explain the effect and effective date.
3. Require the approved confirmation step.
4. Submit through the shared API.
5. Display the server-confirmed result.
6. Refresh subscription and entitlement data.
7. Explain continued access only when the backend supplies that policy/state.
8. Prevent duplicate requests.

Do not promise refunds, immediate access removal, or continued access without an authoritative backend result.

## 11. Refunds and Disputes

The app may display backend-confirmed states such as refund requested, processing, completed, rejected, partial refund, or support-required.

Refund decisions and execution belong to authorized backend/operations workflows. The app must not promise a refund before approval, invent timelines, or expose internal reconciliation details.

## 12. Payment History and Documents

Payment history should support server-side pagination and display only approved fields, such as:

- Date
- Transaction type
- Plan or product context
- Display amount and currency
- Status
- Public transaction reference
- Receipt/invoice availability
- Refund status, where relevant

Invoices and receipts must be retrieved through authorized backend endpoints using protected, short-lived or otherwise approved access mechanisms. The app must not generate tax invoices locally or expose sensitive document URLs in logs, analytics, or navigation parameters.

## 13. Notifications and Deep Links

Payment-related notifications may open payment-pending, purchase-confirmation, failed-payment recovery, renewal, grace-period, cancellation, refund, or invoice screens.

Deep links must:

- Require authentication for private resources.
- Resolve resources using safe public identifiers.
- Refresh backend state before showing sensitive details.
- Handle expired or invalid links safely.
- Avoid putting private amounts, phone numbers, or transaction data in URLs.

A notification is not a substitute for fetching authoritative transaction state.

## 14. Error Handling

Use shared error conventions and stable machine-readable codes. Handle:

- Plan unavailable
- Account ineligible
- Purchase already in progress
- Duplicate request
- Session expired
- Provider cancellation
- Payment failure
- Unknown payment status
- Subscription activation pending
- Entitlement refresh failure
- Invoice unavailable
- Refund unavailable
- Rate limit
- Temporary service outage

Never expose raw provider, database, or infrastructure errors. Preserve safe attempt references and provide retry or support guidance.

## 15. Security and Privacy

The app must:

- Keep provider secrets exclusively on the server.
- Avoid logging card, UPI, bank, or sensitive provider data.
- Avoid unnecessary local storage of payment information.
- Clear private payment data on logout and account switching.
- Protect invoice and receipt access.
- Avoid exposing sensitive identifiers in URLs, analytics, or crash reports.
- Handle session expiry during status polling.
- Use approved provider UI/SDK mechanisms rather than building insecure payment-data forms.
- Never embed backend or provider secrets in the mobile bundle.

## 16. Analytics and Observability

Use only approved analytics events, for example:

- Plan list viewed
- Plan details viewed
- Purchase flow started
- Provider flow opened
- Payment flow cancelled
- Payment result viewed
- Subscription screen viewed
- Invoice opened
- Refund status viewed
- Payment support flow started

Do not send credentials, full payment payloads, invoice contents, sensitive provider responses, or unnecessary financial data. Client events are not financial truth; authoritative metrics must come from backend transaction and reconciliation records.

## 17. Testing Requirements

### Unit and component tests

Cover:

- Plan and currency formatting
- Billing-interval display
- Payment and subscription state rendering
- Entitlement-state rendering
- Duplicate-action prevention
- Pending-payment messaging
- Error-code mapping
- Confirmation dialogs
- Cache invalidation
- Accessibility labels

### Integration tests

Cover:

- Plan retrieval
- Purchase-session creation
- Provider cancellation
- Provider return followed by backend verification
- Payment failure and unknown status
- App restart during payment
- Duplicate initiation prevention
- Subscription and entitlement refresh
- Cancellation request
- Payment-history pagination
- Invoice authorization
- Refund-status retrieval
- Session expiry during polling

### End-to-end tests

At minimum verify that:

1. Users can view backend-provided plans.
2. Prices, benefits, limits, and billing intervals are not hardcoded.
3. Purchase sessions originate from the backend.
4. Provider success does not bypass backend verification.
5. Pending payments are not treated as successful.
6. Repeated taps do not create duplicate attempts.
7. Confirmed activation refreshes entitlements.
8. Failed payments provide safe recovery options.
9. Cancellation reflects the server-confirmed state.
10. Payment history is scoped to the authenticated user.
11. Invoice access is protected.
12. Logout clears private financial data.
13. Account switching cannot expose another user’s financial information.

## 18. Definition of Done

- Plans and prices come from approved APIs.
- Purchase sessions/orders are created by the backend.
- Provider callbacks are followed by backend verification.
- Duplicate-payment protections exist at the UI level and rely on backend idempotency.
- Pending, failed, cancelled, successful, and uncertain states are handled clearly.
- Subscription status and entitlements are server-confirmed.
- Cancellation and refund flows do not make unsupported promises.
- Payment history and documents are securely scoped.
- Payment deep links are safe.
- Sensitive payment data is not logged or unnecessarily stored.
- Critical payment and subscription journeys have automated tests.
- No financial, tax, refund, reconciliation, or entitlement logic is duplicated in the User App.

## 19. AI IDE Instructions

1. Read the Shared Core Backend payment, subscription, entitlement, identity, authorization, notification, security, and observability contracts first.
2. Inspect the existing API client, secure storage, cache layer, navigation, deep-link handling, and design-system utilities.
3. Confirm exact plan, payment, subscription, entitlement, invoice, and refund schemas before coding.
4. Reuse centralized API, validation, error, analytics, and authentication utilities.
5. Do not hardcode prices, taxes, limits, provider identifiers, or legal/payment wording.
6. Treat backend-confirmed state as the only source of financial truth.
7. Implement safe recovery for interrupted and pending payments.
8. Add tests for duplicate attempts, app restarts, unknown states, account switching, and invoice authorization.
9. Keep private financial data out of logs, analytics, navigation parameters, and crash reports.
10. Do not implement administrative payment operations or webhook verification in the User App.
11. Record unresolved payment, tax, policy, or API questions as explicit blockers.
12. Keep the app runnable after each logical implementation unit.

## 20. Acceptance Criteria

1. Users can view backend-provided plans and benefits.
2. Prices, currencies, limits, and billing intervals are not hardcoded.
3. Purchase sessions originate from the backend.
4. Provider callbacks do not independently confirm financial success.
5. Pending payments do not encourage unsafe duplicate payments.
6. Duplicate initiation is prevented in the UI and supported by backend idempotency.
7. Subscription activation refreshes entitlements from server-confirmed state.
8. Cancellation and renewal controls reflect backend policy and status.
9. Refund information is displayed only after backend confirmation.
10. Payment history is paginated and scoped to the authenticated user.
11. Invoice/receipt access is protected and uses approved mechanisms.
12. Payment deep links do not expose private financial data.
13. Sensitive payment information is not logged or unnecessarily stored.
14. Critical payment and subscription journeys have automated coverage.
15. Shared payment, subscription, entitlement, authorization, validation, and observability contracts are reused.
16. No duplicate financial or entitlement logic exists in the User App.
