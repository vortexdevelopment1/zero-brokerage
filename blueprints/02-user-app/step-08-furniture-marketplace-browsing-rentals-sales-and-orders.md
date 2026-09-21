# User App Blueprint — Step 8: Furniture Marketplace, Rentals, Sales, and Orders

## 1. Purpose

Define the User App implementation contract for discovering office furniture, viewing furniture details, selecting rental or purchase options, managing a furniture cart or checkout intent, and tracking user-owned furniture orders or rental arrangements.

The furniture marketplace is a first-class domain within Zero Brokerage. The User App must consume shared backend contracts for furniture catalogues, inventory, pricing, rental terms, deposits, orders, payments, returns, damage claims, supplier settlement visibility, authorization, notifications, and auditability.

The app must not implement inventory reservation, pricing calculation, rental billing, deposit accounting, order state transitions, return approval, or damage-claim decisions locally.

## 2. Source and Decision Alignment

This step must be implemented consistently with:

- The approved BRD and SOW.
- The finalized modular-monolith backend architecture.
- Shared identity, authorization, listing, payment, subscription, notification, event, validation, and observability contracts.
- The finalized decision that the platform supports both furniture rentals and outright furniture sales.
- The finalized decision that furniture supports individual assets and packaged office setups.
- The finalized decision that rentals may include recurring monthly rent and refundable security deposits.
- The finalized decision that furniture may be combined with office-space offerings where the backend exposes an approved package.
- The finalized decision that returns, damage claims, and supplier settlements are backend-owned workflows.

Where the BRD/SOW and a finalized critical decision differ, follow the approved decision precedence documented in the Shared Core Backend Blueprint and record unresolved conflicts instead of silently choosing.

## 3. Objectives

The User App must allow eligible users to:

- Discover furniture and turnkey office setup offerings.
- Browse by category, use case, location, availability, and rental or sale mode.
- View detailed furniture information.
- Distinguish rental, sale, and package offerings.
- Review backend-provided pricing and rental terms.
- Review deposit, billing-frequency, delivery, and return information where available.
- Select permitted quantities or variants.
- Add eligible items or packages to a cart or checkout intent where supported.
- Review an order summary before submitting an order or payment intent.
- Track the status of their own furniture orders or rental arrangements.
- View approved payment, delivery, return, and damage-claim information.
- Initiate permitted cancellation, return, or support actions.
- Receive backend-confirmed updates through notifications and deep links.

## 4. Scope

### 4.1 Included

- Furniture marketplace entry points.
- Furniture category and collection browsing.
- Search and filtering for furniture.
- Furniture detail screens.
- Individual furniture assets.
- Packaged office setups.
- Rental-versus-sale selection where supported.
- Variant and quantity selection where supported.
- Availability display.
- Cart or checkout-intent experience where included in the API contract.
- Order/rental summary.
- User-owned furniture order history.
- Order and rental detail screens.
- Delivery, return, and claim status display.
- Permitted cancellation, return, and support actions.
- Loading, empty, unavailable, expired, and error states.
- Notifications and deep-link handling.
- Analytics and automated tests.

### 4.2 Excluded

Do not implement:

- Supplier or vendor dashboards.
- Supplier inventory management.
- Supplier settlement calculations.
- Direct inventory writes.
- Local stock reservation.
- Local rental-price or tax calculations.
- Direct payment-provider integration inside the mobile app unless explicitly required by the shared payment contract.
- Return approval or damage-claim adjudication.
- Administrative overrides.
- Direct database access.
- Unapproved marketplace messaging.

## 5. Furniture Domain Concepts

The UI must distinguish the following backend concepts when they are present:

- **Individual asset:** A single item such as an ergonomic chair, executive desk, conference table, server-room rack, reception couch, or cafeteria/pantry item.
- **Packaged setup:** A predefined bundle such as a 50-desk or 100-desk workstation setup, including approved components and commercial-office add-ons.
- **Rental offering:** An item or package available for a defined rental period, potentially with recurring monthly rent and a refundable security deposit.
- **Sale offering:** An item or package available for outright purchase.
- **Availability:** Backend-confirmed quantity, serviceability, or availability status.
- **Order:** A user-owned commercial record for a submitted purchase or rental request.
- **Rental arrangement:** The backend-defined rental lifecycle, including billing, active rental, return, and closure states.
- **Return:** A backend-controlled request or process for returning rented items.
- **Damage claim:** A backend-controlled record and resolution process; the user interface must not decide liability or final charges.

Do not merge these concepts into a single generic status or price field.

## 6. Marketplace Entry and Discovery

Furniture discovery may be available from:

- The main User App home screen.
- A dedicated furniture marketplace tab or section.
- Commercial-office listing details.
- Approved turnkey-office package entry points.
- Search results and deep links.

The app must use the shared discovery/search infrastructure where applicable, while keeping furniture-specific filters and response fields separate from real-estate listing filters.

Potential backend-provided filters include:

- Furniture category.
- Individual asset versus package.
- Rental versus sale.
- Location or service area.
- Availability.
- Price or rent range.
- Rental duration.
- Workspace capacity.
- Office-use category.
- Delivery or serviceability options.
- Supplier or verification signals where approved for public display.

The app must not invent filters that the backend does not support.

## 7. Furniture Cards and Search Results

Each card must render only approved response fields, such as:

- Furniture name.
- Representative image.
- Category.
- Individual or package label.
- Rental or sale label.
- Backend-provided price or rent summary.
- Deposit summary where approved.
- Availability or serviceability indicator.
- Package capacity or included-item summary.
- Trust or verification signals supplied by the backend.
- Delivery/service-area information where available.

Pricing labels must be semantically precise. For example, do not display a monthly rental amount as the total payable amount, and do not display a deposit as a fee.

If a result becomes unavailable, the UI must show an unavailable state and refresh when appropriate. It must not continue to present stale availability as bookable.

## 8. Furniture Detail Screen

The detail screen may contain:

- Image gallery.
- Name and category.
- Description.
- Specifications.
- Dimensions and materials where provided.
- Included components for packages.
- Workspace capacity for packaged setups.
- Rental or sale modes.
- Price, recurring rent, deposit, and fee semantics supplied by the backend.
- Minimum rental duration where applicable.
- Availability and serviceability.
- Delivery information.
- Return information.
- Warranty or support information where approved.
- Supplier or provider attribution where public display is permitted.
- Related furniture or compatible office-space offerings.
- Eligibility and action metadata.

The UI must not fabricate technical specifications, package contents, delivery promises, rental terms, warranty coverage, or return eligibility.

## 9. Rental and Sale Mode Selection

When an item supports multiple commercial modes, the app must clearly separate:

- Outright purchase.
- Recurring rental.
- Approved package or bundled offering.

The selected mode must drive the backend-defined pricing and checkout contract. Do not calculate rental totals by multiplying a displayed monthly amount on the client.

Before proceeding, display backend-provided information about:

- Billing frequency.
- Rental duration.
- Security deposit.
- One-time charges.
- Delivery charges, if applicable.
- Taxes or other charges, only when returned with clear semantics.
- Renewal or continuation behavior.
- Return requirements.
- Cancellation rules.

If required information is missing, block the action or route the user to an approved next step rather than guessing.

## 10. Variant and Quantity Selection

If the backend supports variants or quantities:

- Render only backend-provided options.
- Disable unavailable variants.
- Enforce backend-provided quantity limits in the UI as a convenience, not as the security boundary.
- Prevent duplicate taps and duplicate add-to-cart requests.
- Revalidate availability before final submission when required.
- Handle quantity changes that exceed current availability.
- Preserve a safe local draft only when it does not create a false reservation.

The app must not claim that an item is reserved merely because it is present in a local cart.

## 11. Cart or Checkout Intent

If a cart is part of the approved API contract, implement it as a server-aware workflow.

The app must:

1. Create or retrieve the authenticated user's cart or checkout intent through the shared API.
2. Add only eligible items or packages.
3. Display server-confirmed line items.
4. Reconcile price, availability, and terms after server responses.
5. Prevent duplicate mutation requests using the approved idempotency mechanism.
6. Refresh stale cart contents safely.
7. Explain removed, changed, expired, or unavailable items.
8. Display a complete backend-provided order summary before submission.
9. Avoid treating local cart state as a reservation or completed order.

If the backend does not support a persistent cart, implement a short-lived checkout intent rather than inventing a cart domain in the app.

## 12. Order and Rental Summary

Before the user submits an order or payment intent, show a backend-generated summary containing, where applicable:

- Selected items or packages.
- Quantity.
- Commercial mode.
- One-time amount.
- Recurring amount and frequency.
- Security deposit.
- Delivery or service charges.
- Taxes or other charges with clear labels.
- Total due now.
- Future recurring amount.
- Billing or renewal date where supplied.
- Delivery or service address summary.
- Rental duration.
- Return obligations.
- Cancellation terms.
- Applicable consent or acknowledgement requirements.

Do not calculate the final payable amount independently on the client. The backend must be authoritative.

## 13. Payment Boundary

The User App must consume the shared payment contract.

The app may:

- Start an approved checkout or payment intent.
- Open the approved payment-provider interface.
- Display pending, successful, failed, cancelled, or action-required states.
- Poll or refresh a backend payment status when instructed by the contract.
- Display backend-confirmed receipts or transaction references where permitted.

The app must not:

- Trust a client-side success callback as proof of payment.
- Mark an order as paid locally.
- Store payment credentials.
- Expose provider secrets.
- Duplicate webhook processing.
- Recalculate taxes, deposits, refunds, or recurring charges independently.

Order activation must be based on backend-confirmed payment and order state.

## 14. User-Owned Order and Rental History

Provide an authenticated history view when supported, with filters or tabs such as:

- All.
- Purchase orders.
- Active rentals.
- Pending requests.
- Completed orders.
- Returns.
- Cancelled or failed orders.
- Claims or support cases.

Render only statuses defined by the shared API. Potential examples include requested, pending payment, payment pending, confirmed, preparing, dispatched, delivered, active rental, return requested, return scheduled, returned, claim under review, completed, cancelled, rejected, failed, or expired.

Do not hardcode these states as a substitute for the contract; use the exact API enum and a centralized presentation map.

## 15. Order and Rental Detail Screens

A detail screen may show:

- Order or rental reference suitable for the user.
- Items and quantities.
- Commercial mode.
- Current status.
- Payment summary.
- Delivery or service information.
- Rental billing information.
- Deposit status where permitted.
- Renewal information where supplied.
- Return instructions.
- Damage-claim status and next steps where applicable.
- Receipts or downloadable documents where authorized.
- Support entry points.
- Permitted actions.

Do not expose supplier-private data, internal settlement information, risk metadata, or administrative notes.

## 16. Cancellation, Returns, and Damage Claims

### 16.1 Cancellation

Before displaying cancellation controls, use backend-provided eligibility and policy data.

The flow must:

1. Display the applicable consequences.
2. Collect an approved reason if required.
3. Require confirmation for destructive actions.
4. Submit the request through the shared API.
5. Display the backend-confirmed result.
6. Refresh order and payment state when necessary.

### 16.2 Returns

For rentals, the app may allow users to request or schedule a return only when the backend permits it.

The UI must display:

- Return eligibility.
- Required notice period.
- Available return slots or instructions.
- Pickup or handover information.
- Potential pending obligations supplied by the backend.

Do not promise deposit refunds or return completion before backend confirmation.

### 16.3 Damage Claims

Damage claims are backend-controlled. The app may display:

- Claim status.
- Evidence-request instructions.
- User-submitted evidence requirements where supported.
- Amounts or decisions explicitly released for user display.
- Appeal or support instructions where approved.

The app must not determine damage liability, invent charges, or alter claim outcomes.

## 17. Address and Delivery Information

If delivery or pickup addresses are required:

- Use the approved address API and validation rules.
- Collect only necessary address data.
- Distinguish saved addresses from the address used for a specific order.
- Display serviceability based on backend confirmation.
- Avoid exposing full addresses in analytics, logs, notifications, or navigation parameters unnecessarily.
- Handle address changes according to the order state and backend policy.

Do not assume that a location used for real-estate discovery is automatically a valid furniture delivery address.

## 18. Notifications and Deep Links

Consume shared notification events for relevant furniture events, such as:

- Furniture order created.
- Payment pending or confirmed.
- Order status changed.
- Dispatch or delivery update.
- Rental billing reminder.
- Rental renewal event.
- Return request update.
- Return scheduled or completed.
- Damage claim update.
- Support action required.

Deep links must:

- Require authentication for private order information.
- Resolve the latest backend state before rendering sensitive details.
- Handle expired, cancelled, deleted, or inaccessible records safely.
- Avoid placing private data in URLs or push-notification payloads.

## 19. Local State and Caching

The app may cache catalogue data for performance, but catalogue availability, pricing, rental terms, and order state must be treated as potentially stale.

Requirements:

- Use centralized query/cache utilities.
- Invalidate or refresh affected data after mutations.
- Never cache payment credentials.
- Clear private cart, order, address, and rental data on logout or account switching according to policy.
- Prevent one user's private orders from appearing in another user's session.
- Distinguish a local cart draft from a backend-confirmed cart or checkout intent.
- Handle offline mode without claiming that orders, returns, or payments succeeded.

## 20. Security and Privacy

The app must:

- Enforce authentication for private order and rental data.
- Use backend authorization as the source of truth.
- Avoid logging addresses, payment details, claim evidence, or private order data.
- Avoid exposing supplier settlement or internal financial information.
- Use secure storage only for approved session material.
- Protect private screens and deep links where platform capabilities allow.
- Validate attachments and file sizes if claim evidence is supported.
- Use HTTPS outside local development.
- Never embed provider or backend secrets in the mobile bundle.

## 21. Accessibility and UX

Provide:

- Clear rental-versus-sale labels.
- Explicit labels for recurring rent, deposit, total due now, and future charges.
- Accessible product images and gallery controls.
- Screen-reader-friendly status and validation messages.
- Adequate touch targets.
- Clear confirmation before cancellation or return requests.
- Non-color-only status indicators.
- Loading, retry, empty, unavailable, and stale-data messaging.
- Clear explanations when an item or price changes before checkout.

Avoid dark patterns around recurring billing, deposits, cancellation, or return obligations.

## 22. Analytics and Telemetry

Use only approved analytics events, such as:

- Furniture marketplace viewed.
- Furniture search submitted.
- Furniture item viewed.
- Rental mode selected.
- Sale mode selected.
- Package viewed.
- Item added to cart or checkout intent.
- Checkout started.
- Order submitted.
- Payment status viewed.
- Order detail viewed.
- Return flow started.
- Support or claim flow started.

Do not send:

- Full addresses.
- Payment credentials.
- Claim evidence.
- Private order notes.
- Unnecessary personal identifiers.
- Full cart or order payloads.

Analytics must not be treated as proof of order creation, payment, delivery, return, or claim resolution. Critical outcomes must use backend-confirmed state.

## 23. Testing Requirements

### 23.1 Unit and Component Tests

Test:

- Rental-versus-sale mode rendering.
- Price and deposit labelling.
- Quantity and variant validation.
- Availability-state rendering.
- Cart/checkout-intent state transitions.
- Order-status presentation mapping.
- Destructive-action confirmations.
- Error-to-field mapping.
- Cache invalidation behavior.
- Accessibility labels and status announcements.

### 23.2 Integration Tests

Test:

- Furniture catalogue retrieval.
- Search and filter requests.
- Detail retrieval.
- Rental and sale option selection.
- Variant and quantity changes.
- Cart or checkout-intent creation.
- Price/availability reconciliation.
- Order submission.
- Payment-pending and payment-failure handling.
- Order-history retrieval.
- Cancellation eligibility and submission.
- Return request flow.
- Damage-claim status display.
- Logout during an active order request.
- Cross-account cache isolation.

