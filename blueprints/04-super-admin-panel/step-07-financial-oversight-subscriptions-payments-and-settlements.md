# Super Admin Panel Blueprint — Step 7: Financial Oversight, Subscriptions, Payments, and Settlements

**Project:** Zero Brokerage — Real Estate & Commercial Asset Network  
**Interface:** Super Admin Panel / VortexCubes Command Center  
**Document path:** `blueprints/04-super-admin-panel/step-07-financial-oversight-subscriptions-payments-and-settlements.md`  
**Status:** Implementation blueprint  
**Primary audience:** Super Admin developer, Shared Core Backend team, QA, security reviewer, technical lead, and release owner

---

## 1. Purpose

This document defines the implementation contract for the Super Admin Panel's financial-operations interface. It covers the administrative presentation and controlled operation of:

- Platform subscriptions and plans.
- User and agency subscription activity.
- Micro-passes and other approved micro-transactions.
- Payment orders, payment attempts, refunds, and payment failures.
- Platform commission and settlement visibility.
- Broker/agency payout workflows where enabled by the backend.
- Sponsored listing and boost revenue visibility where enabled.
- Financial reconciliation, exceptions, and operational reporting.

The Super Admin Panel is an administrative client of the Shared Core Backend. It must not independently calculate authoritative financial outcomes, verify payment signatures, mutate payment state, grant entitlements, calculate commissions, or execute settlements.

The backend remains responsible for financial correctness. The Super Admin frontend provides permission-aware views, review workflows, confirmation experiences, and operational controls over backend-supported actions.

This step does not create a new payment or subscription engine. It specifies how the Super Admin interface consumes and operates the already-defined shared financial contracts.

---

## 2. Mandatory Source and Dependency Review

Before implementing this step, the AI IDE and developer must read and reconcile:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. User App Blueprint Steps 1–12.
6. Super Admin Blueprint Steps 1–6.
7. Repository documentation under `docs/`, especially:
   - payment and subscription contracts;
   - entitlement rules;
   - API conventions and error format;
   - authorization and high-risk-action rules;
   - audit and event contracts;
   - observability and configuration conventions;
   - database and financial-integrity documentation.
8. Existing `apps/super-admin` code and shared packages.
9. The currently implemented backend routes and schemas for plans, subscriptions, payments, refunds, invoices, commissions, settlements, boosts, and financial reports.

### 2.1 Decision precedence

Use this order of authority:

1. Explicitly finalized critical Zero Brokerage decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Shared Core Backend financial contracts.
5. Earlier Super Admin blueprint steps.
6. Repository documentation and approved API contracts.
7. Routine implementation decisions approved by the technical lead.

If a financial field, status, transition, permission, or action is not supported by an authoritative contract, do not invent it in the UI. Record the missing contract as a blocker or decision item.

### 2.2 Architectural reconciliation

The SOW describes a broader microservices-oriented target architecture. The finalized implementation baseline is a **modular monolith with one deployable Fastify API**. The Super Admin Panel must therefore:

- consume the modular monolith's approved financial APIs;
- reuse shared authentication, authorization, validation, error, pagination, and audit contracts;
- never connect directly to PostgreSQL, Redis, payment-provider APIs, or settlement tables;
- never introduce a second financial backend or a parallel ledger;
- never treat frontend calculations as authoritative financial values.

---

## 3. Scope and Product Boundaries

### 3.1 In scope

The Super Admin Panel may provide the following capabilities when the corresponding backend contracts and permissions exist:

- View active, draft, archived, and deprecated subscription plans.
- View plan pricing, billing interval, feature limits, and entitlement summaries.
- Review subscription lifecycle state across users, brokers, and agencies.
- Inspect subscription starts, renewals, cancellations, pauses, expirations, grace periods, and failures.
- Inspect payment orders, payment attempts, provider references, and normalized payment states.
- Review refund requests and backend-supported refund decisions.
- View commission calculations and financial ledger entries.
- Review settlement batches, payout states, exceptions, and reconciliation results.
- View sponsored listing, boost, and advertising-related financial records where enabled.
- View financial summaries and bounded reporting periods.
- Export approved financial reports through backend-generated exports.
- Retry or reconcile supported failed operations through explicit backend actions.
- Review financial audit history and action outcomes.
- Display pending, processing, succeeded, failed, reversed, refunded, and disputed states according to the backend contract.

### 3.2 Out of scope

