# User App Blueprint — Step 1: Executive Scope, Product Boundaries, and Implementation Contract

## 1. Document Purpose

This document defines the implementation contract for the Zero Brokerage User App.

The User App is the customer-facing application through which end users discover properties, inspect listing details, request visits, communicate through approved workflows, manage their profile, access eligible services, and participate in supported furniture, payment, review, and transaction journeys.

This blueprint is intended for the developer responsible for the User App implementation. It must be used together with the complete Shared Core Backend Blueprint.

The User App must consume shared backend APIs and contracts. It must not recreate backend business rules, database logic, authorization decisions, payment verification, listing publication logic, lead ownership logic, or entitlement calculations.

---

## 2. Implementation Objective

Build a production-ready User App that:

1. Provides a clear and reliable property-discovery experience.
2. Supports authenticated and unauthenticated user journeys according to approved access rules.
3. Allows users to search, filter, inspect, save, and interact with eligible listings.
4. Supports visit-request workflows through shared backend APIs.
5. Presents accurate listing, broker, agency, trust, and availability information.
6. Supports approved furniture marketplace journeys.
7. Integrates with shared payments and subscription flows without processing payment state locally.
8. Supports reviews only when the backend confirms eligibility.
9. Provides clear loading, empty, error, and degraded states.
10. Protects user data and respects server-provided permissions and entitlements.
11. Remains maintainable, testable, accessible, and responsive.
12. Avoids duplicating functionality belonging to the Broker App, Super Admin Panel, Public Website, or Shared Core Backend.

---

## 3. Source and Scope Alignment

Implementation must remain aligned with:

- The approved Business Requirements Document.
- The approved Statement of Work.
- The finalized Zero Brokerage architecture and decision records.
- The Shared Core Backend Blueprint.
- The shared API contracts and error conventions.
- The shared design system and application configuration.

If the BRD, SOW, backend contract, and implementation plan conflict, do not silently choose an interpretation. Record the conflict and escalate it through the project decision process.

Do not introduce new product capabilities merely because they are technically convenient.

---

## 4. User App Responsibilities

### 4.1 In Scope

The User App may include:

- User onboarding and authentication
- OTP-based sign-in and verification
- Profile management
- Property discovery
- Search and filters
- Geospatial discovery where supported
- Listing details
- Listing media presentation
- Listing trust and verification indicators
- Saved listings or favorites where approved
- Visit requests and visit status
- User-side lead and inquiry visibility where approved
- Notifications
- Furniture discovery and approved purchase/rental journeys
- Payment initiation through approved backend flows
- Subscription-related user entitlements where applicable
- Reviews and ratings
- Transaction or agreement visibility where approved
- Support and issue-reporting entry points
- Privacy and account-management controls

### 4.2 Out of Scope

Do not implement User App functionality for:

- Super Admin operations
- Broker verification or broker approval
- Agency management
- Listing moderation
- Platform-wide analytics
- Administrative financial reconciliation
- Internal settlement operations
- Direct database access
- Provider-side payment verification
- Unapproved chat or social features
- Unapproved agency-portal workflows

---

## 5. Required Technical Baseline

The implementation must follow the approved frontend stack and repository conventions.

Expected baseline:

- React Native for the mobile User App
- TypeScript with strict type checking
- Shared API contracts and generated or centrally maintained types where available
- Shared validation and error conventions
- Secure token/session storage appropriate to the mobile platform
- A predictable state-management strategy
- A reusable networking layer
- Centralized navigation
- Reusable design-system components
- Automated unit and integration tests
- End-to-end coverage for critical user journeys

Do not introduce a second networking client, duplicate API type definitions, or an unrelated state-management pattern without an explicit architecture decision.

---

## 6. Application Architecture Principles

### 6.1 Feature-Oriented Structure

Organize the User App by product feature rather than by an unstructured collection of screens.

A suitable structure may include:

```text
apps/user-mobile/
├── src/
│   ├── app/
│   ├── navigation/
│   ├── features/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── discovery/
│   │   ├── listings/
│   │   ├── favorites/
│   │   ├── visits/
│   │   ├── leads/
│   │   ├── furniture/
│   │   ├── payments/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   └── support/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── state/
│   ├── theme/
│   ├── utils/
│   └── tests/
```

