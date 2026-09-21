# User App Blueprint — Step 3: Profile, Preferences, Privacy, and Account Management

## Purpose

Define the User App implementation contract for profile viewing/editing, discovery preferences, communication preferences, privacy information, account status, support access, and account deletion.

The app must consume shared backend identity, profile, authorization, privacy, retention, and notification contracts. It must not independently implement account ownership, deletion, retention, consent, or authorization rules.

## Objectives

Implement:

- Profile viewing and editing
- Profile-completion indicators
- Approved discovery preferences
- Communication and notification preferences
- Privacy-policy and terms access
- Account-status display
- Account-deletion request flow
- Logout and private-cache cleanup
- Support and issue-reporting entry points
- Accessible loading, empty, error, and confirmation states
- Automated tests for critical account journeys

## Scope Boundaries

Included:

- Profile and profile-edit screens
- Editable/read-only field handling
- Profile-image upload where approved
- Preferred location and approved discovery preferences
- Communication preferences
- Privacy and policy links
- Account status
- Account-deletion request
- Support entry points
- Local drafts and cache handling
- Accessibility and security behavior

Excluded:

- Broker, agency, or Super Admin profile management
- Role assignment or verification
- Direct database access
- Client-side account deletion
- Unapproved sensitive-data collection
- Independent privacy, consent, or retention rules
- Unapproved social-profile functionality

## Profile Data Rules

The backend is authoritative. The app must distinguish editable, read-only, required, optional, user-provided, system-generated, and verification-dependent fields.

Do not display internal IDs, security metadata, risk flags, administrative notes, or verification badges unless explicitly supplied by the backend.

## Profile Viewing and Editing

The profile screen should show only approved data, such as display name, profile image, verified contact indicators where supplied, preferred location, completion status, account status, saved preferences, and account-management actions.

Handle loading, refreshing, incomplete data, unauthorized access, unavailable accounts, network failures, and safe retries.

For every editable field define its label, type, required status, limits, accepted format, local validation, backend validation, save behavior, error mapping, and accessibility label.

Save flow:

1. Load the current server state.
2. Render only approved editable fields.
3. Perform lightweight local validation.
4. Prevent duplicate submissions.
5. Submit through the centralized typed API client.
6. Map backend validation errors to fields.
7. Update local server-state cache only after success.
8. Display the server-confirmed result.
9. Preserve safe drafts after recoverable failures.

For stale-version or conflict responses, refresh authoritative data and avoid silently overwriting newer server changes.

## Profile Images

If supported:

- Use the approved upload lifecycle.
- Validate file type and size.
- Show progress where practical.
- Handle cancellation, failure, rejection, and pending states.
- Avoid exposing private storage URLs unnecessarily.
- Keep image data out of logs and analytics.
- Do not treat an upload as complete before backend confirmation.

## Discovery Preferences

Approved persisted preferences may include preferred location, property categories, budget range, furnishing preference, property-use preference, and other contract-defined options.

Clearly separate temporary search filters from persisted account preferences. Do not silently persist temporary filters.

Persisted updates must be validated, submitted through the shared API, confirmed by the server, and reconciled safely after conflicts or partial failures.

## Communication Preferences

Where supported, provide backend-defined controls for push, email, SMS, WhatsApp, product updates, visit-related updates, payment and transaction notifications, and promotional communications.

Distinguish mandatory service messages from optional or consent-based communications. Do not allow generic switches to disable legally or operationally mandatory messages.

All preference updates must be confirmed by the backend.

## Privacy and Policy Information

Provide approved access to the privacy policy, terms of service, consent information, data-use explanations, account-deletion information, and support or grievance channels where required.

Use trusted, allowlisted sources for remote policy content. Display effective dates where supplied. Do not invent legal wording or fabricate consent records.

## Account Status

Render only backend-provided states such as Active, Restricted, Pending Action, Deletion Requested, Deactivated, or Unavailable.

For each state, show approved explanations and only permitted next actions. Do not expose internal risk or moderation details.

## Account Deletion

The flow must:

1. Explain consequences and possible retained records.
2. Explain impact on active visits, orders, payments, reviews, or agreements where applicable.
3. Require the approved confirmation mechanism.
4. Submit a deletion request to the backend.
5. Display the server-confirmed state.
6. Explain waiting periods or follow-up steps.
7. Prevent duplicate requests.
8. Provide a safe route back.