Do not implement any of the following unless separately approved and contractually defined:

- Direct payment-provider dashboard integration from the browser.
- Client-side payment verification or webhook processing.
- Manual database edits.
- Arbitrary balance adjustments.
- Untracked wallet or credit systems.
- Unapproved discounts, coupons, or pricing rules.
- Automatic payout execution from frontend code.
- Unapproved tax or GST calculations.
- Financial advice or accounting conclusions.
- A second ledger, settlement engine, entitlement engine, or reconciliation service.
- Display of complete payment credentials, card data, bank account data, or provider secrets.

The exact tax treatment and any unresolved professional accounting or GST decisions must remain explicit decision items. The frontend must display backend-provided tax and total fields rather than deriving them independently.

---

## 4. Financial Authority Model

The UI must clearly distinguish between **displaying a financial fact** and **requesting a financial operation**.

### 4.1 Backend-authoritative values

The backend is authoritative for:

- Plan identity and version.
- Price, currency, billing interval, and applicable taxes.
- Subscription status and period dates.
- Payment status and provider reconciliation state.
- Entitlement activation, expiry, grace, and revocation.
- Refund eligibility and refund outcome.
- Commission rates and calculated amounts.
- Settlement eligibility and payable amount.
- Payout state and provider reference.
- Reconciliation results and exception classification.
- Financial report totals.

The frontend may format these values for display but must not replace them with locally calculated values.

### 4.2 Read and action separation

Every financial screen must distinguish:

- Read-only data.
- Actions that request a backend workflow.
- Actions that require confirmation.
- Actions that require step-up authentication.
- Actions that are unavailable because of permissions, state, or unresolved prerequisites.
- Actions that have been requested but are still processing asynchronously.

A successful button click must not be represented as a completed financial outcome until the backend confirms the result.

---

## 5. Financial Navigation and Information Architecture

Add the financial area to the authenticated Super Admin shell using the capability map from Steps 1–3. Suggested navigation grouping:

```text
Financial Operations
├── Overview
├── Plans & Pricing
├── Subscriptions
├── Payments
├── Refunds
├── Commissions
├── Settlements & Payouts
├── Boosts & Sponsored Revenue
├── Reconciliation
└── Financial Reports
```

The final labels must come from the approved product language and existing application conventions.

Navigation visibility must be based on backend-provided effective permissions. A local role label must never be sufficient to expose financial controls.

### 5.1 Route protection

Every financial route must:

- require an authenticated admin session;
- verify the current capability and resource scope;
- revalidate access on initial load and sensitive actions;
- handle expired sessions and revoked permissions;
- avoid exposing financial identifiers or query details unnecessarily in URLs;
- safely handle deep links to deleted, archived, or inaccessible records.

### 5.2 Suggested routes

Use the existing route convention. If no convention exists, document the selected convention before implementation. A possible structure is:

```text
/admin/financial
/admin/financial/overview
/admin/financial/plans
/admin/financial/subscriptions
/admin/financial/payments
/admin/financial/refunds
/admin/financial/commissions
/admin/financial/settlements
/admin/financial/boosts
/admin/financial/reconciliation
/admin/financial/reports
```

These are illustrative route groupings, not permission to invent undocumented backend endpoints.

---

## 6. Financial Overview Dashboard

Build a bounded, permission-aware financial overview rather than an uncontrolled analytics wall.

### 6.1 Approved summary cards

Display only metrics supplied by an approved reporting endpoint, such as:

- Gross payment volume for the selected period.
- Net collected amount where defined.
- Subscription revenue.
- Micro-transaction revenue.
- Commission amount recorded.
- Amount awaiting settlement.
- Completed settlement amount.
- Refund amount.
- Failed payment count or amount.
- Reconciliation exception count.
- Active subscriptions and subscriptions in grace or payment-failure states.

The exact metric definitions must be documented beside the API contract. Do not label a metric as revenue, profit, earnings, or net income unless the backend and product/accounting definitions explicitly support that label.

### 6.2 Time and filter controls

Support only backend-supported filters, such as:

- Reporting period.
- Currency.
- Product or revenue category.
- Subscription plan.
- User versus agency segment.
- Payment provider, if exposed safely.
- Payment or settlement status.
- Geography or organization scope, if authorized.

Filters must be validated through allowlists. Do not accept arbitrary field names or sort expressions from the client.

### 6.3 Dashboard behavior

Support:

