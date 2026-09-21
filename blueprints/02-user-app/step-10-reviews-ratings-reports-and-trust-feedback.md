# User App Blueprint — Step 10: Reviews, Ratings, Reports, and Trust Feedback

## 1. Purpose

This document defines the User App implementation contract for verified-visit reviews, listing feedback, rating displays, review editing and deletion, review reporting, and owner-response presentation.

The User App must consume the Shared Core Backend contracts for review eligibility, moderation, rating aggregation, trust signals, visits, listings, identity, authorization, notifications, analytics, and privacy. It must not implement review eligibility, moderation decisions, rating calculations, or trust-score logic locally.

---

## 2. Objectives

Implement user-facing experiences that allow eligible users to:

- Understand whether they are eligible to submit feedback.
- Submit an overall rating and approved category ratings.
- Add written feedback within contract-defined limits.
- View published reviews and rating summaries.
- Edit or delete their own reviews when permitted.
- See moderation or publication status where the backend allows it.
- Report inappropriate or inaccurate reviews.
- View authorized listing-owner responses.
- Understand verified-visit trust indicators.
- Receive safe feedback about rejected, pending, or unavailable actions.

The experience must be transparent without exposing private moderation notes, internal risk signals, or personal information about other users.

---

## 3. Scope

### 3.1 Included

- Review-eligibility presentation
- Review creation flow
- Overall star rating input
- Approved category-rating inputs
- Written feedback input
- Review preview and submission confirmation
- User's own review history
- Review editing and deletion where permitted
- Published review list and rating summary display
- Verified-visit trust indicators
- Review-report flow
- Listing-owner response display where supplied
- Loading, empty, pending, rejected, and error states
- Deep links from review-related notifications
- Accessibility, privacy, analytics, and automated tests

### 3.2 Excluded

Do not implement:

- Reviews without backend-confirmed eligibility
- Reviews based only on a lead, message, payment attempt, or uncompleted visit
- Client-side moderation decisions
- AI-generated reviews or automated legal/reputational decisions
- Local rating aggregation or trust-score calculations
- Public social feeds or arbitrary comments
- Editing another user's review
- Administrative moderation tools
- Direct database access
- Unapproved incentives for positive reviews

---

## 4. Review Eligibility

The backend is authoritative for review eligibility.

Eligibility may depend on:

- Authenticated user identity
- Relevant listing or property relationship
- Eligible verified visit
- Visit completion state
- Review window remaining open
- Existing review for the same eligible experience
- Listing or property validity
- Account state
- Abuse, rate-limit, or policy restrictions

The app must not infer eligibility from the existence of a listing, inquiry, lead, payment, or visit request.

The UI should render backend-provided eligibility states such as:

- Eligible
- Not yet eligible
- Already reviewed
- Review window expired
- Visit not completed
- Temporarily unavailable
- Restricted

Only display reasons that the backend explicitly marks as user-safe.

---

## 5. Review Creation Flow

The review flow must:

1. Start from an eligible visit, listing, or approved notification entry point.
2. Fetch current eligibility from the backend.
3. Load the approved review schema and rating categories.
4. Collect only permitted fields.
5. Validate required values locally.
6. Display clear rating and text constraints.
7. Prevent duplicate submissions.
8. Submit through the centralized typed API client.
9. Display the backend-confirmed state.
10. Refresh the relevant review and rating data when appropriate.

The app must not show a review as publicly published merely because submission succeeded.

Possible server-confirmed states may include:

- Submitted
- Pending moderation
- Published
- Rejected
- Withdrawn
- Deleted
- Unavailable

Render only states defined by the shared API contract.

---

## 6. Rating Input

If the backend supports category ratings, the app must render the categories supplied by the API rather than hardcoding them.

For each rating field:

- Display the approved label.
- Enforce the server-defined range.
- Provide an accessible textual alternative to star controls.
- Explain whether the rating is required.
- Preserve the user's draft while navigating within the flow.
- Prevent invalid or fractional values unless explicitly supported.

Do not calculate an overall rating from category ratings in the client. If an overall rating is required, collect it according to the backend contract.

The app must not describe a rating as verified unless the backend provides the relevant trust indicator.

---

## 7. Written Feedback

The written-review field must follow backend-provided rules for:

- Minimum and maximum length
- Allowed content
- Required status
- Character handling
- Attachment support, if any
- Profanity or content restrictions communicated to the user

The UI should provide:

- A visible character counter where useful
- Clear validation messages
- Draft preservation during recoverable failures
- A review-before-submit state for consequential actions

Do not promise that client-side filtering guarantees publication. Backend moderation remains authoritative.

Avoid collecting unnecessary personal information in review text. Warn users not to include phone numbers, addresses, identity documents, payment details, or other private data when appropriate.

---

## 8. Review Submission and Idempotency

The app must:

- Disable repeated submission while a request is active.
- Use the backend-supported idempotency mechanism when required.
- Preserve a safe local reference to an in-progress submission.
- Recover the submission state after interruption where practical.
- Avoid automatically resubmitting an uncertain request without checking its server state.
- Display pending status when the result is unknown.

A timeout must not be interpreted as a failed submission. The app should refresh the review status before allowing another attempt.

---

## 9. Published Reviews and Rating Summaries

The review display may include backend-approved information such as:

- Overall rating summary
- Approved category-rating summaries
- Published review text
- Publication date
- Edited indicator
- Verified-visit indicator
- Public display name or approved profile representation
- Listing-owner response
- Pagination metadata

The app must:

- Use server-provided aggregates.
- Display the review count supplied by the backend.
- Handle pagination and incremental loading safely.
- Distinguish published content from pending or rejected content.
- Avoid exposing private reviewer details.
- Handle deleted, withdrawn, or unavailable reviews gracefully.

Do not recompute averages, review counts, trust scores, or ranking values on the client.

---

## 10. User's Review Management

Users may manage only their own reviews and only within backend-defined policy.

For editing:

1. Fetch the current review state.
2. Confirm that editing is permitted.
3. Load the current server version.
4. Allow only approved fields to be changed.
5. Submit through the shared API.
6. Display the server-confirmed result.
7. Refresh the published or pending representation.

For deletion or withdrawal:

- Explain the consequence clearly.
- Require an explicit confirmation.
- Submit the request to the backend.
- Do not remove the review from authoritative state locally before confirmation.
- Handle pending, rejected, and completed outcomes.

If a conflict or stale-version response occurs, refresh the authoritative review and avoid silently overwriting changes.

---

## 11. Review Reporting

Provide a report action only where the backend and product contract allow it.

Approved report categories may include categories such as:

- Inappropriate content
- Spam or manipulation
- Personal information exposure
- Misleading or inaccurate content
- Harassment or abuse
- Other approved category

The exact category list must come from the shared contract.

The report flow must:

1. Identify the target using a safe public reference.
2. Display the approved report categories.
3. Collect only necessary additional context.
4. Validate the input.
5. Prevent duplicate report submissions.
6. Submit through the centralized API client.
7. Display a server-confirmed submission state.

Do not reveal whether a report caused moderation action or expose internal moderation decisions.

---

## 12. Listing-Owner Responses

Where the backend supplies an authorized owner response, the User App may display it alongside the relevant published review.

The app must:

- Clearly distinguish the original review from the response.
- Display only backend-approved response content and metadata.
- Handle edited, removed, or unavailable responses.
- Avoid allowing the reviewer to edit the owner's response.
- Avoid implying that an owner response changes the original rating.

The app must not implement owner-response authorization or moderation rules locally.

---

## 13. Notifications and Deep Links

Review-related notifications may direct users to:

- A review request
- A submitted review
- A pending moderation state
- A published review
- A review rejection or correction request
- A review report status, where supported
- An owner response

Deep links must:

- Require authentication for private review-management actions.
- Resolve the target through safe identifiers.
- Refresh the backend state before displaying sensitive or mutable data.
- Handle expired, deleted, or invalid targets safely.
- Avoid placing private review text or personal data in URLs.

A notification must not be treated as the authoritative source of review state.

---

## 14. Privacy, Safety, and Trust

The app must:

- Display only public review information approved by the backend.
- Avoid exposing phone numbers, addresses, identity data, or private visit details.
- Avoid displaying internal moderation, fraud, or risk indicators.
- Keep draft reviews out of analytics and logs.
- Avoid using review text as an analytics payload.
- Explain verified-visit indicators accurately.
- Avoid encouraging users to submit positive or misleading reviews.
- Provide safe handling for abusive or sensitive content.
- Clear private review drafts when the account is changed or logged out, unless explicitly designed for safe recovery.

Client-side hiding or disabling of a report/review action is not a security control.

---

## 15. Analytics and Telemetry

Use only approved analytics event names and send minimal metadata.

Potential events include:

- Review eligibility viewed
- Review flow started
- Rating draft started
- Review submitted
- Review status viewed
- Review edited
- Review deletion requested
- Review reported
- Published review opened
- Owner response viewed

Do not send:

- Full review text
- Private visit details
- Personal contact information
- Sensitive report descriptions
- Identity documents
- Internal moderation data

Client events must not be treated as proof that a review was published, deleted, or moderated. Use backend-confirmed outcomes for authoritative reporting.

---

## 16. Error and Empty States

Handle cases such as:

- Review eligibility expired
- Already reviewed
- Visit not eligible
- Review window closed
- Review rejected by validation
- Review pending moderation
- Duplicate submission
- Review unavailable or deleted
- Report already submitted
- Rate limit exceeded
- Session expired
- Temporary service outage
- Permission denied

