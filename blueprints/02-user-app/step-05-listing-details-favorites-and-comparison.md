# User App Blueprint — Step 5: Listing Details, Favorites, and Comparison

## 1. Purpose

Implement the User App experience for viewing complete property listing details, saving listings, managing favorites, and comparing suitable listings where the approved product scope supports comparison.

The app must consume the shared listings, media, verification, search, trust-signal, favorites, and authorization contracts. It must not duplicate listing business rules or infer listing availability, verification, ownership, or publication status locally.

## 2. Objectives

Implement:

- Listing-detail screen
- Image and media gallery
- Property facts and amenities
- Listing availability and status presentation
- Verification and trust indicators
- Location presentation using approved privacy rules
- Broker/agency attribution where permitted
- Favorite/save functionality
- Favorite-list management
- Optional listing comparison flow
- Share and report entry points where approved
- Loading, error, empty, and unavailable states
- Accessibility and analytics
- Automated tests for critical journeys

## 3. Scope Boundaries

### Included

- Navigation from search results to listing details
- Server-driven listing detail rendering
- Media gallery and full-screen media viewer
- Property information sections
- Pricing and approved commercial details
- Amenities and furnishing information
- Location and map preview where supported
- Verification and trust signals
- Save/unsave behavior
- Favorites collection
- Comparison selection and comparison view, if enabled
- Listing reporting and support entry points
- Deep-link and share handling using approved routes

### Excluded

- Listing creation or editing
- Listing approval or moderation
- Broker verification
- Direct database access
- Client-side publication decisions
- Client-side price or availability calculations
- Unauthorized exposure of owner contact information
- Independent ranking or trust-score logic

## 4. Listing Detail Data Contract

The backend is authoritative for all listing data. Render only fields included in the approved response contract.

The UI must distinguish between:

- Published versus unavailable listings
- Verified versus unverified attributes
- Exact versus approximate location
- Current versus historical pricing
- Included versus optional charges
- Available versus unavailable amenities
- Broker-owned versus agency-owned attribution
- Public versus restricted contact information

Do not invent missing values. Use explicit unavailable states rather than misleading placeholders such as zero, false, or “free.”

## 5. Detail Screen Structure

The screen should be composed from reusable sections where applicable:

1. Header and navigation controls
2. Image/media gallery
3. Listing title and high-level summary
4. Price and commercial terms
5. Key property facts
6. Verification and trust indicators
7. Amenities and furnishing details
8. Description
9. Location/map section
10. Availability or listing-status information
11. Broker/agency information permitted for the user
12. Primary actions, such as inquiry or visit request
13. Save/favorite action
14. Share and report actions where approved
15. Related or similar listings when returned by the backend

The exact ordering may follow the approved UX design, but data meaning and permissions must remain unchanged.

## 6. Media Gallery

If media is provided:

- Preserve the backend-provided ordering unless the contract says otherwise.
- Support loading, failed-image, and missing-media states.
- Use safe image URLs and approved image components.
- Avoid exposing private or temporary URLs beyond their intended lifetime.
- Support accessible labels and meaningful descriptions.
- Prevent accidental navigation conflicts between gallery gestures and screen navigation.
- Avoid downloading all media unnecessarily.
- Handle slow networks and partial media failure gracefully.

If a media item is marked restricted, pending, rejected, or unavailable, do not display it as public content.

## 7. Pricing and Commercial Information

Display only backend-confirmed values and labels for:

- Sale price
- Monthly rent
- Security deposit
- Maintenance charges
- One-time fees
- Recurring fees
- Furniture-related charges where applicable
- Other approved commercial terms

Do not calculate taxes, discounts, commissions, deposits, or totals in the client unless the shared contract explicitly defines the calculation as a presentation-only operation.

Where a value is approximate, estimated, negotiable, or subject to confirmation, show the backend-provided qualifier clearly.

Never represent an unavailable price as zero.

## 8. Verification and Trust Signals

Render verification indicators only from explicit backend fields. Possible signals may include:

- Verified listing
- Verified owner or broker information
- Verified property details
- Verified visit or closure-related trust signals
- Review and rating summaries

The app must not derive its own verification badge, ranking, quality score, or fraud assessment.

If a trust signal is unavailable or expired, show the approved neutral state rather than silently retaining stale trust information.

