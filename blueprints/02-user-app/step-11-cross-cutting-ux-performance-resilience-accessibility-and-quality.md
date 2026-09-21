# User App Blueprint — Step 11: Cross-Cutting UX, Performance, Resilience, Accessibility, and Quality

## 1. Purpose

This step defines the cross-cutting quality requirements that must be applied across the entire Zero Brokerage User App before final integration and release. It strengthens the flows covered in User App Blueprint Steps 1–10 and does not introduce a new business domain.

The implementation must consume the Shared Core Backend contracts and finalized project decisions. It must not duplicate backend authorization, ownership, payment verification, entitlement calculation, listing moderation, lead ownership, visit transitions, retention, or financial logic.

## 2. Required Source Review

Before implementation, the AI IDE must review:

1. The approved BRD.
2. The approved SOW.
3. All finalized Zero Brokerage architecture and business decisions.
4. Shared Core Backend Blueprint Steps 1–12.
5. User App Blueprint Steps 1–10.
6. Repository documentation under `docs/`.
7. Existing User App code and shared packages.

Decision precedence is: finalized critical decisions, BRD, SOW, detailed blueprints, repository documentation, and routine implementation decisions. Conflicts must be recorded as blockers rather than silently resolved.

## 3. Objectives

The User App must provide:

- Consistent loading, empty, pending, success, and error experiences.
- Fast and responsive rendering.
- Safe recovery from unreliable networks.
- Secure session, cache, and account-switch behavior.
- Reliable navigation and deep links.
- Accessible controls, forms, dialogs, lists, and status messages.
- Actionable diagnostics without leaking personal or financial data.
- Automated quality gates and regression coverage for critical journeys.
- A release candidate that can be validated against current backend contracts.

## 4. Cross-Cutting UX States

Every applicable screen must handle:

- Initial loading
- Refreshing
- Paginated loading
- Empty results
- Partial content
- Offline or network-unavailable state
- Authentication required
- Permission denied
- Resource unavailable
- Validation failure
- Rate limiting
- Temporary service failure
- Pending backend operation
- Successful completion
- Retryable and non-retryable failures

Each state must have clear text, an appropriate visual treatment, an accessible alternative, and a safe next action. Do not use an indefinite spinner without context or an escape route. Never show success before backend confirmation.

## 5. Design-System Consistency

Reuse centralized primitives for typography, semantic colors, spacing, buttons, inputs, cards, dialogs, bottom sheets, banners, toasts, empty states, skeletons, errors, badges, image placeholders, and navigation elements.

Status colors must not be the only communication method. New reusable components require typed props, documented responsibility, accessibility behavior, appropriate loading/error behavior, and tests. Avoid one-off components when an approved shared component exists.

## 6. Navigation and Deep Links

Navigation must:

- Use centralized route definitions.
- Prefer stable resource identifiers instead of passing full objects.
- Never place sensitive data in route parameters.
- Validate route parameters before fetching data.
- Protect private routes with authentication.
- Handle cold-start, warm-start, and resumed-state deep links.
- Avoid duplicate screens caused by repeated notification taps.
- Preserve safe navigation context after login where appropriate.
- Revalidate private resources before rendering sensitive content.

A deep link is not proof of ownership, payment success, visit confirmation, entitlement, or authorization.

## 7. Centralized Request Management

Use one request layer for:

- Environment-specific base URLs
- Authentication integration
- Correlation/request identifiers where supported
- Timeouts
- Error normalization
- Cancellation
- Operation-aware retries
- Request deduplication where appropriate
- Safe response parsing
- Redacted logging
- Session-expiry handling

Safe read operations may be retried for transient failures. Sensitive operations such as payments, deletion, bookings, visit cancellation, subscription changes, and other state-changing actions must not be blindly retried. A timeout does not prove that an operation failed; refresh authoritative state before allowing a potentially duplicate action.

Cancellation of a client request must not be represented as cancellation of the backend operation.

## 8. Server State and Cache Strategy

The selected data-fetching approach must define:

- Server-state ownership
- Cache-key conventions
- Stale-time and refetch rules
- Pagination behavior
- Mutation invalidation
- Optimistic-update policy
- Rollback behavior
- Logout cleanup
- Account-switch cleanup
- Offline behavior

Rules:

- Server-confirmed data is authoritative.
- Private cache keys must be scoped correctly to the authenticated account.
- Sensitive responses must not be persisted without explicit justification.
- Cached listings and search results are potentially stale.
- Payment states, entitlements, visits, account states, and other critical resources require deliberate refresh rules.
- Do not use stale cache data to authorize sensitive actions.
- Optimistic updates are restricted to low-risk interactions with reliable rollback.
- Do not optimistically confirm payments, subscriptions, deletions, visit confirmations/cancellations, financial outcomes, or entitlement changes.

