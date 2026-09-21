# User App Blueprint — Step 6: Visits, Inquiries, Leads, and Communication

## 1. Purpose

Implement the User App journeys for requesting property visits, submitting inquiries, tracking user-owned interactions, and communicating through approved platform workflows.

The User App must consume the Shared Core Backend contracts for visits, leads, identity, notifications, messaging, authorization, rate limiting, and auditability. It must not implement ownership, assignment, broker-routing, or state-transition logic locally.

## 2. Objectives

The implementation must allow users to:

- Request a visit for an eligible listing
- Select from backend-provided availability options
- View visit details and status
- Reschedule or cancel visits when permitted
- Submit property inquiries
- Track inquiry/lead status visible to the user
- View broker or agency contact details only when authorized
- Receive updates about visits and inquiries
- Avoid duplicate submissions
- Understand rejected, expired, cancelled, and unavailable actions

## 3. Scope

### Included

- Visit-request flow
- Availability selection
- Visit confirmation screen
- Visit list and detail screens
- Rescheduling and cancellation
- Property inquiry form
- User-facing inquiry history
- Approved contact and communication entry points
- Loading, empty, error, and retry states
- Push/deep-link handling for visit and inquiry updates
- Analytics and automated tests

### Excluded

- Broker assignment decisions
- Agency ownership decisions
- Manual lead routing
- Broker-side visit management
- Administrative overrides
- Direct messaging infrastructure
- Direct database access
- Client-side status mutation without backend confirmation

## 4. Visit Eligibility

Before showing a request action, the app should use backend-provided eligibility information. Eligibility may depend on:

- Listing publication state
- Listing availability
- User account state
- Existing active visit requests
- Listing-specific restrictions
- Required verification or consent
- Rate limits or abuse controls
- Existing transaction or agreement state

Do not infer eligibility solely from the presence of a button or from cached listing data.

If the backend rejects a request, display the approved explanation and refresh the relevant listing or visit state when appropriate.

## 5. Visit-Request Flow

The visit flow must:

1. Start from an eligible listing or approved user journey.
2. Fetch current availability from the backend.
3. Display only selectable slots returned by the backend.
4. Collect only approved additional information.
5. Validate required fields locally.
6. Prevent duplicate submissions.
7. Submit the request through the centralized API client.
8. Display a pending or confirmed state based on the server response.
9. Show the visit identifier only when appropriate for the user experience.
10. Provide access to visit details and next steps.

The app must not invent time slots, confirm visits locally, or assume that a request is accepted merely because the API call was sent.

## 6. Availability and Time Handling

- Treat backend availability as authoritative.
- Display the correct property and timezone context.
- Format dates and times consistently across the app.
- Handle expired slots and changed availability.
- Refresh availability before final submission when required by the contract.
- Prevent selection of disabled or expired slots.
- Handle daylight-saving or timezone behavior through shared date utilities.
- Never use device-local time as a substitute for server-defined business time.

## 7. Visit Details

The visit-detail screen may show approved information such as:

- Property summary
- Visit date and time
- Visit status
- Meeting instructions
- Contact or coordination information
- Cancellation/rescheduling eligibility
- Relevant notes supplied by the backend
- Next steps

Possible backend-provided states may include requested, pending, confirmed, reschedule-required, completed, cancelled, rejected, expired, or no-show. Render only states defined by the API contract.

Do not expose internal workflow notes, broker-only information, fraud flags, or administrative audit data.

## 8. Rescheduling and Cancellation

For rescheduling:

1. Confirm that the backend permits rescheduling.
2. Retrieve current availability.
3. Let the user choose from valid slots.
4. Submit the change through the shared API.
5. Display the server-confirmed result.
6. Refresh affected visit and notification data.

For cancellation:

1. Display the cancellation consequences supplied by the backend.
2. Require an explicit confirmation.
3. Submit the cancellation request.
4. Prevent duplicate actions while processing.
5. Display the confirmed status only after a successful response.

Do not assume cancellation is free, reversible, or always available.

## 9. Inquiry Submission

The inquiry flow must collect only approved information, such as:

- Listing reference
- User's message or question
- Preferred contact method, where supported
- Approved scheduling context
- Other contract-defined fields

The app must:

- Validate length and format limits
- Prevent empty or abusive submissions
- Display privacy-relevant explanations where needed
- Avoid duplicating an active inquiry without user confirmation
- Submit through the shared API
- Display the server-confirmed result
- Provide a reference or history entry when supported

Do not allow users to select or modify the broker/agency owner of a lead unless the backend contract explicitly permits it.

## 10. Lead Ownership and Visibility

The User App must respect the finalized ownership model:

- An independent-broker lead belongs to the broker.
- An agency lead belongs to the agency and may be assigned to brokers by authorized backend workflows.

The user should see only information explicitly permitted for the user role, such as inquiry status, submitted message, relevant timestamps, and approved contact information.

Never expose internal assignment history, private broker notes, agency routing rules, or administrative data.

## 11. Communication Entry Points

Communication actions may include approved options such as:

- Requesting a callback
- Calling a permitted contact number
- Opening an approved chat or messaging flow
- Sending a follow-up inquiry
- Viewing visit coordination instructions

The app must:

- Use backend-authorized contact details.
- Avoid exposing personal contact information before permission is granted.
- Respect communication preferences and platform policies.
- Track user-visible action outcomes accurately.
- Handle unavailable or withdrawn contact options.

Do not implement an independent messaging system inside the User App.

