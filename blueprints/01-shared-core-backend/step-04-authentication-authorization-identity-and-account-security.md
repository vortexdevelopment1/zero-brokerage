# Step 04 — Authentication, Authorization, Identity, and Account Security

## 1. Purpose

This step defines the implementation requirements for identity, authentication, authorization, session security, and account-protection workflows in the Zero Brokerage backend.

The Identity and access-control foundation must be implemented before protected business workflows are exposed to the User App, Broker App, Super Admin Panel, or other interfaces.

The backend is the authoritative source for:

- Authentication state.
- User identity.
- Session validity.
- Role and permission evaluation.
- Organization membership.
- Ownership checks.
- Account security decisions.

Client applications must never be treated as trusted sources for identity, role, ownership, verification, or entitlement information.

---

## 2. Scope

This step covers:

- User identity creation and retrieval.
- Phone-number-based authentication.
- OTP generation and verification.
- Session and device management.
- Access and refresh-token or session-token handling.
- Logout and revocation.
- Role and permission checks.
- Agency membership authorization.
- Resource ownership checks.
- Administrative authorization.
- Account security events.
- Rate limiting and abuse protection.
- Account deletion and privacy-related access controls.

This step does not define every business-domain permission. Each domain module must define its own resource-specific policies using the shared authorization foundation.

---

## 3. Identity Model

The platform must maintain a distinction between:

1. **User identity** — the platform-level account.
2. **User profile** — personal information associated with the account.
3. **Role** — the user's platform or domain role.
4. **Organization membership** — the user's relationship with an agency or organization.
5. **Resource ownership** — the user's or organization's relationship with a specific resource.
6. **Verification state** — whether a broker, listing, or other entity has passed an approved verification process.
7. **Entitlement state** — whether a subscription or plan permits a particular action.

These concepts must not be merged into one unrestricted role or status field.

A verified broker is not automatically authorized to perform every broker action. An agency member is not automatically authorized to access every agency resource. An authenticated user is not automatically authorized to access another user's records.

---

## 4. Authentication Baseline

The primary authentication flow must use phone number and OTP, subject to the approved product requirements and provider availability.

The authentication system must support:

- Phone-number normalization.
- OTP request.
- OTP delivery through an approved provider.
- OTP expiry.
- Single-use OTP verification.
- Attempt limits.
- Resend cooldowns.
- Temporary throttling.
- Successful verification handling.
- Session creation.
- Security-event recording.

The system must not log OTP values, authentication secrets, or complete sensitive tokens.

---

## 5. Phone-Number Handling

Phone numbers must be normalized before lookup or persistence.

The implementation must define:

- Accepted country-code behavior.
- Canonical storage format.
- Input validation rules.
- Duplicate identity handling.
- Change-of-phone-number workflow.
- Re-verification requirements.
- Privacy-safe display format.

Phone numbers must not be used inconsistently across authentication, notifications, analytics, and profile modules.

The system must avoid exposing whether a phone number is registered when such disclosure could enable account enumeration.

---

## 6. OTP Lifecycle

An OTP challenge should contain, at minimum:

- Challenge identifier.
- Normalized destination reference.
- Purpose.
- Creation timestamp.
- Expiry timestamp.
- Attempt count.
- Maximum allowed attempts.
- Delivery status where available.
- Verification status.
- Consumption timestamp.
- Correlation and security metadata.

OTP requirements:

- Generate cryptographically secure codes.
- Store only a secure representation where feasible.
- Apply a short expiration period.
- Make successful verification single-use.
- Enforce maximum attempts.
- Enforce resend cooldowns.
- Prevent unlimited requests from one number, device, IP, or other risk signal.
- Invalidate or supersede older challenges according to a documented policy.
- Avoid returning detailed failure reasons that help attackers.

OTP verification must be safe under concurrent requests. A code must not be accepted twice due to a race condition.

---

## 7. Session and Device Management

The system must maintain a clear session lifecycle.

Required capabilities include:

- Session creation after successful authentication.
- Session expiration.
- Explicit logout.
- Logout from the current device.
- Logout from all devices where supported.
- Session revocation after security-sensitive changes.
- Device metadata capture with privacy safeguards.
- Session listing for the account owner where approved.
- Detection and recording of suspicious session behavior.

Session records should include:

- Session identifier.
- User identifier.
- Creation timestamp.
- Last-used timestamp.
- Expiration timestamp.
- Revocation timestamp and reason.
- Device or client metadata where justified.
- Security and correlation references.

Tokens must be handled securely. Do not place long-lived secrets in insecure client-accessible storage without an explicit security review.

---

## 8. Token and Cookie Rules

The implementation team must explicitly document the selected session mechanism.

Possible mechanisms include:

- Secure, HTTP-only cookies.
- Short-lived access tokens with refresh-token rotation.
- Server-side session identifiers.
- A documented hybrid approach.

The final mechanism must define:

- Token lifetime.
- Refresh behavior.
- Rotation rules.
- Revocation behavior.
- Replay detection.
- Cookie flags where cookies are used.
- CSRF protection where applicable.
- Storage guidance for mobile clients.
- Logout semantics.
- Key-management and secret-rotation procedures.

