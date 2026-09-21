# User App Blueprint — Step 2: Authentication, Onboarding, Session Management, and Account Security

## Purpose

Implement the User App authentication and account-security experience using the Shared Core Backend identity and authentication contracts. The mobile app must not implement OTP generation, OTP verification, token validation, role assignment, or its own authorization system.

## Objectives

- Support app launch and session restoration.
- Support phone-number authentication and OTP request/verification.
- Handle resend, expiry, invalid-code, network, and rate-limit states.
- Support new-user onboarding and backend-confirmed profile completion.
- Support secure session persistence, refresh, expiry, and logout.
- Provide approved profile, privacy, and account-deletion entry points.
- Provide accessible, secure, testable authentication screens.

## Scope

### Included

- Authentication entry screen
- Phone-number and country-code input
- OTP screen, countdown, resend, and change-number actions
- Onboarding forms
- Session restoration and protected-route handling
- Token/session refresh where supported
- Logout and private-cache cleanup
- Session-expiry recovery
- Approved deep-link handling
- Authentication telemetry and tests

### Excluded

- Backend OTP generation or verification
- Token signing or validation
- Role assignment or authorization decisions
- Broker, agency, or Super Admin authentication
- Provider secrets in the mobile bundle
- Unapproved password authentication

## Authentication Flows

### First Launch

1. Initialize safe configuration.
2. Check for a locally stored session.
3. Restore it through the approved backend mechanism.
4. Fetch the current profile after successful restoration.
5. Route users requiring onboarding to the approved onboarding flow.
6. Route unauthenticated users to guest/authentication entry.
7. Do not block guest discovery if guest access is supported.

### Existing User

1. Validate the phone number locally for usability.
2. Request an OTP through the shared API.
3. Display the OTP screen and resend countdown.
4. Submit the OTP to the backend.
5. Handle success, invalid, expired, pending, network, and rate-limited responses.
6. Securely persist credentials according to the shared contract.
7. Fetch the authenticated profile and navigate appropriately.

An accepted OTP request is not authentication success.

### New User Onboarding

- Render only approved fields and steps.
- Explain required information clearly.
- Use local validation for usability and backend validation as authoritative.
- Preserve safe drafts after recoverable failures.
- Mark onboarding complete only after backend confirmation.
- Do not invent mandatory fields or product requirements.

## Screen Requirements

### Authentication Entry

Provide the sign-in explanation, phone-number field, approved country-code handling, continue action, legal links where required, loading state, validation feedback, and service-failure feedback. Do not reveal whether a phone number belongs to an account unless explicitly allowed by the API contract.

### OTP Screen

Provide accessible input, safe autofocus/paste support, countdown, resend, change-number action, verification state, invalid/expired-code feedback, rate-limit feedback, and retry handling. Never log or track OTP values.

### Onboarding Screens

Define required/optional fields, validation, keyboard behavior, navigation, progress, save/continue behavior, accessibility labels, and completion states for each screen.

### Session Expiry

On an authentication failure from a protected request, attempt the approved refresh flow once where supported, prevent refresh loops, preserve safe navigation context, explain expiry, offer re-authentication, clear invalid credentials, and never display stale private data as current.

## Session and Credential Handling

- Use secure platform storage only.
- Never store credentials in plain storage, logs, analytics, navigation parameters, URLs, screenshots, or crash breadcrumbs.
- Centralize restoration and refresh in the auth/API layer.
- Prevent concurrent refresh storms with a single-flight/lock mechanism where applicable.
- Queue only safe requests after successful refresh.
- Stop retrying after refresh failure.
- Use bounded timeouts and no infinite retries.

### Logout

1. Clear local session state.
2. Remove secure credentials.
3. Clear private cached data.
4. Reset protected navigation state.
5. Call backend logout/revocation if required.
6. Return to the correct guest/authentication route.
7. Prevent private data from appearing through back navigation.

Local cleanup must occur even if the backend logout request fails.

## Central Authentication State

Use one centralized state model. Suggested states:

- `INITIALIZING`
- `RESTORING_SESSION`
- `GUEST`
- `OTP_REQUESTING`
- `OTP_REQUIRED`
- `VERIFYING`
- `AUTHENTICATED`
- `ONBOARDING_REQUIRED`
- `SESSION_EXPIRED`
- `LOGGING_OUT`
- `AUTH_ERROR`

Prevent contradictory states, duplicate OTP requests, authenticated navigation before verification, onboarding after logout, and refresh loops.

## Validation and Errors

Validate phone format, OTP format/length from the shared contract, approved onboarding fields, field lengths, supported formats, and consent requirements where applicable.