The app must never delete backend records directly or claim completion before backend confirmation.

## Support and Issue Reporting

Expose only approved support workflows, such as help content, contacting support, technical issue reports, and listing/review reports.

Validate categories, descriptions, attachments, file types, and sizes. Avoid unnecessary sensitive data. Show submitted and pending states. Do not expose internal administrative notes.

## Local Cache and Security

Cache only safe, non-sensitive profile data. Mark cached data as potentially stale, refresh it when appropriate, and clear private data on logout, account switching, and relevant deletion states.

The app must use secure credential storage, avoid unnecessary personal-data logging, validate links and uploads, handle session expiry during updates, avoid exposing internal identifiers, use HTTPS outside local development, and never embed secrets in the bundle.

Prevent cross-account cache leakage. Client-side restrictions do not replace backend authorization.

## Accessibility

Provide accessible labels, logical focus order, screen-reader-friendly errors, adequate touch targets, keyboard-aware forms, unsaved-change indicators, destructive-action confirmations, and non-color-only status communication.

Avoid confusing consent controls or dark patterns.

## Analytics

Use only approved event names. Possible events include profile viewed, profile-edit started/completed, preference updated, communication preference changed, policy viewed, deletion flow started/submitted, and support request initiated.

Never send full profile payloads, phone numbers, sensitive preferences, support descriptions, identity documents, or credentials. Events must not be treated as proof of successful backend operations.

## Testing

Unit/component tests must cover field validation, dirty-state handling, error mapping, preference controls, destructive confirmations, account-state rendering, cache clearing, accessibility labels, and retry states.

Integration tests must cover profile retrieval/update, validation errors, stale updates, image-upload states, preference updates, account deletion, logout during requests, session expiry, and support submission.

End-to-end tests must verify that:

1. An authenticated user can view their profile.
2. Approved fields can be updated.
3. Backend validation errors map correctly.
4. Unsaved changes are not silently lost.
5. Preferences reflect server-confirmed values.
6. Privacy information is accessible.
7. Deletion requires approved confirmation.
8. Deletion is not falsely shown as complete.
9. Logout removes private access.
10. Private data does not leak between accounts on one device.

## Definition of Done

- Profile and preference APIs use the centralized typed client.
- Editable and read-only fields are clear.
- Server responses are authoritative.
- Conflicts and validation failures are handled safely.
- Temporary and persisted preferences are separated.
- Mandatory and optional communications are distinguished.
- Policy content comes from approved sources.
- Deletion is backend-confirmed.
- Private caches are cleared or updated correctly.
- Accessibility and destructive-action safeguards exist.
- Critical flows have automated tests.
- No duplicate privacy, retention, authorization, or deletion logic exists.

## AI IDE Instructions

1. Read the shared identity, profile, privacy, notification, security, retention, API-error, and authorization documents.
2. Inspect existing navigation, API client, secure storage, cache, form, and design-system utilities.
3. Confirm exact fields and preference categories before implementing.
4. Reuse shared API, validation, error, and authentication utilities.
5. Do not invent account states, legal wording, consent categories, or deletion outcomes.
6. Add tests for deletion, logout, stale updates, and cross-account cache isolation.
7. Do not implement broker, agency, or administrative profile management.
8. Record unresolved policy/API questions as blockers.

## Acceptance Criteria

1. Users can view approved profile information.
2. Users can edit only backend-permitted fields.
3. Validation errors are clear and correctly mapped.
4. Stale updates do not silently overwrite server data.
5. Approved image uploads follow the backend lifecycle.
6. Temporary filters are not silently persisted.
7. Communication controls respect mandatory versus optional messages.
8. Policy content comes from approved sources.
9. Account status is backend-confirmed.
10. Deletion uses the approved confirmation flow.
11. The app never claims deletion or consent completion without backend confirmation.
12. Private data is protected during logout and account switching.
13. Support forms use shared validation and error conventions.
14. Critical account-management flows have automated coverage.
15. Shared identity, privacy, authorization, validation, and observability contracts are reused.
16. No duplicate account-management or privacy logic exists in the User App.
