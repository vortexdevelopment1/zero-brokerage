# User App Blueprint — Step 7: Notifications, Activity, and Support

## 1. Purpose

Implement the User App experience for viewing notifications, tracking relevant account activity, opening actionable updates, and accessing approved support workflows.

The app must consume shared notification, event, authorization, and support contracts. It must not duplicate backend notification rules, delivery decisions, eligibility checks, or support-ticket business logic.

## 2. Scope

### Included

- Notification center
- Unread and read states
- Notification categories and filtering
- Notification detail and deep-link handling
- Mark-as-read and mark-all-as-read actions
- Relevant activity history exposed by the backend
- Empty, loading, offline, and error states
- Push-notification permission UX
- In-app support entry points
- Listing, visit, inquiry, payment, and account-related updates
- Analytics and accessibility behavior

### Excluded

- Notification delivery orchestration
- SMS, email, WhatsApp, or push-provider integration
- Backend event processing
- Administrative notification management
- Internal moderation or fraud notes
- Direct database access
- Client-side authorization decisions

## 3. Notification Model

Treat the backend response as authoritative. A notification may contain approved fields such as:

- Notification identifier
- Category
- Title
- Body or summary
- Read state
- Created timestamp
- Expiry timestamp, where supplied
- Related entity type and identifier
- Action metadata or deep-link information
- Priority or urgency indicator, where approved

Do not infer notification meaning from arbitrary text. Use typed category and action metadata supplied by the backend.

Never expose internal event names, queue identifiers, provider responses, private metadata, or administrative notes.

## 4. Notification Center

The notification center must support:

- Initial loading
- Paginated or cursor-based retrieval
- Pull-to-refresh or equivalent refresh behavior
- Unread count display
- Read/unread visual distinction
- Category filtering where supported
- Empty state
- Retry after failure
- Offline handling
- Safe duplicate-request prevention

If pagination is cursor-based, preserve and reuse the backend cursor contract. Do not fabricate page numbers or assume offset pagination.

When new notifications arrive, update the visible list without unexpectedly moving the user away from their current reading position.

## 5. Read-State Operations

For a single notification:

1. Confirm that the item is eligible for the operation.
2. Call the centralized API client.
3. Disable duplicate actions while the request is active.
4. Update the local state only after a successful response, unless the shared design explicitly permits safe optimistic behavior.
5. Reconcile the unread count with the server-confirmed result.

For mark-all-as-read:

- Require the backend-supported operation.
- Provide progress and failure feedback.
- Do not mark notifications as read permanently in local storage without server confirmation.
- Handle partial failure according to the API contract.

## 6. Notification Actions and Deep Links

A notification may open an approved destination, such as:

- Listing details
- Visit details
- Inquiry or communication thread
- Payment or transaction details
- Furniture order details
- Profile or account-security screen
- Support request

Deep-link handling must:

1. Validate the destination type and identifier.
2. Confirm that the destination is supported by the current app version.
3. Fetch current data from the backend.
4. Handle deleted, expired, restricted, or unavailable resources.
5. Respect authentication and authorization state.
6. Avoid passing sensitive payloads through navigation parameters.
7. Provide a safe fallback when the destination cannot be opened.

A notification must never grant access to a resource that the user could not otherwise access.

## 7. Notification Categories

Use only categories defined by the shared contract. Possible categories include:

- Account and security
- Listing updates
- Visit updates
- Inquiry or communication updates
- Payment and transaction updates
- Furniture marketplace updates
- Review or report updates
- Platform announcements

The final category list must be sourced from the approved API contract rather than invented in the client.

## 8. Push Permission UX

If push notifications are supported:

- Explain the value before requesting permission.
- Request permission through the platform-approved mechanism.
- Respect denial and restricted states.
- Provide a settings route when the platform requires users to change permission externally.
- Do not repeatedly prompt users after a permanent denial.
- Do not treat device permission as proof that backend communication consent exists.
- Keep device-token registration and removal inside shared authentication/notification contracts.

The app must gracefully support users who do not grant push permission.

## 9. Activity History

If the backend exposes user-visible activity history, display only approved activities, such as:

- Recent inquiries
- Scheduled or completed visits
- Saved-listing changes
- Payment or order updates
- Support-request status changes

Activity history is not a substitute for authoritative domain screens. When an activity is opened, fetch the current domain record instead of relying on stale activity payloads.

Handle missing, expired, restricted, and deleted activity targets safely.

## 10. Support Access

Provide approved entry points for:

- Help content
- Contacting support
- Reporting a technical problem
- Reporting a listing, broker, review, or communication issue
- Viewing support-request status where supported

Support forms must:

- Use approved categories
- Validate descriptions and attachments
- Enforce file-type and size limits
- Avoid unnecessary personal or sensitive data
- Prevent duplicate submissions
- Show submitted, pending, resolved, and failed states only when supplied by the backend
- Use the shared error format

Do not expose internal support notes, moderation decisions, or staff-only metadata.

## 11. Offline and Error Behavior

The app must distinguish among:

- No notifications exist
- Notifications are still loading
- The network is unavailable
- The request failed
- The session expired
- The account is restricted or unavailable