Map backend errors to understandable messages such as:

- Invalid phone number
- OTP unavailable
- Invalid or expired OTP
- Too many attempts
- Too many requests
- Session expired
- Account unavailable
- Profile completion required
- Service unavailable
- Network failure

Do not expose account-enumeration information or internal details.

## Rate Limits and Retry Behavior

The backend controls actual limits. The app must disable duplicate submissions, show contract-defined resend timing, handle server rate-limit responses, avoid aggressive automatic retries, provide safe retry actions, and explain waiting periods. Client countdowns are UX aids, not security controls.

## Privacy and Account Management

Provide approved access to profile viewing/editing, privacy information, communication preferences, account status, account-deletion requests, and logout.

For deletion, explain consequences, use the approved confirmation flow, submit to the backend, show API-driven pending/completed/unavailable states, clear local private data when appropriate, and never perform authoritative backend deletion locally.

## Deep Links

Allowlist trusted schemes/hosts, validate route and state parameters, never place tokens in URLs, handle expired links safely, prevent redirect loops, and centralize deep-link handling. Keep authentication data out of logs and analytics.

## Accessibility and UX

Use accessible labels and focus order, screen-reader-friendly validation messages, adequate touch targets, keyboard-aware layouts, clear error/warning/success states, secure autofill/paste where appropriate, and non-color-only status communication.

## Analytics

Use only approved event names from the shared catalog. Potential events include authentication-screen viewed, OTP request initiated/failed, OTP verification succeeded/failed, onboarding started/completed, session restored, session expired, logout completed, and account-deletion request initiated.

Never include OTPs, raw phone numbers, tokens, private profile fields, or sensitive failure details.

## Testing Requirements

### Unit/component tests

- Phone validation
- OTP input and countdown behavior
- Form validation
- Authentication-state transitions
- Error mapping
- Logout cleanup
- Navigation guards
- Refresh-lock behavior

### Integration tests

- OTP success, invalidity, expiry, and rate limiting
- New-user onboarding
- Existing-user sign-in
- Session restoration and expiry
- Refresh failure
- Logout when backend is unavailable
- Account-deletion request handling

### End-to-end tests

1. New user can request and verify an OTP.
2. Returning user can restore a valid session.
3. Invalid OTP cannot authenticate.
4. Rate-limit feedback is understandable.
5. Required onboarding cannot be bypassed.
6. Expired sessions route safely to authentication.
7. Logout removes private-screen and private-cache access.
8. Refresh cannot loop indefinitely.
9. Authentication screens work with accessibility tools.
10. Sensitive authentication data is absent from logs and analytics.

## Definition of Done

- Authentication screens follow shared design and navigation conventions.
- OTP flows use the centralized typed API client.
- Credentials use secure platform storage.
- Auth state is centralized and deterministic.
- Restoration, refresh, expiry, and logout are safe and tested.
- Backend errors map to clear UI states.
- Onboarding completion is backend-confirmed.
- Account-management entry points follow approved contracts.
- Deep-link behavior is validated where applicable.
- Critical authentication journeys have automated tests.
- No authentication or authorization protocol is duplicated locally.

## AI IDE Instructions

1. Read the Shared Core Backend identity, authentication, authorization, security, API-error, and observability documents.
2. Inspect the existing User App navigation, API client, secure-storage, configuration, and state-management setup.
3. Reuse existing authentication utilities.
4. Confirm exact endpoints and response states before creating screens.
5. Do not invent OTP length, expiry, token format, or onboarding fields.
6. Keep credentials out of logs, analytics, crash reports, and navigation state.
7. Make restoration and refresh concurrency-safe.
8. Clear private navigation and cache state on logout.
9. Add tests alongside implementation.
10. Record unresolved contract questions as blockers.
11. Do not implement broker, agency, or Super Admin authentication here.
12. Keep the app runnable after each logical unit.

## Acceptance Criteria

1. OTP authentication uses the shared backend API.
2. Verification success is determined only by the backend.
3. Invalid, expired, and rate-limited states are handled clearly.
4. Centralized auth state prevents contradictory navigation.
5. Valid sessions restore securely.
6. Invalid sessions cannot access protected screens.
7. Refresh is bounded and concurrency-safe where supported.
8. Logout clears credentials and private state even if backend logout fails.
9. Onboarding completion requires backend confirmation.
10. Authentication errors do not expose sensitive account information.
11. OTPs and credentials are not logged or tracked.
12. Critical authentication journeys have automated coverage.
13. Shared API, validation, security, navigation, and observability contracts are reused.
14. No duplicate authentication or authorization system exists in the User App.