The exact structure may follow the repository's established conventions.

### 6.2 Separation of Responsibilities

The User App is responsible for:

- Rendering UI
- Managing local presentation state
- Managing navigation
- Collecting user input
- Calling authorized backend APIs
- Displaying server results
- Handling local caching where safe
- Presenting server-provided permissions and statuses
- Reporting non-critical interaction telemetry through approved contracts

The User App is not responsible for:

- Deciding whether a user is authorized
- Calculating final prices or taxes
- Verifying payment success
- Determining listing publication eligibility
- Assigning leads
- Determining subscription entitlements
- Calculating authoritative ratings
- Confirming visit completion
- Deciding ownership or fraud status

---

## 7. Core User Experience Principles

### 7.1 Trust and Transparency

The UI must clearly distinguish:

- Verified versus unverified information
- Published versus unavailable listings
- Estimated versus final amounts
- Pending versus successful operations
- Platform-generated information versus user-provided information
- Sponsored content versus organic discovery

Do not display a trust badge, payment-success message, verified status, or completion state unless it is supported by the backend response.

### 7.2 Predictable Feedback

Every network-driven interaction must support appropriate states:

- Initial loading
- Refreshing
- Empty result
- Validation failure
- Unauthorized state
- Forbidden state
- Not-found state
- Conflict state
- Rate-limited state
- Offline or connectivity failure
- Server failure
- Retry action where safe
- Success confirmation

### 7.3 Accessibility

The User App must provide:

- Accessible labels for controls
- Adequate touch targets
- Logical focus and reading order
- Meaningful error announcements where supported
- Sufficient contrast according to the adopted design standard
- Support for dynamic text sizing where practical
- Non-color-only status communication

### 7.4 Performance

Prioritize:

- Fast initial screen rendering
- Efficient list virtualization
- Image resizing and caching
- Pagination or cursor-based loading
- Minimal unnecessary rerenders
- Debounced search input
- Safe request cancellation
- Avoidance of unbounded local state
- Clear performance budgets for major screens

---

## 8. Navigation and Access Model

Define navigation around authenticated and unauthenticated states.

At minimum, distinguish:

- Public or guest routes
- Authenticated user routes
- Authentication-required actions
- Routes requiring a specific backend entitlement
- Routes unavailable because a resource is deleted, hidden, or inaccessible

Navigation guards are a UX convenience only. Backend authorization remains authoritative.

When a session expires:

1. Preserve safe local context where possible.
2. Stop protected requests.
3. Attempt the approved refresh flow if applicable.
4. Otherwise route the user through re-authentication.
5. Avoid silently losing unsaved user input.
6. Do not expose private response data after logout.

---

## 9. API Consumption Contract

The User App must consume the shared API through a centralized client layer.

The client layer must provide:

- Base URL configuration
- Request correlation support where required
- Authentication headers or credential handling
- Typed request and response contracts
- Standard error normalization
- Timeout behavior
- Request cancellation
- Retry behavior only where explicitly safe
- Idempotency-key support for approved operations
- Pagination helpers
- File-upload handling where approved
- Consistent response parsing

Do not implement payment, review, entitlement, or ownership logic in screen components.

The app must treat server responses as authoritative for:

- Resource status
- Permissions
- Price and tax breakdowns
- Payment outcomes
- Subscription access
- Review eligibility
- Listing availability
- Visit status
- Lead visibility
- Notification state

---

## 10. State Management

Separate state into clear categories:

### 10.1 Server State

Examples:

- Listings
- Search results
- Listing details
- Visits
- User profile
- Notifications
- Orders
- Payment status
- Reviews
- Subscription status

Server state should use the approved data-fetching and caching strategy.

### 10.2 Session State

Examples:

- Authentication state
- Current user identity
- Session expiry
- Onboarding completion
- Logout state

### 10.3 UI State

Examples:

- Modal visibility
- Selected filters
- Active tab
- Form input
- Loading indicators
- Local sorting preferences
- Temporary draft values

### 10.4 Local Device State

Examples:

- Safe non-sensitive preferences
- Last selected discovery location
- Accessibility preferences
- Non-sensitive onboarding hints