Do not implement multiple overlapping authentication mechanisms without a documented reason.

---

## 9. Authentication Endpoints

The exact route names must follow the shared API conventions, but the backend should provide capabilities equivalent to:

- Request OTP.
- Verify OTP.
- Refresh or renew a session.
- Log out from the current session.
- Log out from all sessions.
- Get the current authenticated user.
- List active sessions where approved.
- Revoke a selected session where approved.
- Initiate a sensitive-account change.
- Confirm a sensitive-account change.

Every endpoint must define:

- Request schema.
- Response schema.
- Authentication requirement.
- Rate-limit policy.
- Error behavior.
- Audit/security events.
- Idempotency behavior where relevant.

---

## 10. Authorization Model

Authorization must be evaluated on the backend after authentication.

The platform should use layered authorization:

1. Authentication check.
2. Platform-role check.
3. Organization or agency-membership check.
4. Resource ownership or relationship check.
5. Resource-state check.
6. Entitlement or subscription check where applicable.
7. Action-specific policy check.

An endpoint must not stop at a generic role check when the requested resource has additional ownership or state restrictions.

Example:

```text
Authenticated user
        ↓
Has broker-related role?
        ↓
Is the broker profile linked to this user?
        ↓
Is the broker verified and active?
        ↓
Does the requested action require a subscription entitlement?
        ↓
Is the target resource accessible?
        ↓
Permit or reject the action
```

---

## 11. Role and Permission Design

Roles and permissions must be explicitly documented.

Potential role categories include:

- User.
- Independent broker.
- Agency member.
- Agency administrator or manager.
- Super Admin.
- Other approved operational roles.

The exact role names must follow the approved product terminology.

Do not rely on a single unrestricted `is_admin`, `is_broker`, or similar boolean for sensitive authorization.

Permissions should be action-oriented, such as:

- View own profile.
- Manage own listings.
- Submit broker verification.
- Assign agency leads.
- Moderate listings.
- Manage subscription plans.
- View platform analytics.
- Perform settlement operations.

Permissions must be checked against the authenticated server-side identity and current database state.

---

## 12. Agency Membership Authorization

Agency-related access must be scoped to verified membership.

The backend must validate:

- Whether the user belongs to the agency.
- Whether the membership is active.
- The user's agency role.
- Whether the role permits the requested action.
- Whether the resource belongs to the same agency.
- Whether the operation is restricted to agency administrators.
- Whether the action must be audited.

Membership changes must invalidate or re-evaluate permissions as appropriate.

A user must not gain agency access by submitting an agency ID in the request body.

---

## 13. Resource Ownership Checks

Ownership checks must be implemented in the relevant domain module.

Examples include:

- A user may manage only their own profile and saved data.
- A broker may manage only listings they are authorized to manage.
- An independent broker's leads are scoped to that broker.
- Agency-owned leads are scoped to the agency and assigned permissions.
- Listing moderation is restricted to authorized administrative actors.
- A listing owner cannot approve their own listing through a client-side flag.
- A user cannot create a review for a visit they did not participate in.

Ownership checks must be performed using trusted server-side relationships.

---

## 14. Super Admin Authorization

Super Admin capabilities must be separated by action and sensitivity.

Sensitive operations should require:

- Explicit permission checks.
- Current account status validation.
- Audit-log creation.
- Confirmation or step-up authentication where justified.
- Concurrency protection for conflicting administrative actions.
- Clear reason or note fields where required.
- Reviewability after execution.

Administrative actions must not be authorized solely because a request contains an administrative role value.

The Administration module owns administrative workflows, while domain modules retain ownership of domain invariants.

---

## 15. Broker Verification and Access

Broker verification is a domain workflow, not merely an authentication flag.

The authorization layer must distinguish between:

- Account authenticated.
- Broker profile exists.
- Verification submitted.
- Verification pending.
- Verification approved.
- Verification rejected.
- Broker suspended.
- Broker re-verification required.
- Broker operationally active.

The backend must enforce the applicable state requirements before allowing broker-only operations.

Verification documents and decisions must be access-controlled and audited.

---

## 16. Entitlement and Subscription Checks

Subscription access must be evaluated through the central entitlement mechanism.

Individual routes must not independently implement inconsistent checks such as:

```text
if (user.plan === "premium") ...
```

Instead, the application layer should call a shared entitlement interface that evaluates:

- User or organization identity.
- Relevant subscription.
- Feature or action key.
- Current subscription state.
- Grace period.
- Usage limit.
- Plan restrictions.
- Effective date.
- Any approved exceptions.

The entitlement result must be treated as authoritative only when calculated by the backend.

---

## 17. Rate Limiting and Abuse Prevention

Apply rate limits to security-sensitive endpoints, especially:

- OTP requests.
- OTP verification.
- Login/session renewal.
- Password or sensitive-account recovery flows if introduced.
- Session-management operations.
- Administrative actions.
- High-volume search or lead-generation endpoints where relevant.