Use shared machine-readable error codes and safe user-facing messages.

For uncertain outcomes:

- Preserve a safe local reference where appropriate.
- Refresh the backend state.
- Avoid automatic duplicate submission.
- Provide a retry or support route.
- Never expose raw backend or moderation errors.

---

## 17. Accessibility and UX Requirements

Provide:

- Accessible labels for star and category-rating controls
- A non-visual alternative to rating symbols
- Clear field-level validation
- Logical focus order
- Screen-reader announcements for submission states
- Adequate touch targets
- Confirmation before deletion or withdrawal
- Clear distinction between pending and published content
- Non-color-only status communication
- Readable review text and response hierarchy

Avoid manipulative prompts, misleading review counts, or UI patterns that pressure users to provide favorable feedback.

---

## 18. Testing Requirements

### 18.1 Unit and Component Tests

Test:

- Eligibility-state rendering
- Rating input validation
- Character limits
- Draft and dirty-state handling
- Review-state rendering
- Error-code mapping
- Duplicate-submit prevention
- Delete confirmation
- Report-category rendering
- Accessibility labels
- Pagination and empty states

### 18.2 Integration Tests

Test:

- Eligibility retrieval
- Review creation
- Pending moderation state
- Duplicate submission handling
- Review editing
- Stale-version conflict handling
- Review deletion or withdrawal
- Published review retrieval
- Rating-summary display
- Review reporting
- Owner-response display
- Session expiry during submission
- Notification deep-link resolution

### 18.3 End-to-End Tests

At minimum:

1. An eligible user can open the review flow.
2. An ineligible user cannot submit a review.
3. The rating form uses backend-provided categories and constraints.
4. A submitted review is not shown as published without backend confirmation.
5. Duplicate submission attempts are handled safely.
6. A user can view their own review status.
7. A user can edit their own review when permitted.
8. Review deletion requires explicit confirmation.
9. Published rating summaries match backend-provided values.
10. A user can report an eligible review through approved categories.
11. Owner responses are clearly separated from original reviews.
12. Private review data is not exposed through deep links or analytics.
13. Logout and account switching clear private review drafts and state.

---

## 19. Definition of Done

This step is complete when:

- Review eligibility comes from the shared backend.
- Only verified-visit-eligible users can enter the approved submission flow.
- Rating categories and constraints are API-driven.
- Review submission uses shared validation and idempotency conventions.
- Pending, published, rejected, deleted, and unavailable states are handled clearly.
- Rating summaries and counts are displayed from backend-provided values.
- Users can manage only their own reviews within policy.
- Review reporting uses approved categories and secure submission behavior.
- Owner responses are displayed distinctly and safely.
- Private review content is excluded from logs and analytics.
- Critical review journeys have automated tests.
- No eligibility, moderation, rating aggregation, or trust-score logic is duplicated in the User App.

---

## 20. AI IDE Instructions

1. Read the Shared Core Backend listing, visit, review, rating, trust-signal, identity, authorization, notification, privacy, analytics, and error contracts before implementation.
2. Inspect existing navigation, API client, query/cache layer, form components, secure storage, deep-link handling, and design-system utilities.
3. Confirm the exact eligibility, review, rating, report, and owner-response schemas before building screens.
4. Reuse centralized API, validation, error, analytics, and authentication utilities.
5. Do not invent review categories, moderation states, trust badges, rating formulas, or legal wording.
6. Treat backend-confirmed state as the source of truth.
7. Add tests for ineligible users, duplicate submissions, stale updates, pending moderation, reporting, and account switching.
8. Keep review text, report details, and private visit data out of logs, analytics, URLs, and crash reports.
9. Do not implement administrative moderation tools or backend rating calculations.
10. Record unresolved policy or API questions as explicit blockers.
11. Keep the app runnable after each logical implementation unit.

---

## 21. Acceptance Criteria

1. Review eligibility is fetched from the backend.
2. Users cannot submit reviews solely because they viewed a listing, sent an inquiry, or requested a visit.
3. Only eligible verified-visit experiences can enter the approved review flow.
4. Rating categories and validation constraints come from shared contracts.
5. Review submission prevents duplicate attempts and handles uncertain outcomes safely.
6. Pending reviews are not presented as publicly published.
7. Users can edit or delete only their own reviews when the backend permits it.
8. Rating summaries and counts are displayed from server-provided values.
9. Review reports use approved categories and backend-confirmed submission states.
10. Owner responses are visually and semantically distinct from original reviews.
11. Private review and report data is protected from logs, analytics, and URLs.
12. Critical review, rating, and reporting journeys have automated test coverage.
13. Shared listing, visit, identity, authorization, validation, notification, and observability contracts are reused.
14. No review eligibility, moderation, aggregation, or trust-signal logic is duplicated in the User App.