Cross-account cache isolation must be explicitly tested.

## 9. Offline and Degraded-Network Behavior

The app must:

- Show a clear connectivity state.
- Preserve only safe, non-sensitive drafts where useful.
- Make cached content's possible staleness understandable.
- Offer retry actions.
- Revalidate important resources after connectivity returns.
- Avoid presenting stale information as current.
- Avoid queuing sensitive financial or business operations without an explicitly approved design.
- Never confirm payments, visits, cancellations, subscriptions, or deletions while offline.

Any future offline write queue requires an explicit design covering idempotency, ordering, expiry, conflicts, security, and user visibility.

## 10. Performance Requirements

Optimize using profiling rather than assumptions. Address:

- App startup and first meaningful screen
- Navigation responsiveness
- Unnecessary re-renders
- Main-thread blocking work
- Memory usage
- Image loading
- List rendering
- Search interaction latency
- Pagination and request cancellation

For large lists, use virtualization, stable keys, backend-supported pagination, debounced search where appropriate, and cancellation of superseded searches. Do not load all results into memory.

For images, use approved transformations and appropriate sizes, placeholders, failure states, and consistent aspect ratios. Do not expose private image URLs in logs.

Track only approved technical metrics such as startup duration, screen-render duration, client-observed API latency, error rate, crash-free sessions, search latency, and image-load failures. Avoid unnecessary personal data in telemetry.

## 11. Accessibility

Provide:

- Meaningful accessibility labels and hints
- Logical focus order
- Screen-reader-readable headings
- Correct grouping of controls
- Accessible validation messages
- Adequate touch targets
- Sufficient contrast
- Non-color-only status communication
- Dynamic text-size support where practical
- Keyboard-aware forms
- Accessible loading and completion announcements
- Accessible dialogs and bottom sheets
- Clear labels for icon actions
- Reduced-motion consideration where supported

Test critical journeys with available platform accessibility tools. Decorative images must not be exposed as meaningful content.

## 12. Security-Aware Client Behavior

The app must:

- Keep secrets out of the client bundle.
- Use secure credential and session storage.
- Never log tokens, OTPs, payment details, identity documents, or private messages.
- Redact personal data from crash reports where possible.
- Avoid sensitive data in URLs and navigation parameters.
- Clear private caches on logout and account switching.
- Handle revoked and expired sessions safely.
- Avoid exposing stack traces or provider diagnostics.
- Validate remote configuration and external links.
- Use HTTPS outside local development.
- Request only necessary device permissions.

Client validation improves usability but never replaces backend validation or authorization.

## 13. Error and Recovery UX

Use shared error categories and machine-readable codes. Distinguish invalid input, authentication required, permission denied, unavailable resources, rate limiting, temporary outage, pending operation, unknown result, and unsupported action.

For recoverable errors, explain the problem, offer a relevant next step, and preserve safe input where practical.

For unknown outcomes involving payments, visits, cancellations, deletion, subscriptions, or other sensitive actions, do not immediately encourage repetition. Refresh backend state and show a pending or verification state when appropriate.

## 14. App Lifecycle and Session Handling

Handle cold start, backgrounding, foregrounding, network changes, session expiry, process termination, device-time changes, app upgrades, account switching, and logout from another device where supported.

On foregrounding, refresh resources whose state may have materially changed, revalidate sensitive screens, reconcile pending operations, and avoid unnecessary duplicate requests.

Device time must not replace server-defined business time for visits, payments, subscriptions, or other domain workflows.

## 15. Analytics and Observability

Use centralized analytics and observability conventions. Client events must:

- Use approved names and schemas.
- Avoid unnecessary personal information.
- Never contain credentials, identity documents, payment details, or private message contents.
- Distinguish attempted actions from backend-confirmed outcomes.
- Respect consent and privacy requirements.
- Avoid duplicate emission caused by re-renders or repeated navigation.

Sanitized technical context may include app version, platform, environment, screen/feature identifier, correlation ID, and error code where approved.

Client analytics is not authoritative for financial, legal, security, or business-state reporting.

## 16. Quality and Testing Strategy

Use repository-defined scripts for:

- Type checking
- Linting
- Formatting
- Unit tests
- Component tests
- Integration tests
- End-to-end tests
- Dependency and security checks where configured

Regression coverage must include:

- Authentication, logout, and account switching
- Profile updates
- Search and listing browsing
- Favorites
- Visits and cancellations
- Inquiries and user-visible lead status
- Notifications and deep links
- Furniture browsing and orders
- Payments, subscriptions, and entitlements
- Reviews and reports
- Support flows
- Error recovery
- Cache isolation

Contract validation must confirm that the app uses current API schemas, documented response states, documented error codes, correct authorization scopes, and proper pagination behavior. Do not rely on undocumented fields or hardcode server-owned values.

## 17. Device and Environment Validation

Validate supported combinations from the release plan, including representative operating-system versions, screen sizes, slow and unstable networks, offline transitions, fresh installs, upgrades, denied permissions, lifecycle transitions, low-memory conditions where practical, and account switching on a shared device.

Do not claim support for unvalidated devices or operating-system versions.

## 18. Release Configuration

Separate development, testing/staging, and production configuration. Client configuration may contain only safe non-secret values.

Verify API base URLs, app identifiers, deep-link configuration, analytics and error-reporting environments, feature-flag environments, production logging restrictions, release build settings, and version/build-number management.

Secrets must remain in approved secure deployment systems.

## 19. Feature Flags and Rollout Safety

For every feature flag, define purpose, owner, safe default, rollout behavior, and removal plan. Disabled features must not remain reachable through stale navigation or deep links. Feature flags are not authorization controls.

High-risk features should support controlled rollout and rollback when required by the release plan.

## 20. Documentation and Handover

Maintain:

- Setup and run instructions
- Environment configuration notes
- Build instructions
- Supported-platform notes
- Navigation map
- API dependency list
- Shared-component usage notes
- Known limitations
- Test instructions
- Release checklist
- Troubleshooting notes
- Open blockers and API questions

Documentation must describe actual implemented behavior.

## 21. Definition of Done

This step is complete when:

- Common loading, empty, error, pending, and retry states are consistent.
- Shared UI primitives are reused.
- Navigation and deep links are safe and reliable.
- Request handling is centralized and operation-aware.
- Cache ownership and invalidation rules are documented.
- Cross-account leakage risks are tested.
- Offline behavior is explicit and safe.
- Critical screens meet agreed performance expectations.
- Accessibility checks cover critical journeys.
- Sensitive data is excluded from logs and analytics.
- Static checks and automated tests pass under repository standards.
- Supported devices and lifecycle transitions are validated.
- Environment configuration is separated.
- Limitations and blockers are documented.
- No new business logic is duplicated in the User App.

## 22. AI IDE Instructions

1. Read Shared Core Backend Blueprint Steps 1–12 and User App Blueprint Steps 1–10 before changing code.
2. Inspect existing navigation, API, state, cache, design-system, analytics, error, and test infrastructure.
3. Improve shared utilities instead of creating feature-specific duplicates.
4. Do not introduce new business-domain behavior in this step.
5. Profile performance before applying complex optimizations.
6. Do not add blanket retries for sensitive operations.
7. Treat payment, visit, cancellation, deletion, subscription, and entitlement states as backend-authoritative.
8. Add tests for cache isolation, session expiry, deep links, retry safety, and pending operations.
9. Test critical journeys with accessibility tools.
10. Keep secrets and sensitive data out of logs, analytics, URLs, and crash reports.
11. Use repository-defined scripts and conventions.
12. Record unresolved API, product, legal, accessibility, or release questions as blockers.
13. Keep the app runnable after each logical implementation unit.

## 23. Acceptance Criteria

1. Major screens support clear loading, empty, error, pending, and retry states.
2. Shared design-system components are reused consistently.
3. Private routes and deep links enforce authentication and current authorization.
4. Sensitive data is not passed through unsafe navigation parameters.
5. Retries are operation-aware and cannot create duplicate sensitive operations.
6. Cache keys, invalidation, logout cleanup, and account-switch behavior are defined and tested.
7. Offline behavior never falsely confirms payments, visits, cancellations, subscriptions, or deletions.
8. Large lists and search results use pagination and appropriate virtualization.
9. Critical screens have measurable performance behavior.
10. Accessibility labels, focus order, touch targets, and status communication are implemented.
11. Logs, analytics, and crash reports avoid unnecessary personal or financial data.
12. Session expiry and lifecycle transitions are handled safely.
13. Static checks and critical tests run successfully using repository conventions.
14. Supported device and environment combinations are documented and validated.
15. Production configuration does not expose secrets.
16. Known limitations, blockers, and API dependencies are documented.
17. No duplicate backend business or authorization logic is introduced.