## 9. Location and Privacy

Location presentation must follow the listing privacy contract.

The UI may display:

- Approved locality or neighborhood
- Approximate map position
- Exact address only when explicitly permitted
- Nearby landmarks supplied by the backend

Do not reveal exact coordinates or private addresses merely because they are present in an API payload. Use the approved display-level field.

Map interactions must not bypass server-side privacy restrictions.

## 10. Broker and Agency Attribution

Show broker or agency information only when the backend authorizes it for the current user and listing state.

Possible information includes:

- Display name
- Public profile image
- Agency name
- Approved trust indicators
- Public contact or inquiry action
- Response information, if explicitly supplied

Do not expose private phone numbers, internal IDs, verification documents, or internal performance information.

Respect the finalized hybrid lead-ownership model. The User App should initiate approved inquiry or visit workflows rather than assigning ownership locally.

## 11. Favorite and Save Behavior

### 11.1 Save/Unsave

The favorite action must:

1. Reflect the server-confirmed saved state.
2. Prevent duplicate requests during an in-flight operation.
3. Handle authentication requirements clearly.
4. Reconcile the UI after success or failure.
5. Support retry after recoverable failures.
6. Avoid silently losing a save action.

If a guest user selects save, use the approved authentication prompt and preserve the intended action only if the security and product contracts permit it.

### 11.2 Favorites Collection

The favorites screen must support:

- Loading and pagination where required
- Empty state
- Pull-to-refresh or equivalent refresh behavior
- Removal of a saved listing
- Listing-unavailable state
- Listing-expired or unpublished state
- Retry behavior
- Navigation back to listing details

A listing removed from publication must not be presented as currently available. The UI may show a historical or unavailable state only when the backend supplies the necessary information.

## 12. Comparison Flow

If comparison is enabled by the approved product scope:

- Define a maximum number of selected listings from the product contract.
- Prevent incompatible listing types from being compared if the backend disallows them.
- Keep comparison selection local until the user confirms the action, unless persistence is explicitly required.
- Show comparable fields side by side.
- Clearly mark missing or non-comparable values.
- Avoid presenting a subjective “best” listing or ranking unless explicitly defined by product requirements.
- Remove unavailable listings from active comparison and explain why.

Do not calculate an independent recommendation score in the app.

## 13. Share and Deep Links

Where supported:

- Use canonical, approved listing URLs or deep-link payloads.
- Do not place private contact information in share content.
- Handle deleted, expired, restricted, and unavailable listings safely.
- Validate incoming listing identifiers through the backend.
- Avoid trusting client-provided listing status.

A shared link must not grant access to private listing data.

## 14. Report and Support Actions

Provide report actions only through approved workflows.

A report flow should:

- Offer backend-defined categories
- Validate optional descriptions and attachments
- Avoid collecting unnecessary sensitive information
- Prevent duplicate submissions
- Display submission and pending states
- Use the shared error format
- Return the user to a safe screen after completion

Do not expose internal moderation outcomes or administrative notes.

## 15. API and State Management

Use the centralized API client, query/cache layer, validation utilities, and error mapper.

Recommended client state separation:

- Server state: listing details, favorite state, review summary, availability, related listings
- Local UI state: gallery index, expanded sections, comparison selection, modal visibility
- Navigation state: route parameters and deep-link state
- Session state: authenticated user and session status

Do not store complete listing payloads in navigation parameters. Pass stable identifiers and load authoritative data through the API layer.

Invalidate or refresh relevant caches after:

- Save/unsave success
- Listing-status changes
- Report submission where the contract requires it
- Account changes
- Session changes

## 16. Loading, Error, and Unavailable States

Implement explicit states for:

- Initial loading
- Partial media loading
- Listing not found
- Listing unpublished
- Listing expired
- Listing restricted
- Unauthorized access
- Network failure
- Rate limiting
- Service degradation
- Save failure
- Report failure

Error messages must be user-safe and mapped from the shared error contract. Do not expose stack traces, SQL errors, internal IDs, or moderation details.

## 17. Security and Privacy

The app must:

- Enforce authentication for private actions.
- Avoid exposing private listing or owner data.
- Use secure handling for deep links and share actions.
- Avoid logging complete listing payloads if they contain personal information.
- Avoid sending private location or contact data to analytics.
- Respect backend authorization for contact, inquiry, and visit actions.
- Never trust client-side availability or publication state.
- Use HTTPS outside local development.
- Keep provider secrets out of the mobile bundle.