## 12. Notifications and Deep Links

Visit and inquiry events may produce push, in-app, SMS, email, or WhatsApp notifications according to shared backend policy.

The app must:

- Render notification content from trusted payloads.
- Validate deep-link targets.
- Require authentication for private destinations.
- Refresh the target resource after navigation.
- Handle stale or deleted resources gracefully.
- Avoid trusting notification payloads as the source of truth.

A notification may initiate navigation, but the destination screen must fetch authoritative data.

## 13. State Management

Use centralized query and mutation utilities for visit and inquiry resources.

Required behavior:

- Keep server state separate from temporary form state.
- Invalidate or update affected caches after confirmed mutations.
- Prevent duplicate requests.
- Support retry for safe read operations.
- Avoid retrying non-idempotent mutations blindly.
- Preserve user input after recoverable failures where safe.
- Handle session expiry consistently.

Status labels and action availability must derive from backend data and shared permission rules.

## 14. Validation and Error Handling

Handle at least:

- Missing or invalid listing reference
- Listing no longer available
- Slot expired
- Slot already taken
- Duplicate visit request
- Existing active inquiry
- Rate limit exceeded
- Unauthorized or expired session
- Forbidden action
- Validation failure
- Conflict or stale state
- Network timeout
- Service unavailable

Use the shared error format and display actionable, user-safe messages. Never expose stack traces, internal codes, or broker/administrative details.

## 15. Security and Privacy

The app must:

- Require authentication for private visit and inquiry data.
- Use secure API and session utilities.
- Avoid logging messages, contact details, or private visit information.
- Avoid putting sensitive data in URLs or navigation parameters.
- Enforce backend authorization for every private resource.
- Clear private data during logout and account switching.
- Respect user communication preferences.
- Avoid revealing whether another user has interacted with a listing.
- Use secure external-call handling for phone, maps, or messaging integrations.

Client-side hiding is not an authorization control.

## 16. Analytics

Use only approved event definitions. Potential events include:

- Visit flow started
- Availability viewed
- Visit slot selected
- Visit request submitted
- Visit request confirmed
- Visit reschedule requested
- Visit cancelled
- Inquiry started
- Inquiry submitted
- Contact action initiated
- Communication action completed

Do not include full messages, phone numbers, private notes, or unnecessary personal data in analytics events. Submission events must not be treated as proof of backend success unless the server confirms the outcome.

## 17. Testing Requirements

### Unit and component tests

Test:

- Slot rendering and disabled states
- Date/time formatting
- Form validation
- Duplicate-submit prevention
- Confirmation dialogs
- Status-to-UI mapping
- Error mapping
- Deep-link validation
- Permission-based action visibility

### Integration tests

Test:

- Availability retrieval
- Visit request success and failure
- Slot-expiry handling
- Duplicate visit prevention
- Rescheduling
- Cancellation
- Inquiry submission
- Existing inquiry handling
- Session expiry during mutation
- Cache invalidation after success
- Notification-driven refresh

### End-to-end tests

1. A user can request a visit for an eligible listing.
2. Only backend-provided availability slots are selectable.
3. A taken or expired slot is handled safely.
4. A confirmed visit appears in the user's visit history.
5. A user can reschedule when permitted.
6. A user can cancel when permitted and sees the confirmed result.
7. A user can submit an inquiry.
8. Duplicate inquiry/visit submissions are prevented or safely rejected.
9. Private visit and inquiry data is inaccessible after logout.
10. A notification deep link opens the correct resource and refreshes server data.

## 18. Definition of Done

- Visit and inquiry flows use shared typed API contracts.
- Availability and status are server-authoritative.
- Rescheduling and cancellation follow backend permissions.
- Lead ownership is never decided in the client.
- Communication actions use authorized contact data.
- Notification deep links validate and refresh their destination.
- Duplicate mutations are prevented or handled safely.
- Privacy and security safeguards are implemented.
- Critical journeys have automated coverage.
- No visit, lead-routing, authorization, or messaging business logic is duplicated in the app.

## 19. AI IDE Instructions

1. Read the shared visits, leads, listings, identity, notifications, authorization, rate-limit, and error-contract documents.
2. Inspect existing navigation, query/mutation utilities, secure storage, deep-link handling, and design-system components.
3. Confirm the exact API states and permitted user actions before implementation.
4. Reuse shared date/time, validation, API, error, and analytics utilities.
5. Never invent availability slots, statuses, ownership rules, or contact permissions.
6. Do not optimistically confirm visits, cancellations, or inquiries without backend confirmation.
7. Add tests for slot expiry, duplicate submission, session expiry, and logout isolation.
8. Record unresolved API or policy questions as blockers.

## 20. Acceptance Criteria

1. Users can request visits only for eligible listings.
2. Availability is fetched from and controlled by the backend.
3. Visit requests show pending or confirmed states based on server responses.
4. Expired, unavailable, and already-taken slots are handled safely.
5. Rescheduling and cancellation obey backend permissions.
6. Inquiry forms validate input and use shared API conventions.
7. User-facing lead visibility follows the approved ownership model.
8. Contact actions expose only backend-authorized information.
9. Notification deep links require appropriate authentication and refresh data.
10. Duplicate submissions are prevented or handled idempotently by the overall workflow.
11. Private visit and inquiry data is cleared or protected during logout and account switching.
12. Critical visit and inquiry journeys have automated tests.
13. No shared backend business logic is duplicated in the User App.