- Initial loading.
- Partial card loading.
- Empty period state.
- No-data state.
- Stale data indicator where provided.
- Permission-limited metric state.
- Rate limiting.
- Backend degradation.
- Retry behavior.
- Last-updated timestamp when provided by the backend.

Financial dashboards must not imply real-time accuracy unless the endpoint explicitly guarantees the freshness level.

---

## 7. Plans and Pricing Interface

The Plans & Pricing area provides controlled administration of backend-supported plan records.

### 7.1 Plan list

Display backend-provided fields such as:

- Plan identifier or safe display code.
- Plan name.
- Audience or segment.
- Product category.
- Billing interval.
- Currency.
- Price and tax presentation, if supplied.
- Entitlement summary.
- Active, draft, archived, or deprecated state.
- Effective date or version.
- Subscriber count, only when provided as an authorized aggregate.
- Last updated timestamp.

Do not merge plan identity, pricing version, and entitlement version into one ambiguous badge.

### 7.2 Plan detail

The detail view should separate:

- Commercial configuration.
- Entitlement summary.
- Eligibility rules.
- Billing behavior.
- Historical versions.
- Current usage or subscriber aggregates.
- Audit history.
- Dependency warnings.

Sensitive internal implementation details must not be exposed unless explicitly authorized.

### 7.3 Plan mutation safeguards

If plan creation, editing, activation, archival, or deprecation is supported:

- Use backend-defined forms and validation rules.
- Show a review summary before submission.
- Display affected audience and entitlement implications.
- Require explicit confirmation for changes that affect active or future subscribers.
- Require step-up authentication for high-risk changes where mandated.
- Display asynchronous processing states.
- Never promise retroactive changes unless the backend confirms the behavior.
- Preserve an audit trail containing actor, timestamp, target, action, result, and reason where required.

Do not allow the frontend to directly alter existing subscription entitlements by changing a plan display object.

### 7.4 Pricing and tax limitations

Pricing values must be displayed exactly as returned by the backend, with currency and billing interval visible. The UI must not independently compute GST, discounts, prorations, or net settlement values unless the shared contract explicitly defines a presentation-only calculation.

---

## 8. Subscription Management Interface

### 8.1 Subscription directory

Provide server-side filtering, pagination, sorting, and search for subscriptions. Supported filters may include:

- Subscription status.
- Plan.
- Customer type.
- Customer or organization identifier.
- Billing interval.
- Start and renewal period.
- Grace-period state.
- Cancellation state.
- Payment-failure state.
- Entitlement state.
- Date range.

Do not download all subscriptions to filter locally.

### 8.2 Subscription detail

Display a clear timeline and state model, including when available:

- Subscription identifier.
- Customer reference.
- Plan and plan version.
- Current status.
- Start date.
- Current billing period.
- Next billing or renewal date.
- Cancellation request and effective date.
- Grace-period dates.
- Payment failure references.
- Entitlement summary.
- Related payment records.
- Related refunds.
- Related audit events.

The UI must distinguish subscription status from payment status and entitlement status. These are separate backend concepts.

### 8.3 Supported administrative actions

Only expose actions explicitly supported by the backend, such as:

- Request cancellation.
- Request resumption where eligible.
- Review or resolve a payment-failure workflow.
- Request a backend-supported entitlement correction.
- Open related payment or audit records.
- Add an administrative note through the approved audit/support workflow.

Do not provide an arbitrary “activate subscription” or “grant premium” button. Any exceptional correction must use a governed backend workflow with reason capture, authorization, idempotency, and auditability.

### 8.4 Subscription state presentation

Use backend-provided states and labels. At minimum, design for:

- Pending.
- Active.
- Trial, if supported.
- Past due.
- Grace period.
- Paused, if supported.
- Cancellation scheduled.
- Cancelled.
- Expired.
- Failed.
- Suspended or revoked, if supported.

Unknown future states must fall back safely and be surfaced for contract review rather than silently mapped to an incorrect state.

---

## 9. Payments and Payment Attempts

### 9.1 Payment directory

Build a paginated payment directory with backend-supported filters for:

- Payment state.
- Payment method category, where safe.
- Provider.
- Product or purpose.
- Customer reference.
- Order reference.
- Subscription reference.
- Date range.
- Amount range, if supported.
- Reconciliation state.
- Refund state.

Never display complete card numbers, CVV, authentication secrets, bank credentials, or provider secrets.

### 9.2 Payment detail

