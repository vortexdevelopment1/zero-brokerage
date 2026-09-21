# Super Admin Panel Blueprint — Step 3: Admin Identity, Access Control, and Secure Session Management

## 1. Document Purpose

This document defines the implementation contract for the Super Admin Panel's administrative identity, authentication, authorization, session security, and privileged-action safeguards.

The Super Admin Panel is a high-privilege operational interface for the Zero Brokerage platform. It must consume the Shared Core Backend's identity, authorization, audit, session, validation, and security contracts. It must not create a parallel authentication system or make authorization decisions solely in the browser.

This step covers the admin-facing experience and integration requirements. The authoritative identity, permission, session, and audit rules remain in the Shared Core Backend.

## 2. Mandatory Source and Dependency Review

Before implementation, the AI IDE must review and reconcile:

1. `BRD_Real_Estate_Ecosystem_VortexCubes.pdf`.
2. `SOW_Developer_Technical_Contract_VortexCubes.pdf`.
3. All finalized Zero Brokerage architectural and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. Super Admin Blueprint Steps 1–2.
6. Repository documentation under `docs/`, especially identity, authorization, API, security, observability, and database contracts.
7. Existing shared packages and API client conventions.

Decision precedence:

1. Explicitly finalized critical project decisions.
2. Approved BRD requirements.
3. Approved SOW requirements.
4. Shared Core Backend contracts.
5. Super Admin Blueprint instructions.
6. Routine implementation decisions.

If a conflict is discovered, record it as a blocker or decision item. Do not silently introduce a new policy.

## 3. Scope

### 3.1 Included

- Admin sign-in and sign-out experience.
- Phone/email-based admin authentication according to the shared identity contract.
- OTP or approved second-factor verification where required by the backend policy.
- Session bootstrap and current-admin retrieval.
- Session expiry, refresh, revocation, and forced sign-out handling.
- Admin role and permission discovery from authoritative API responses.
- Permission-aware navigation and action visibility.
- Route protection and server-side authorization enforcement.
- Privileged-action confirmation UX.
- Step-up authentication or re-authentication for sensitive actions when required.
- Device/session visibility and revocation surfaces if exposed by the backend contract.
- Suspicious-session and account-lockout messaging.
- Safe handling of unauthorized, forbidden, expired, and revoked sessions.
- Audit context propagation for admin actions.
- Security-focused tests for the admin interface.

### 3.2 Excluded

Do not implement the following in this step:

- A second user, broker, or agency authentication system.
- Client-side-only permission enforcement.
- Direct database access from the Next.js application.
- Custom payment, subscription, commission, or settlement logic.
- Independent moderation, verification, or approval rules.
- Password/OTP policy changes without a shared-core decision.
- Unapproved impersonation capabilities.
- Silent privilege escalation.
- Permanent storage of access tokens in unsafe browser storage.
- New admin roles invented only for UI convenience.

## 4. Product and Security Principles

### 4.1 Backend Authority

The backend is authoritative for:

- Whether an admin account exists and is active.
- Whether authentication has succeeded.
- Whether a session is valid, expired, revoked, or challenged.
- Which roles and permissions the admin currently has.
- Whether an action is allowed in a particular resource scope.
- Whether step-up authentication is required.
- Whether a privileged action was accepted, rejected, or completed.

The UI may hide unavailable actions for usability, but hiding a button is never a security control.

### 4.2 Least Privilege

The panel must expose only the capabilities granted to the authenticated admin. The implementation must support permission-based checks rather than hard-coded assumptions such as “every logged-in user is a Super Admin.”

### 4.3 Deny by Default

If the permission state is loading, missing, stale, malformed, or unavailable, protected actions must remain unavailable. The UI must not optimistically grant access while permissions are unresolved.

### 4.4 Secure by Design

Sensitive credentials, OTPs, recovery codes, session tokens, and private verification documents must not be written to logs, analytics events, URLs, browser history, or client-side error reports.

### 4.5 Explicit Privileged Actions

High-impact actions must use a deliberate confirmation flow. The confirmation must explain the target, intended effect, and any irreversible or externally visible consequence. A generic “Are you sure?” dialog is insufficient for destructive or high-risk operations.

## 5. Admin Identity Model

The panel must consume the shared identity model and display only fields explicitly provided by the API contract.

The minimum UI-facing current-admin representation should support, where available:

- Stable admin/user identifier.
- Display name.
- Masked or non-sensitive contact identifier.
- Account status.
- Assigned role identifiers.
- Effective permission identifiers or permission groups.
- Tenant/platform scope, if applicable.
- Session metadata safe for display.
- Security challenge state, if applicable.
- Last successful sign-in metadata, if exposed by the backend.

Do not infer authority from a display name, email domain, route, or local configuration flag.

## 6. Authentication Journey

### 6.1 Entry and Preflight

When an unauthenticated operator opens the panel:

1. Render the admin authentication entry point.
2. Do not load protected operational data before authentication is established.
3. Use the shared API client and request-context conventions.
4. Display only generic authentication errors that do not reveal whether an account exists.
5. Preserve safe, non-sensitive return navigation information only.
6. Reject open redirects; return destinations must be allowlisted or represented by internal route identifiers.

### 6.2 Primary Authentication

The exact primary authentication mechanism must follow the finalized Shared Core identity contract. The interface must support the contract rather than hard-code a provider-specific flow.

Depending on the approved contract, the flow may include:

- Contact identifier submission.
- OTP request.
- OTP verification.
- Credential verification.
- Second-factor challenge.
- Device/session registration.
- Recovery or support-directed account recovery.

The UI must represent each state explicitly:

- Idle.
- Submitting.
- Challenge issued.
- Challenge expired.
- Verification failed.
- Rate limited.
- Account locked or suspended.
- Authentication successful.
- Additional verification required.

### 6.3 OTP Handling

If OTP authentication is used by the shared contract:

- Never log or expose the OTP value after entry.
- Use one-time input state that is cleared after completion or failure where practical.
- Respect server-provided resend cooldowns.
- Do not implement client-side OTP acceptance.
- Do not reveal whether a phone number or email is registered.
- Handle expired, consumed, invalid, and rate-limited OTP responses distinctly but safely.
- Avoid uncontrolled automatic retries.
- Do not place OTPs in query strings, route segments, analytics payloads, or crash reports.

### 6.4 Additional Verification

If the backend requires step-up authentication for the admin account or a particular action:

1. Display the reason for the additional challenge in plain language.
2. Start the challenge through the shared API contract.
3. Keep the pending action context server-correlated and tamper-resistant.
4. Do not trust a client-provided “verified” flag.
5. Expire the pending challenge according to the server response.
6. Return the operator to the original safe workflow only after the backend confirms success.

## 7. Session Bootstrap and Lifecycle

### 7.1 Application Startup

On initial load:

1. Initialize only non-sensitive client configuration.
2. Establish the shared API client.
3. Request the authoritative current-session/current-admin state.
4. Render a neutral loading boundary while authentication state is unresolved.
5. If the session is valid, load the effective permission context.
6. If the session is invalid or absent, redirect to the admin sign-in route.
7. If the session is revoked or the account is suspended, clear protected client state and show the appropriate safe message.

The app must not flash protected screens before the session check completes.

### 7.2 Token and Cookie Handling

Follow the backend's approved session transport exactly. Prefer secure, HttpOnly, SameSite-aware cookie-based session handling when that is the finalized contract. If an access token must be handled by the client, use the approved secure storage and refresh strategy; do not invent a new token lifecycle.

The UI must not:

- Persist sensitive tokens in localStorage by default.
- Include tokens in URLs.
- Print authorization headers in logs.
- Copy tokens into error messages.
- Manually decode a token and treat decoded claims as final authorization.

### 7.3 Refresh and Expiry

The API client must centralize session refresh behavior where supported:

- Avoid multiple simultaneous refresh requests.
- Queue or fail concurrent requests consistently during refresh.
- Retry only requests permitted by the shared client policy.
- Never retry unsafe mutations blindly.
- If refresh fails, clear protected state and route to authentication.
- Preserve a safe explanation that the session expired or was revoked.
- Avoid redirect loops between protected routes and sign-in.

### 7.4 Sign-Out

Sign-out must:

1. Call the shared sign-out/revocation endpoint when available.
2. Clear client-side cached protected data.
3. Clear transient permission and session state.
4. Disconnect privileged real-time channels if any are used.
5. Prevent browser back navigation from exposing usable protected screens.
6. Return to the admin authentication entry point.

If the network is unavailable, the UI must not falsely claim that server-side revocation succeeded. It may clear local state and clearly communicate the result according to the shared error policy.

## 8. Authorization and Permission Model

### 8.1 Effective Permissions