## 18. Accessibility and UX

Provide:

- Accessible labels for gallery controls and favorite buttons
- Screen-reader-friendly property summaries
- Logical focus order
- Adequate touch targets
- Non-color-only trust and availability indicators
- Clear labels for recurring and one-time charges
- Readable empty and unavailable states
- Confirmation for destructive actions where appropriate
- Accessible map alternatives when maps are unavailable

## 19. Analytics

Use only approved analytics events, such as:

- Listing viewed
- Gallery opened
- Media item viewed
- Listing saved
- Listing unsaved
- Favorites opened
- Comparison started
- Comparison completed
- Share initiated
- Listing report initiated/submitted
- Inquiry or visit action initiated

Do not send private phone numbers, exact private addresses, raw coordinates, personal messages, or complete API payloads.

Analytics events are not proof of backend success. Record successful operations only from confirmed responses or approved server-side events.

## 20. Testing Requirements

### Unit and Component Tests

Test:

- Rendering of optional and missing fields
- Price and fee labels
- Verification-state rendering
- Favorite button states
- Save failure and retry behavior
- Gallery loading and failure states
- Comparison selection limits
- Unavailable listing states
- Accessibility labels
- Report-form validation

### Integration Tests

Test:

- Listing-detail retrieval
- Pagination or related-listing retrieval
- Save and unsave operations
- Authentication-required favorite action
- Listing-unavailable responses
- Restricted location rendering
- Report submission
- Cache invalidation after save/unsave
- Session expiry during an action
- Deep-link resolution

### End-to-End Tests

At minimum:

1. A user can open a listing from search results.
2. Listing details render using server-provided data.
3. Media failures do not break the detail screen.
4. A user can save and unsave a listing.
5. Guest save attempts follow the approved authentication flow.
6. Favorites show empty, loading, and unavailable states correctly.
7. Restricted location information is not exposed.
8. An unavailable listing is not shown as currently active.
9. A user can report a listing through the approved workflow.
10. Deep links resolve safely and do not bypass authorization.

## 21. Definition of Done

- Listing details use shared typed APIs.
- Server-confirmed data controls availability, verification, pricing, and permissions.
- Media, pricing, location, and attribution follow privacy rules.
- Favorite operations handle authentication, retries, and cache consistency.
- Favorites handle expired and unavailable listings.
- Comparison, if enabled, has explicit limits and no invented ranking.
- Share and report flows use approved contracts.
- Accessibility and safe error states are implemented.
- Critical listing and favorite journeys have automated tests.
- No duplicate listing, verification, pricing, ranking, or authorization logic exists in the User App.

## 22. AI IDE Instructions

1. Read the shared listing, media, search, trust-signal, favorite, authorization, API-error, and privacy contracts.
2. Inspect existing navigation, query/cache, API, design-system, and analytics utilities.
3. Confirm the exact listing-detail response fields before building UI sections.
4. Reuse shared formatters and error handling.
5. Do not invent pricing calculations, verification badges, ranking logic, or publication states.
6. Keep private data out of navigation parameters, logs, and analytics.
7. Implement favorite operations using server-confirmed state.
8. Add tests for unavailable listings, guest save behavior, cache invalidation, and restricted location data.
9. Record unresolved API or product questions as explicit blockers.
10. Keep the app runnable after each logical implementation unit.

## 23. Acceptance Criteria

1. Users can open listing details from discovery results.
2. The screen renders only approved backend fields.
3. Pricing and fees are labeled according to backend-provided semantics.
4. Verification and trust indicators are backend-confirmed.
5. Location privacy rules are enforced in the UI.
6. Broker and agency attribution respects backend permissions.
7. Users can save and unsave listings reliably.
8. Favorites handle loading, empty, expired, unpublished, and unavailable states.
9. Comparison, if enabled, respects approved limits and does not invent rankings.
10. Share and deep-link flows do not expose private information.
11. Listing reports use approved categories and shared error conventions.
12. Critical listing and favorite flows have automated test coverage.
13. Shared listing, authorization, validation, privacy, and observability contracts are reused.
14. No duplicate listing business logic exists in the User App.