### 23.3 End-to-End Tests

At minimum:

1. A user can open the furniture marketplace.
2. A user can browse and filter furniture using supported filters.
3. A user can open a furniture detail screen.
4. Rental and sale options are clearly distinguished.
5. Recurring rent and security deposit are labelled correctly.
6. Unavailable items cannot be submitted as available orders.
7. The order summary reflects backend-confirmed amounts.
8. Payment-pending and payment-failure states are handled correctly.
9. A user can view only their own furniture orders and rentals.
10. A permitted cancellation or return request shows the backend-confirmed result.
11. The app does not claim a return, refund, or claim resolution prematurely.
12. Private order data is cleared or protected during logout and account switching.

## 24. Definition of Done

This step is complete when:

- Furniture discovery uses shared typed APIs and approved search infrastructure.
- Individual assets and packaged setups are represented distinctly.
- Rental and sale modes are clearly separated.
- Pricing, recurring rent, deposits, and charges use backend-provided semantics.
- Availability is not treated as guaranteed from stale local state.
- Cart or checkout intent behavior follows the actual backend contract.
- Final order summaries are backend-generated or backend-confirmed.
- Payment state is never inferred from a client callback alone.
- User order and rental history is properly authorized.
- Cancellation, return, and damage-claim workflows remain backend-controlled.
- Private order, address, payment, and claim data is protected.
- Notifications and deep links resolve current backend state.
- Critical furniture flows have automated tests.
- No supplier, settlement, inventory, pricing, or claim-decision logic is duplicated in the User App.

## 25. AI IDE Instructions

1. Read the shared furniture, catalogue, inventory, order, payment, rental, return, claims, notification, identity, authorization, validation, and observability contracts before coding.
2. Re-check the BRD, SOW, and finalized furniture decisions.
3. Inspect existing User App navigation, API client, query/cache layer, form utilities, design system, secure storage, analytics, and deep-link infrastructure.
4. Confirm whether the backend exposes a persistent cart, checkout intent, or direct order-creation flow before creating UI architecture.
5. Confirm the exact furniture categories, package structures, commercial modes, statuses, and response fields from the API contract.
6. Reuse centralized money, date, status, error, authorization, and analytics utilities.
7. Never calculate final prices, deposits, taxes, recurring charges, refunds, or claim outcomes locally.
8. Do not implement supplier-facing or administrative functionality in the User App.
9. Add tests for stale availability, changed prices, duplicate submissions, payment-pending states, cancellation, returns, and cross-account cache isolation.
10. Keep private addresses, order data, payment information, and claim evidence out of logs and analytics.
11. Record unresolved product or API questions as explicit blockers.
12. Keep the app runnable after each logical implementation unit.

## 26. Acceptance Criteria

1. Users can enter the furniture marketplace through approved app entry points.
2. Users can browse individual furniture assets and packaged office setups.
3. Supported furniture filters work through shared APIs.
4. Rental and sale modes are clearly differentiated.
5. Backend-provided pricing, recurring rent, deposits, and charges are labelled correctly.
6. Unavailable items and variants cannot be falsely presented as orderable.
7. Cart or checkout-intent behavior matches the backend contract.
8. The final order summary uses backend-confirmed amounts and terms.
9. The app does not mark an order as paid based only on a client-side callback.
10. Users can view only their own authorized orders and rental arrangements.
11. Cancellation, return, and damage-claim actions respect backend eligibility.
12. The app does not claim completion of delivery, return, refund, or claim resolution prematurely.
13. Relevant furniture events produce safe, authenticated notification/deep-link experiences.
14. Private order, address, payment, and claim data is protected.
15. Critical furniture journeys have automated test coverage.
16. Shared catalogue, inventory, order, payment, authorization, validation, events, and observability contracts are reused.
17. No duplicate furniture business logic exists in the User App.