Rate limits may consider:

- IP address.
- Phone number or destination.
- User account.
- Device identifier.
- Endpoint.
- Time window.
- Risk signals.

Rate-limit responses must use the shared error format and must not disclose sensitive internal controls.

Rate limiting must be designed for multiple API instances when the application is horizontally scaled.

---

## 18. Security Events and Auditability

Security-relevant events should include:

- OTP requested.
- OTP verification succeeded.
- OTP verification failed.
- Session created.
- Session revoked.
- Logout-all executed.
- Suspicious activity detected.
- Sensitive profile change initiated.
- Sensitive profile change completed.
- Role or membership changed.
- Broker verification decision recorded.
- Administrative privilege used.
- Account deletion requested.
- Account deletion completed or rejected.

Security events must contain minimal necessary data and must not include raw OTPs, tokens, or secrets.

Audit records must be protected from ordinary user modification.

---

## 19. Account Deletion and Privacy Controls

The account lifecycle must define:

- How a user requests account deletion.
- Whether re-authentication is required.
- What data is deleted.
- What data is anonymized.
- What financial or audit records must be retained.
- What happens to active listings, leads, visits, subscriptions, and transactions.
- How pending operations are handled.
- Whether deletion is immediate or queued.
- How the user receives status updates.

Deletion must not bypass legal, financial, fraud-prevention, or audit-retention requirements.

The implementation must avoid leaving orphaned records or exposing deleted users through ordinary APIs.

---

## 20. Error Handling

Authentication and authorization failures must use consistent public error categories.

The system should distinguish appropriately between:

- Unauthenticated request.
- Invalid or expired session.
- Insufficient permission.
- Resource not found.
- Resource inaccessible due to ownership scope.
- Invalid account state.
- Verification required.
- Subscription entitlement missing.
- Rate limit exceeded.
- Security challenge required.

The API must avoid leaking whether protected resources exist when doing so would create an information-disclosure risk.

---

## 21. Testing Requirements

### Unit Tests

Test:

- Phone-number normalization.
- OTP generation and expiry rules.
- OTP attempt limits.
- OTP single-use behavior.
- Permission policies.
- Role checks.
- Agency membership policies.
- Ownership policies.
- Entitlement-policy integration.
- Account-state restrictions.

### Integration Tests

Test:

- OTP persistence.
- Concurrent OTP verification.
- Session creation and revocation.
- Refresh-token or session renewal behavior.
- Rate limiting with shared Redis state.
- Membership changes.
- Security-event persistence.
- Authorization against real database relationships.

### End-to-End Tests

Test:

- New-user authentication.
- Returning-user login.
- Logout.
- Logout from all devices.
- Unauthorized resource access.
- Cross-user access attempts.
- Cross-agency access attempts.
- Broker verification restrictions.
- Administrative permission boundaries.
- Subscription-restricted actions.
- Account-deletion workflow.

Tests must cover expired credentials, revoked sessions, duplicate requests, concurrent requests, and malformed input.

---

## 22. Required Deliverables

The implementation team must produce:

1. An identity and authentication data model.
2. An OTP lifecycle design.
3. A session/token strategy decision record.
4. Authentication route contracts.
5. A role and permission matrix.
6. An agency-membership authorization policy.
7. A resource-ownership policy framework.
8. A broker-verification access policy.
9. An entitlement-check integration contract.
10. A security-event catalog.
11. A rate-limit policy.
12. An account-deletion and retention workflow.
13. Unit, integration, and end-to-end tests for the implemented scope.

---

## 23. Definition of Done

This step is complete when:

- Phone-based authentication works through a documented provider abstraction.
- OTP challenges are expiring, single-use, and rate-limited.
- Sessions can be created, renewed, and revoked safely.
- Authentication secrets are not exposed in logs or responses.
- Roles and permissions are documented.
- Agency membership and resource ownership checks are enforced server-side.
- Broker verification states affect access correctly.
- Subscription checks use the central entitlement mechanism.
- Security events and sensitive administrative actions are auditable.
- Account-deletion behavior is documented.
- Security-critical tests pass.
- No interface application duplicates authentication or authorization business rules.

---

## 24. Acceptance Criteria

- [ ] Authentication is server-authoritative.
- [ ] Phone numbers are normalized consistently.
- [ ] OTPs are secure, expiring, single-use, and attempt-limited.
- [ ] OTP and session endpoints are rate-limited.
- [ ] Session revocation is supported.
- [ ] The chosen token or session strategy is documented.
- [ ] Roles and permissions are explicit.
- [ ] Agency membership is verified server-side.
- [ ] Resource ownership is checked by the relevant domain module.
- [ ] Super Admin actions are permission-controlled and audited.
- [ ] Broker verification state is enforced.
- [ ] Subscription restrictions use the shared entitlement mechanism.
- [ ] Security events do not contain secrets.
- [ ] Account deletion respects retention and legal constraints.
- [ ] Cross-user and cross-agency access tests exist.
- [ ] No client-provided role, ownership, verification, or entitlement value is trusted.