Cached notification data may be shown as stale where safe, but the UI must communicate that it may not be current.

Do not silently discard user actions. If a read-state operation fails, retain the correct pending/error state and provide a retry path.

## 12. State Management

Use the existing centralized client-state and server-state patterns.

Requirements:

- Keep notification data scoped to the authenticated account.
- Clear private notification data on logout and account switching.
- Avoid duplicate fetches caused by repeated screen mounts.
- Cancel or ignore stale requests when the active account changes.
- Keep unread counts consistent across the app.
- Avoid storing sensitive notification content in long-lived local storage unless explicitly approved.

Do not create a second API client, cache layer, event bus, or authentication mechanism.

## 13. Security and Privacy

The app must:

- Enforce authentication before accessing private notifications.
- Apply backend-provided authorization outcomes.
- Avoid exposing private notification content in logs.
- Avoid putting sensitive content into push-notification previews unless approved.
- Avoid using notification text as an authorization source.
- Validate deep links and related-resource identifiers.
- Protect account data during logout and account switching.
- Never embed provider secrets or backend credentials in the app.

## 14. Accessibility and UX

Provide:

- Screen-reader labels for read/unread state
- Accessible notification timestamps or relative-time alternatives
- Clear action labels
- Non-color-only read-state indicators
- Adequate touch targets
- Loading and error announcements where supported
- Confirmation or feedback for mark-as-read actions
- Understandable empty and unavailable states

Do not rely only on badges, color, or icons to communicate urgency or status.

## 15. Analytics

Use only approved analytics events. Potential events include:

- Notification center viewed
- Notification opened
- Notification marked as read
- All notifications marked as read
- Deep-link action attempted
- Deep-link action failed
- Support flow started
- Support request submitted
- Push-permission prompt shown
- Push permission result received

Do not transmit notification bodies, private support descriptions, phone numbers, payment details, or other sensitive payloads to analytics.

Analytics events are not proof of backend success; use server-confirmed outcomes for successful-operation events.

## 16. Testing Requirements

### Unit and component tests

Test:

- Notification rendering by category and state
- Read/unread presentation
- Pagination and refresh behavior
- Unread-count updates
- Deep-link validation
- Missing or unavailable destinations
- Push-permission state rendering
- Empty, offline, loading, and error states
- Account-scoped cache cleanup
- Accessibility labels

### Integration tests

Test:

- Notification retrieval
- Pagination or cursor continuation
- Single mark-as-read
- Mark-all-as-read
- Unread-count reconciliation
- Deep-link navigation with expired or restricted resources
- Session expiry during notification actions
- Push-token registration lifecycle where applicable
- Support-request submission
- Logout during an active request

### End-to-end tests

Verify that:

1. An authenticated user can open the notification center.
2. Unread notifications are visually distinguishable.
3. A notification can be opened safely.
4. Read-state changes are reflected after server confirmation.
5. Mark-all-as-read behaves correctly.
6. Invalid or unavailable deep links show a safe fallback.
7. Private notification data disappears after logout.
8. Support entry points are accessible.
9. Users can continue using the app without push permission.
10. Notification content is not leaked through logs or analytics.

## 17. Definition of Done

- Notification retrieval uses shared typed APIs.
- Pagination, refresh, unread counts, and read states work correctly.
- Deep links validate destinations and re-fetch authoritative domain data.
- Notification actions never bypass authorization.
- Push permission behavior respects platform and backend consent rules.
- Activity history does not replace authoritative domain records.
- Support workflows use shared validation and error conventions.
- Account-scoped cache cleanup is implemented.
- Offline and failure states are explicit and recoverable.
- Accessibility requirements are met.
- Critical notification and support journeys have automated tests.
- No notification delivery or domain business logic is duplicated in the app.

## 18. AI IDE Instructions

1. Read the shared notification, event, identity, authorization, support, analytics, and API-error contracts.
2. Inspect existing navigation, deep-link, API-client, cache, and state-management utilities.
3. Confirm the exact notification categories and action schema before implementation.
4. Reuse centralized authentication, networking, validation, error, analytics, and storage utilities.
5. Do not invent notification categories, action targets, support states, or legal consent behavior.
6. Keep notification data scoped to the active account.
7. Add tests for unread-count reconciliation, deep-link failures, logout cleanup, and permission denial.
8. Record unresolved API or product questions as explicit blockers.
9. Keep the app runnable after each logical implementation unit.

## 19. Acceptance Criteria

1. Users can view their authorized notifications.
2. Notification loading, pagination, refresh, empty, offline, and error states are handled.
3. Read-state actions use backend-confirmed results.
4. Unread counts remain consistent with server state.
5. Deep links validate targets and never bypass authorization.
6. Deleted, expired, or restricted resources produce safe fallback states.
7. Push permission denial does not break in-app notification access.
8. Activity history is clearly separated from authoritative domain records.
9. Support flows use approved categories, validation, and error handling.
10. Private notification data is cleared on logout and account switching.
11. Sensitive notification and support content is excluded from logs and analytics.
12. Accessibility requirements are implemented.
13. Critical notification and support flows have automated test coverage.
14. Shared backend contracts are reused without duplicating notification or support business logic.