Never store sensitive tokens, identity documents, payment secrets, or private user data in insecure local storage.

---

## 11. Error and Empty-State Contract

The app must map shared backend errors to user-understandable messages without exposing internal details.

The UI should distinguish at least:

- Invalid input
- Session expired
- Access denied
- Resource unavailable
- Duplicate request
- Payment pending
- Payment failed
- Service temporarily unavailable
- Rate limit reached
- Offline state
- Unknown failure

Every error message should provide a useful next action where possible:

- Correct the input
- Retry
- Refresh
- Return to discovery
- Contact support
- Re-authenticate
- Check payment status instead of retrying blindly

Do not show “success” merely because a request was submitted if the backend returned a pending state.

---

## 12. Security Requirements

The User App must:

- Use secure platform storage for credentials and tokens.
- Avoid logging tokens, OTPs, payment data, or private user information.
- Avoid embedding provider secrets in the application bundle.
- Validate and sanitize locally displayed external content.
- Use HTTPS in non-local environments.
- Handle session expiry safely.
- Prevent screenshots or local caching of sensitive screens where required by policy and platform capability.
- Avoid trusting client-side price, role, entitlement, or verification values.
- Use approved deep-link and redirect validation.
- Apply safe upload restrictions.
- Respect privacy and account-deletion workflows.

Client-side protections do not replace backend authorization.

---

## 13. Testing Baseline

Every feature must include:

- Component tests for important UI behavior
- Hook or utility tests for non-trivial logic
- API-client tests for response and error normalization
- Navigation tests for guarded routes
- Accessibility checks for critical screens
- Integration tests for important user flows
- End-to-end tests for critical production workflows

Critical User App journeys include:

1. OTP authentication.
2. Session expiry and re-authentication.
3. Property search and filtering.
4. Listing detail viewing.
5. Saving or unsaving a listing where supported.
6. Visit-request creation.
7. Payment initiation and status display.
8. Furniture order or rental flow where applicable.
9. Review eligibility and submission.
10. Notification viewing.
11. Account and privacy controls.

---

## 14. Definition of Done for Every User App Feature

A feature is not complete until:

- Its UI follows the shared design and navigation conventions.
- Its API calls use the centralized client.
- Its types and schemas come from shared contracts where available.
- Loading, empty, error, offline, and success states are implemented.
- Authentication and authorization behavior is handled correctly.
- Sensitive data is protected.
- Accessibility requirements are addressed.
- The feature works on supported target platforms.
- Unit, integration, and relevant end-to-end tests are present.
- Analytics events, if approved, use the central event catalog.
- No backend business rule has been duplicated in the app.
- Documentation and screenshots or test evidence are updated where required.

---

## 15. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the current `apps/user-mobile` structure before creating files.
2. Read the complete Shared Core Backend Blueprint before implementing feature modules.
3. Inspect shared API contracts, shared types, validation conventions, authentication contracts, and design-system decisions.
4. Reuse existing navigation, networking, state, configuration, and error-handling utilities.
5. Do not create mock business rules that could conflict with the backend.
6. Use typed API responses and explicit loading/error states.
7. Keep screen components focused on presentation and orchestration.
8. Put reusable behavior in feature-level hooks, services, or utilities.
9. Do not implement broker, agency, or Super Admin workflows in the User App.
10. Do not add unsupported features to fill gaps in the blueprint.
11. Record unresolved API or product questions as explicit blockers.
12. Implement changes incrementally and keep the application runnable after each logical unit.
13. Add tests alongside implementation rather than postponing all testing.
14. Verify the User App against the shared acceptance criteria before marking the step complete.

---

## 16. Acceptance Criteria

1. The User App has a documented feature-oriented architecture.
2. The application clearly separates guest, authenticated, and restricted routes.
3. All backend communication goes through a centralized typed API layer.
4. Server state, session state, UI state, and device state are separated.
5. The app does not make authoritative business decisions locally.
6. Loading, empty, error, offline, and pending states are part of the implementation contract.
7. Sensitive credentials and private data are handled securely.
8. Critical user journeys have a defined testing strategy.
9. The app follows shared error, validation, analytics, and navigation conventions.
10. Interface developers can implement subsequent User App steps without duplicating shared backend logic.