Display safe, normalized payment information:

- Internal payment reference.
- Related order or invoice reference.
- Customer reference.
- Purpose or product category.
- Amount and currency.
- Tax and total fields returned by the backend.
- Provider name.
- Safe provider reference.
- Payment status.
- Attempt timeline.
- Failure code and safe explanation.
- Webhook or reconciliation status where authorized.
- Related subscription, entitlement, refund, commission, or settlement references.
- Audit history.

Provider-specific raw payloads must not be shown by default. If diagnostic payload access is approved, it must be separately permissioned, redacted, access-logged, and protected against accidental exposure.

### 9.3 Payment states

The UI must represent backend-defined states such as:

- Created.
- Pending.
- Processing.
- Authorized.
- Captured or succeeded.
- Failed.
- Cancelled.
- Expired.
- Reversed.
- Disputed, if supported.
- Refunded or partially refunded.

Do not collapse all non-success states into “failed.”

### 9.4 Payment retry and reconciliation actions

If supported by the backend, an administrator may request:

- Reconciliation of a payment reference.
- Retry of a safe, idempotent provider synchronization operation.
- Review of a payment failure.
- Opening a provider reference through a safe external link, if explicitly approved.

The UI must show that these are requests. It must display processing, accepted, rejected, and completed outcomes separately.

---

## 10. Refund Management

### 10.1 Refund list and detail

Provide a controlled refund review interface showing:

- Refund reference.
- Related payment and order references.
- Customer reference.
- Requested amount and currency.
- Approved amount, if different and backend-defined.
- Reason category.
- Current refund status.
- Requester and reviewer references where permitted.
- Creation and processing timestamps.
- Provider refund reference.
- Failure or rejection explanation.
- Related audit records.

### 10.2 Refund actions

Expose only backend-authorized actions, for example:

- Review a refund request.
- Approve or reject a pending refund where the policy permits.
- Request processing of an approved refund.
- Retry a failed idempotent provider synchronization.
- Add a reason or administrative note through the approved workflow.

Every approval, rejection, amount change, or retry must:

- require the correct capability;
- validate current state on the server;
- require a reason where policy requires it;
- use idempotency protection;
- show a confirmation summary;
- be recorded in the audit system;
- handle concurrent changes safely.

Do not allow a refund to be approved from a stale detail screen without the backend rechecking eligibility and current state.

### 10.3 Refund safety UX

Before a high-risk refund action, show:

- The exact payment and refund target.
- Amount and currency.
- Expected effect.
- Irreversibility or reversal limitations.
- Required reason.
- Current status.
- Any warnings returned by the backend.

Use explicit confirmation rather than a one-click destructive action.

---

## 11. Commission Ledger and Financial Records

### 11.1 Ledger principles

The Super Admin Panel must treat the backend ledger as the source of truth. It must not construct a second ledger from payment records in the browser.

The ledger interface should distinguish, where supported:

- Gross transaction amount.
- Commission rate.
- Commission amount.
- Platform share.
- Broker or agency share.
- Adjustments.
- Refund or reversal impact.
- Settlement eligibility.
- Settlement status.
- Currency.
- Related property, transaction, agreement, broker, or agency references.
- Record creation and effective timestamps.

### 11.2 Commission policy presentation

The UI must reflect the finalized commission policy supplied by the backend, including the distinction between:

- Standard properties subject to the approved platform success-fee policy.
- Luxury assets handled through the approved internal concierge model and its separate financial treatment.

Do not hardcode commission percentages in frontend components. Rates, exceptions, and policy versions must come from backend contracts.

### 11.3 Ledger detail and traceability

A ledger detail view should provide safe links to related authoritative records:

- Transaction or agreement.
- Listing.
- Broker or agency.
- Payment.
- Refund or reversal.
- Settlement batch.
- Audit events.

Links must revalidate permissions and must not reveal private ownership, identity, or financial data beyond the current administrator's scope.

### 11.4 Ledger correction restrictions

Do not provide arbitrary edit or delete controls. If the backend supports a correction workflow, expose it as a governed adjustment request with:

- explicit reason;
- source record;
- target amount or adjustment type;
- permission and step-up checks;
- idempotency;
- approval requirements;
- audit trail;
- immutable historical traceability.

---

## 12. Settlements and Payouts

### 12.1 Settlement overview

Provide backend-backed views for:

- Pending settlement amount.
- Eligible settlement amount.
- Processing batches.
- Completed settlements.
- Failed settlements.
- Held or blocked settlements.
- Reconciliation exceptions.
- Settlement aging, where defined.

Do not present a payable amount unless it is explicitly supplied by the settlement service.

### 12.2 Settlement directory

Support server-side filters for:

- Settlement status.
- Broker or agency.
- Batch reference.
- Date range.
- Payment provider or payout channel, if exposed safely.
- Exception state.
- Currency.

### 12.3 Settlement detail

Display:

- Settlement and batch references.
- Beneficiary type and safe beneficiary reference.
- Amount and currency.
- Included ledger entries.
- Deductions or adjustments supplied by the backend.
- Current status.
- Processing timeline.
- Failure or hold reason.
- Payout provider reference.
- Reconciliation state.
- Related audit events.

Do not expose complete bank account numbers or other sensitive payout credentials.

### 12.4 Payout actions

If supported, actions may include:

- Review a held settlement.
- Request a retry of an idempotent failed payout operation.
- Mark an operational review outcome through a governed workflow.
- Request reconciliation.
- Open the related beneficiary or compliance record.

Do not allow the frontend to execute a payout by calling a provider directly. A payout request must be created and processed by the backend with state transitions, idempotency, permissions, and audit logging.

### 12.5 Concurrency and stale data

Before any settlement action:

- refetch or validate the current settlement state;
- verify that the batch has not already progressed;
- prevent duplicate submissions;
- display conflicts when another operator has acted;
- invalidate affected queries after completion;
- preserve a visible operation reference for asynchronous processing.

---

## 13. Boosts, Sponsored Listings, and Advertising Revenue

The BRD/SOW mention sponsored listings, boost credits, and advertising-related monetization. This interface may display or manage them only where the shared backend has finalized contracts.

### 13.1 Required distinctions

Separate:

- Sponsored listing configuration.
- Boost entitlement or credit consumption.
- Payment for a boost or campaign.
- Listing publication and ranking eligibility.
- Revenue recognition or financial record.
- Refund or cancellation state.

Do not imply that a payment automatically makes a listing eligible for publication or ranking priority. Listing eligibility and sponsored placement remain governed by the listing, moderation, search, and monetization rules.

### 13.2 Revenue views

Where supported, show:

- Boost or sponsored product.
- Buyer or account reference.
- Listing or campaign reference.
- Amount and currency.
- Payment state.
- Credit allocation and consumption state.
- Active period.
- Refund or cancellation status.
- Related financial record.

Sponsored revenue must not be mixed into subscription revenue without a backend-defined category and metric definition.

---

## 14. Reconciliation and Exception Management

### 14.1 Reconciliation dashboard

Provide an operational view of backend-generated reconciliation results, including:

- Last successful reconciliation time.
- Current run status.
- Records checked, where safely exposed.
- Matched records.
- Unmatched records.
- Duplicate or conflicting records.
- Failed checks.
- Open exceptions.
- Retryable versus non-retryable classifications.

The UI must not perform reconciliation by comparing independently fetched lists in the browser.

### 14.2 Exception directory

Support server-side filtering by:

- Exception category.
- Severity.
- Financial domain.
- Status.
- Date detected.
- Related payment, ledger, subscription, refund, or settlement reference.
- Assigned operator, if supported.

### 14.3 Exception detail

Display:

- Safe exception identifier.
- Category and severity.
- Affected record references.
- Backend-provided explanation.
- Detection timestamp.
- Current status.
- Retry eligibility.
- Recommended next action, only if supplied by the backend.
- Previous attempts.
- Audit history.

Do not expose stack traces, secrets, raw provider credentials, or unredacted internal payloads.

### 14.4 Retry and resolution behavior

If a retry or resolution action is supported:

- use the backend's explicit action contract;
- confirm that the exception is still actionable;
- prevent duplicate retries;
- show processing state;
- show the operation reference;
- update the detail view after completion;
- preserve the original exception history;
- record the administrator's action and reason.

---

## 15. Financial Reports and Exports

### 15.1 Report catalogue

Use backend-defined report types. Possible categories include:

- Subscription activity.
- Payment collection.
- Refunds.
- Commission ledger.
- Settlement status.
- Boost or sponsored revenue.
- Reconciliation exceptions.
- Revenue trends.

Do not label a report as an accounting statement, tax filing, or audited financial statement unless the product and accounting contracts explicitly support that designation.