The panel must consume effective permissions from the backend. Permission identifiers should be stable, documented, and shared across interfaces.

Use a capability model such as:

- `dashboard.read`
- `users.read`
- `users.manage`
- `brokers.read`
- `brokers.verify`
- `agencies.read`
- `listings.read`
- `listings.moderate`
- `visits.read`
- `leads.read`
- `furniture.read`
- `furniture.manage`
- `payments.read`
- `subscriptions.manage`
- `settlements.read`
- `settlements.manage`
- `analytics.read`
- `exports.create`
- `urgent-requirements.read`
- `operations.read`
- `audit.read`
- `admin-accounts.manage`

These identifiers are illustrative integration names only. Reuse the exact identifiers from the shared authorization contract and do not create duplicates if the backend already defines them.

### 8.2 Route Guards

Every protected route must have a guard that verifies:

- Authentication is resolved.
- The session is valid.
- The required permission is present.
- Any resource scope or action-specific condition is satisfied.

A route guard must not rely only on the sidebar configuration. Direct navigation to a restricted URL must produce a safe forbidden state or redirect.

### 8.3 Component and Action Guards

Build reusable permission-aware UI primitives for:

- Navigation items.
- Page-level access.
- Table actions.
- Bulk actions.
- Toolbar actions.
- Export buttons.
- Approval/rejection controls.
- Financial actions.
- Account-management actions.

Permission checks must be centralized and typed. Avoid scattered string literals and inconsistent fallback behavior.

### 8.4 Loading and Unknown Permission State

While permissions are loading:

- Do not render privileged action controls as active.
- Use skeletons or a neutral loading state.
- Do not treat missing permissions as granted.

If the permission response is malformed or unavailable:

- Fail closed for protected actions.
- Display a recoverable error.
- Provide a retry option where appropriate.
- Log a redacted diagnostic event through the approved observability layer.

### 8.5 Scope-Aware Authorization

Some permissions may depend on the target resource, organization, agency, broker, listing, settlement, or operational domain. The client may pass the selected resource identifier to the API, but the backend must make the final decision.

Do not assume that a broad read permission authorizes every mutation or every record export.

## 9. Admin Application State

Separate state into clear categories:

### 9.1 Session State

- Authentication status.
- Current admin summary.
- Session expiry metadata safe for display.
- Security challenge state.
- Sign-out and refresh status.

### 9.2 Authorization State

- Effective roles.
- Effective permissions.
- Permission loading/error state.
- Permission version or freshness metadata if provided.

### 9.3 UI State

- Sidebar collapse state.
- Active navigation item.
- Dialog visibility.
- Table filters.
- Pagination.
- Temporary form values.
- Toasts and banners.

Do not mix UI state with authoritative identity or authorization state.

### 9.4 Server Data

Use the approved query/cache layer for current-admin data and protected resources. Invalidate or refetch data after permission changes, sign-out, account suspension, or security events.

Cached privileged data must not remain accessible after the session is invalidated.

## 10. Privileged Action Confirmation Patterns

Use risk-appropriate confirmation patterns.

### 10.1 Low-Risk Actions

For reversible, low-impact actions, use a concise confirmation or inline action according to the shared design system.

### 10.2 High-Risk Actions

For actions such as account suspension, broker verification decisions, listing publication overrides, settlement changes, refund decisions, or administrative role changes:

- Show the exact target.
- Show the proposed state transition.
- Show the reason or justification field when required.
- Require an explicit confirmation action.
- Require step-up authentication when the backend says it is necessary.
- Disable duplicate submissions while pending.
- Display the authoritative result returned by the API.
- Show the audit/reference identifier when provided.

### 10.3 Destructive Actions

For destructive or difficult-to-reverse actions:

- Require deliberate confirmation.
- Prefer typing a target name or confirmation phrase only when the risk policy calls for it.
- Do not use a confirmation checkbox as a substitute for backend authorization.
- Explain any downstream consequences.
- Ensure cancellation is easy and safe.

## 11. Unauthorized and Error UX

The panel must distinguish the following cases without leaking sensitive information:

| Situation | Required UI behavior |
|---|---|
| Unauthenticated | Redirect to admin sign-in or show authentication boundary |
| Session expired | Explain that the session expired and request sign-in |
| Session revoked | Clear protected state and explain that re-authentication is required |
| Account suspended | Show a safe account-status message and support path if defined |
| Forbidden | Show an access-denied state without exposing restricted data |
| Resource not found | Use the shared not-found behavior; do not reveal existence where prohibited |
| Rate limited | Show server-provided retry guidance without creating client retry storms |
| Validation failure | Map field-level errors using the shared error contract |
| Conflict | Explain that the resource changed and offer refresh/reconciliation |
| Network failure | Provide retry and preserve unsaved safe form state where possible |
| Server failure | Show a generic recoverable message and correlation ID if safe |
| Step-up required | Start the approved additional verification flow |

Do not use HTTP status codes alone as the complete user-facing message.

## 12. Admin Profile and Security Settings Surface

If exposed by the shared API contract, the panel may provide a security/account menu containing:

- Displayed admin identity.
- Current role summary.
- Last sign-in information.
- Active session/device list.
- Sign-out from another session.
- Security challenge or second-factor settings.
- Account recovery entry point.
- Sign-out.

Any security-setting mutation must be backend-authorized, auditable, and protected against CSRF or equivalent request-forgery threats according to the session architecture.

Do not expose sensitive verification documents, secret recovery material, or internal security signals in the ordinary profile menu.

## 13. Audit and Observability Integration

The interface must provide the context required by the shared audit and observability contracts:

- Correlation/request ID propagation through the shared API client.
- Stable UI action name where the contract supports it.
- Target resource identifier only when permitted and non-sensitive.
- No OTPs, tokens, passwords, private documents, or unnecessary personal data.
- Clear distinction between an attempted action and a successful backend outcome.

The client may emit UX telemetry, but it must not claim that a moderation, payment, settlement, verification, or account operation succeeded until the backend response confirms it.

## 14. API Integration Contract

Before implementation, document the exact endpoints and schemas used for:

- Admin authentication initiation.
- Authentication verification.
- Current-session/current-admin retrieval.
- Effective permissions retrieval.
- Session refresh, if applicable.
- Sign-out/session revocation.
- Security challenge initiation and completion, if applicable.
- Session listing/revocation, if applicable.
- Admin profile/security settings, if applicable.

For every endpoint, record:

- HTTP method and versioned route.
- Request schema.
- Response schema.
- Authentication requirement.
- Required permission.
- Error codes.
- Rate-limit behavior.
- Idempotency requirements.
- Pending/asynchronous states.
- Cache policy.
- Audit expectations.

Do not guess route names or response fields. If an endpoint is not yet available, create a documented integration blocker rather than mocking an authoritative success path.

## 15. Frontend Structure Guidance

Use the existing Super Admin app structure and shared repository conventions. A reasonable responsibility split is:

```text
apps/super-admin/
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   └── sign-in/
    │   └── (protected)/
    │       └── ...
    ├── features/
    │   └── admin-security/
    │       ├── api/
    │       ├── components/
    │       ├── hooks/
    │       ├── schemas/
    │       ├── state/
    │       ├── types/
    │       └── index.ts
    ├── components/
    │   └── authorization/
    ├── lib/
    │   ├── api-client/
    │   ├── auth/
    │   └── routing/
    └── ...
```

This is guidance, not permission to restructure the repository blindly. Inspect the existing code before adding directories.

Responsibilities:

- `auth` integration: session bootstrap, sign-in state, sign-out, refresh handling.
- `authorization`: reusable permission and route guards.
- `admin-security` feature: admin-facing security views and interactions.
- API layer: typed calls using shared API conventions.
- UI components: presentation only; no authoritative policy decisions.

## 16. Security Requirements

The implementation must verify at minimum:

- Protected routes cannot be accessed without a valid session.
- Direct URL navigation cannot bypass route guards.
- Protected API calls use the shared authenticated client.
- Expired and revoked sessions remove access to protected data.
- Permission checks fail closed while loading or on malformed state.
- UI-only permission hiding is not treated as enforcement.
- Sensitive values are not logged or included in analytics.
- Open redirects are prevented.
- Duplicate privileged submissions are prevented at the UI and safely handled by the backend.
- Step-up challenges cannot be marked complete by client-side state manipulation.
- Sign-out clears protected caches and real-time connections.
- Browser back navigation does not restore usable protected state after sign-out.
- Unauthorized errors do not reveal restricted record existence.
- CSRF and cookie protections follow the approved session architecture.
- Session and permission state cannot be overridden through URL parameters or local storage edits.

## 17. Testing Requirements

### 17.1 Unit Tests

Test:

- Permission helper behavior.
- Deny-by-default behavior.
- Route guard states.
- Permission loading and failure states.
- Session state transitions.
- OTP input and cooldown behavior, if applicable.
- Error mapping.
- Confirmation-dialog requirements.
- Safe return-route validation.

### 17.2 Integration Tests

Test:

- Successful authentication and session bootstrap.
- Invalid authentication response.
- Expired session handling.
- Revoked session handling.
- Permission retrieval and cache invalidation.
- Forbidden API response handling.
- Refresh concurrency behavior.
- Sign-out and protected-cache clearing.
- Step-up challenge flow, if applicable.
- Session/device revocation, if applicable.

### 17.3 Security Tests

Test:

- Direct navigation to restricted routes.
- Manipulated client permission state.
- Missing or malformed permission payloads.
- Unauthorized mutation attempts.
- Open redirect attempts.
- Token leakage through logs, URLs, and telemetry.
- Duplicate high-risk action submissions.
- Browser back navigation after sign-out.
- Cross-account cached-data leakage.
- CSRF protections according to the selected session transport.

### 17.4 End-to-End Tests

At minimum, automate these journeys in a staging environment:

1. Admin signs in and reaches the protected shell.
2. Admin with limited permissions sees only permitted navigation and actions.
3. Admin attempts a restricted route and receives a safe forbidden state.
4. Session expiry causes a controlled re-authentication flow.
5. Admin signs out and cannot use previously cached protected data.
6. A sensitive action requires confirmation and reports the authoritative backend result.
7. A step-up challenge is required and completed, if enabled.

## 18. Acceptance Criteria

This step is complete only when:

1. Admin authentication uses the Shared Core identity contract.
2. The panel does not implement a parallel authentication or authorization system.
3. Protected routes wait for authoritative session resolution.
4. Effective roles and permissions are retrieved from the backend.
5. Route and action guards fail closed when permissions are unknown.
6. Direct URL navigation cannot bypass access controls.
7. Session refresh, expiry, revocation, and sign-out behavior are handled consistently.
8. Protected cached data is cleared or invalidated after session termination.
9. High-impact actions use explicit, risk-appropriate confirmation UX.
10. The UI never reports a privileged action as successful before backend confirmation.
11. Sensitive authentication and security data are excluded from logs and telemetry.
12. Unauthorized, forbidden, rate-limit, conflict, and server-error states follow shared API error conventions.
13. Security and session tests cover both normal and adversarial flows.
14. API endpoints and schemas are documented rather than guessed.
15. No user, broker, agency, listing, payment, or moderation business rules are duplicated in the frontend.
16. No Agency Web Portal, Broker App, or public-website functionality is introduced.

## 19. Implementation Deliverables

The implementation team must deliver:

- Admin authentication screens and state handling.
- Session bootstrap and protected-route integration.
- Shared authenticated API-client integration.
- Effective-permission retrieval and typed permission helpers.
- Route, page, component, and action guard primitives.
- Sign-out and session-revocation handling.
- Expiry/refresh/error-state handling.
- Privileged-action confirmation components.
- Optional security/session settings surface only where supported by APIs.
- Redacted observability integration.
- Unit, integration, security, and end-to-end tests.
- Updated API integration notes and unresolved-blocker documentation.

## 20. AI IDE Execution Instructions

When implementing this step in Antigravity:

1. Inspect the current Super Admin application and shared API-client implementation before changing files.
2. Read the Shared Core identity, authorization, session, error, audit, and observability contracts first.
3. Reuse existing shared hooks, schemas, types, request context, and error-normalization utilities.
4. Do not create a second role matrix or permission vocabulary.
5. Do not treat decoded client claims or local flags as authoritative authorization.
6. Do not persist sensitive tokens in unsafe browser storage.
7. Do not implement business mutations that belong to later Super Admin blueprint steps.
8. Keep authentication, authorization, and security state separate from ordinary UI state.
9. Test expired, revoked, forbidden, malformed, rate-limited, and network-failure cases.
10. Use backend-confirmed outcomes for all privileged actions.
11. Record missing backend contracts as explicit blockers.
12. Do not add Agency Portal, Broker App, or public-website functionality.
13. Do not mark the step complete until every acceptance criterion has been verified.

## 21. Definition of Done

The step is done when the Super Admin Panel has a secure, contract-driven admin identity and access foundation that protects every subsequent administrative module, behaves predictably during session and permission changes, and introduces no duplicate backend security or business logic.