### 15.2 Report filters

All report parameters must use validated allowlists and backend-supported ranges. Apply bounded date windows and prevent unbounded exports that could overload the platform.

### 15.3 Export workflow

Exports should follow an asynchronous workflow when appropriate:

1. Administrator selects an approved report type and filters.
2. Frontend displays a review summary.
3. Backend validates permissions, scope, and export limits.
4. Frontend submits the export request with an idempotency key when required.
5. UI shows queued or processing state.
6. Backend generates the file.
7. UI displays completion, expiry, failure, or cancellation state.
8. Download uses a short-lived, permission-checked URL or approved file mechanism.
9. The export access and generation action are audited where required.

Do not generate large financial exports entirely in the browser from paginated screen data.

---

## 16. API Integration Contract

Before implementing each screen, confirm the actual API contract for:

- Method and endpoint.
- Request and response schema.
- Authentication requirement.
- Capability and scope requirement.
- Pagination and sorting.
- Filter allowlist.
- Monetary representation and currency handling.
- Date/time format.
- Status enum.
- Idempotency requirement.
- Async operation model.
- Error codes.
- Retry semantics.
- Audit behavior.
- Versioning expectations.

Use the centralized API client and query/cache layer. Do not make raw `fetch` or Axios calls inside individual components if a shared client exists.

### 16.1 Monetary display rules

- Treat monetary amounts as exact backend-provided values.
- Preserve currency alongside every amount.
- Do not use floating-point arithmetic for authoritative totals.
- Use the shared money formatter.
- Distinguish amount, tax, discount, fee, refund, commission, and net fields.
- Never infer a missing amount from another field.
- Handle zero, negative adjustment, null, pending, and unavailable values explicitly.

### 16.2 Cache invalidation

After a successful mutation or confirmed asynchronous completion, invalidate or refresh affected queries, including as applicable:

- financial overview cards;
- plan detail;
- subscription detail;
- payment detail;
- refund detail;
- ledger detail;
- settlement batch;
- reconciliation exception;
- report job status;
- audit history.

Do not optimistically display a completed payment, refund, payout, or entitlement change unless the contract explicitly supports that optimistic behavior.

---

## 17. Permissions and High-Risk Actions

Financial capabilities should be granular. Possible capability categories include:

- View financial overview.
- View plan configuration.
- Manage plans.
- View subscriptions.
- Manage subscription workflows.
- View payments.
- View sensitive payment diagnostics.
- Review refunds.
- Approve refunds.
- View commissions.
- Request ledger adjustments.
- View settlements.
- Request payout retries.
- Run reconciliation.
- Resolve reconciliation exceptions.
- Generate financial reports.
- Export financial data.

These names are illustrative. Use the actual shared authorization vocabulary.

### 17.1 High-risk action requirements

For actions such as refund approval, plan activation, ledger adjustment, payout retry, or financial export:

- verify capability server-side;
- display the target and exact effect;
- require explicit confirmation;
- collect a reason when required;
- require step-up authentication when mandated;
- use idempotency protection;
- show pending state;
- handle duplicate and conflict responses;
- record audit details;
- never hide a failed operation behind a generic success toast.

### 17.2 Dual-control workflows

If the backend supports maker-checker or dual approval, the UI must represent:

- pending approval;
- submitted by;
- reviewed by;
- approval or rejection reason;
- separation-of-duty restrictions;
- current approval stage;
- final outcome.

The frontend must not simulate dual control through two local confirmation dialogs.

---

## 18. Privacy and Security Requirements

The financial interface must:

- use HTTPS outside local development;
- avoid logging complete payment, payout, or personal financial payloads;
- redact sensitive identifiers in logs and error displays;
- never expose provider secrets or payment credentials;
- use short-lived, permission-checked download URLs;
- prevent unauthorized export access;
- avoid placing sensitive financial data in URLs or browser storage;
- apply least-privilege access to financial diagnostics;
- enforce server-side authorization on every action;
- handle session expiry during a high-risk workflow safely;
- prevent clickjacking and unsafe external navigation according to the application security baseline;
- preserve auditability for privileged financial actions.

Any displayed customer contact or beneficiary information must be minimized, masked, or loaded only through an explicit permission-checked operation.

---

## 19. Error, Loading, and Conflict UX

Every financial screen must support:

- initial loading;
- paginated loading;
- empty result set;
- no-result-for-filter state;
- malformed filter state;
- permission denied;
- expired session;
- network failure;
- rate-limited response;
- backend degradation;
- stale data;
- record no longer found;
- state transition conflict;
- duplicate submission prevention;
- asynchronous operation pending;
- operation success;
- operation failure;
- partial data availability.

Use the shared error format and error mapper. Do not expose SQL errors, provider secrets, stack traces, internal implementation details, or unredacted webhook payloads.

For financial failures, show:

- what was attempted;
- whether the request was accepted, rejected, or unknown;
- whether the user should retry;
- the operation/reference identifier when safe;
- the next permitted action.

Do not instruct an operator to retry a payment or payout blindly when the outcome is unknown.

---

## 20. Suggested Frontend Structure

Follow the existing Super Admin architecture and naming conventions. A possible feature structure is:

```text
apps/super-admin/src/
├── app/
│   └── financial/
├── features/
│   └── financial/
│       ├── overview/
│       ├── plans/
│       ├── subscriptions/
│       ├── payments/
│       ├── refunds/
│       ├── commissions/
│       ├── settlements/
│       ├── boosts/
│       ├── reconciliation/
│       └── reports/
├── components/
│   ├── financial-status-badge/
│   ├── money-display/
│   ├── financial-filter-bar/
│   ├── confirmation-dialog/
│   ├── async-operation-status/
│   └── export-status/
└── lib/
    ├── api/
    ├── permissions/
    ├── query-keys/
    ├── formatters/
    └── errors/
```

This is a logical boundary, not permission to duplicate shared components or create parallel API clients.

### 20.1 State separation

Separate:

- **Server state:** plans, subscriptions, payments, refunds, ledger records, settlements, reconciliation results, report jobs.
- **Local UI state:** open dialogs, selected rows, confirmation text, active tabs, expanded timelines.
- **Form state:** draft filters and mutation inputs.
- **Session state:** current administrator and session status.
- **Permission state:** backend-provided effective capabilities.

Do not store authoritative financial records in global client state unnecessarily.

---

## 21. Testing Requirements

### 21.1 Unit tests

Test:

- monetary formatting;
- currency display;
- status mapping and unknown-state fallback;
- filter serialization;
- query-key generation;
- permission-based action visibility;
- confirmation summaries;
- masking and redaction helpers;
- report parameter validation;
- retryability presentation;
- asynchronous operation-state mapping.

### 21.2 Integration tests

Test:

- financial API client integration;
- pagination and filter behavior;
- plan detail loading;
- subscription timeline rendering;
- payment detail and failure display;
- refund approval/rejection flow;
- ledger and settlement navigation;
- reconciliation exception review;
- export-job polling or subscription;
- cache invalidation after mutations;
- session expiry during a financial action;
- permission changes during navigation.

### 21.3 Security tests

Test:

- unauthorized financial route access;
- direct navigation to restricted records;
- capability bypass attempts;
- export URL misuse;
- sensitive data leakage in logs or UI;
- raw provider payload exposure;
- duplicate refund or payout submissions;
- stale-state action attempts;
- CSRF and unsafe external-link protections where applicable;
- query and export parameter injection;
- access to another organization's financial records;
- privilege escalation through manipulated client state.

### 21.4 End-to-end tests

At minimum, cover:

1. Authorized administrator views financial overview.
2. Administrator filters and opens a subscription.
3. Administrator opens a payment and traces related records.
4. Authorized operator reviews a refund and receives a backend-confirmed result.
5. Unauthorized operator cannot access restricted financial actions.
6. A failed payment is displayed without being incorrectly marked successful.
7. A stale refund or settlement action is rejected safely.
8. A reconciliation exception can be reviewed and retried only when eligible.
9. A report export follows queued, processing, completed, and failed states.
10. Sensitive financial data remains masked or inaccessible according to policy.

Use test fixtures and provider mocks. Never use real production payment credentials or real customer financial data in automated tests.

---

## 22. Acceptance Criteria

This step is complete only when:

1. Financial navigation is permission-aware and integrated into the existing Super Admin shell.
2. Financial overview metrics come from approved backend reporting contracts.
3. Plans and pricing are displayed using backend-authoritative values and versions.
4. Subscription status, payment status, and entitlement status are presented as separate concepts.
5. Payments are paginated, filterable, and displayed without sensitive payment credentials.
6. Refund workflows use backend authorization, state validation, idempotency, confirmation, and auditability.
7. Commission records are consumed from the authoritative ledger and are not recalculated in the frontend.
8. Standard-property and luxury-property financial treatments are not incorrectly merged.
9. Settlement and payout states are displayed accurately and sensitive beneficiary data is protected.
10. Boost and sponsored revenue is separated from other revenue categories where enabled.
11. Reconciliation is represented as a backend workflow rather than a browser-side comparison.
12. Financial reports and exports use bounded, permission-checked, backend-generated workflows.
13. High-risk actions display exact targets, expected effects, required reasons, and processing states.
14. Duplicate submissions, stale records, conflicts, unknown outcomes, and asynchronous operations are handled safely.
15. Financial errors do not expose secrets, stack traces, raw provider payloads, or internal database details.
16. Unit, integration, security, and end-to-end tests cover critical financial workflows.
17. Shared API, authorization, validation, error, audit, observability, and formatting utilities are reused.
18. No second ledger, payment engine, entitlement engine, reconciliation engine, or direct provider integration is introduced in the Super Admin frontend.
19. Any unresolved tax, GST, payout, accounting, or financial-policy ambiguity is documented as a blocker or decision item.

---

## 23. Deliverables

The Super Admin developer must deliver:

- Financial navigation and route integration.
- Financial overview screens.
- Plans and pricing screens, if enabled.
- Subscription directory and detail views.
- Payment directory and detail views.
- Refund review workflow, if enabled.
- Commission ledger views.
- Settlement and payout views, if enabled.
- Boost and sponsored revenue views, if enabled.
- Reconciliation and exception views.
- Financial report and export workflow.
- Permission-aware action controls.
- High-risk confirmation and step-up integration.
- Loading, empty, error, conflict, and asynchronous states.
- Redaction and sensitive-data presentation safeguards.
- Unit, integration, security, and end-to-end tests.
- Updated API-contract and frontend documentation.
- A list of unresolved financial-policy or backend-contract blockers.

---

## 24. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Read the BRD, SOW, finalized financial decisions, Shared Core Steps 1–12, User App Steps 1–12, and Super Admin Steps 1–6 before modifying code.
2. Inspect the existing Super Admin shell, permission system, API client, query/cache layer, shared formatters, error mapper, and audit integration.
3. Inspect the actual backend contracts before creating pages, types, hooks, or forms.
4. Do not invent financial statuses, plan fields, endpoint names, or mutation capabilities.
5. Do not calculate authoritative totals, commissions, taxes, refunds, entitlements, or settlement amounts in the frontend.
6. Reuse the Shared Core financial contracts and centralized money/date/status formatting utilities.
7. Treat payment, refund, payout, plan, and ledger actions as high-risk until the backend contract proves otherwise.
8. Add confirmation, idempotency, reason capture, and step-up flows wherever required by the backend.
9. Never expose raw payment-provider payloads or sensitive beneficiary information by default.
10. Use server-side pagination, filtering, sorting, and bounded reporting windows.
11. Make asynchronous financial operations visible through explicit pending and final states.
12. Invalidate or refresh affected queries only after backend-confirmed outcomes.
13. Add security tests for authorization bypass, stale-state actions, duplicate submissions, export access, and sensitive-data leakage.
14. Do not introduce a second financial engine, ledger, reconciliation implementation, or direct payment-provider integration.
15. Document every missing or contradictory financial contract as a blocker instead of silently resolving it.
16. Do not mark this step complete until all acceptance criteria have been verified.

---

## 25. Dependency Boundary with Other Blueprint Steps

This step depends on:

- Shared Core identity and authorization contracts.
- Shared Core payment, subscription, entitlement, transaction, commission, settlement, audit, and observability contracts.
- Super Admin Steps 1–3 for shell, session, permissions, and high-risk actions.
- Super Admin Step 4 for user, broker, and agency references.
- Super Admin Step 5 for listing moderation and publication references.
- Super Admin Step 6 for visit, lead, transaction, and operational workflow references.

This step must not absorb the responsibilities of:

- the backend payment or subscription modules;
- the backend entitlement engine;
- the listing publication or ranking engine;
- the broker or agency operational applications;
- the User App checkout or subscription UX;
- the future Agency Portal's commercial workflows;
- the platform-wide audit, analytics, or operations modules beyond their financial-facing views.

The next Super Admin blueprint step should define the furniture marketplace, orders, rentals, supplier operations, and related administrative governance without duplicating the shared furniture domain logic.
