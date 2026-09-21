# User App Blueprint — Step 4: Home, Discovery, Search, and Listing Browsing

## 1. Purpose

Implement the User App's home and property-discovery experience using the shared listings, search, geospatial, moderation, ranking, trust-signal, and analytics contracts.

The app is a consumer interface only. It must not duplicate listing eligibility, publication, ranking, verification, ownership, or moderation logic.

## 2. Objectives

Implement:

- Home/discovery landing experience
- Search entry and query handling
- Property-listing feed
- Search filters and sorting controls
- Location-aware discovery
- Pagination or cursor-based loading
- Loading, empty, error, and retry states
- Verified and trust-related indicators
- Clearly separated sponsored content
- Analytics instrumentation using approved events
- Accessible and performant list rendering

## 3. Scope Boundaries

### Included

- Home sections approved by product requirements
- Search input and recent-search handling where supported
- Listing cards and compact property summaries
- Search results screen
- Filters, sorting, and filter reset
- Location permission and manual-location fallback
- Pagination/infinite scrolling
- Pull-to-refresh where appropriate
- Saved-search entry points only if supported by the API
- Deep links into listing details

### Excluded

- Listing creation or editing
- Listing verification or moderation decisions
- Backend ranking calculations
- Broker or agency management
- Direct database access
- Client-side trust-score calculations
- Unapproved sponsored-placement logic

## 4. Source of Truth

The backend is authoritative for:

- Listing visibility
- Publication status
- Verification status
- Availability status
- Listing ownership
- Ranking and ordering
- Sponsored-placement classification
- Trust signals
- Price and property metadata
- Geographic eligibility

Do not infer that a listing is published, verified, available, sponsored, or trustworthy from missing fields or UI assumptions.

## 5. Home Screen

Build the home screen from approved, contract-backed sections. Possible sections include:

- Search entry point
- Location context
- Recommended or relevant listings
- Recently viewed listings, if supported
- Popular categories
- Furnishing or property-type shortcuts
- Trust and safety education
- Clearly labelled sponsored content

Each section must have explicit loading, empty, error, and hidden states. A failed optional section must not block the entire home screen.

Avoid hardcoding business rankings or promotional claims in the client.

## 6. Search Experience

The search interface should support only backend-approved query fields, such as:

- Free-text query
- Location or geographic area
- Property category/type
- Rent or sale mode
- Budget range
- Furnishing status
- Bedroom or capacity filters where supported
- Availability-related filters
- Verification filters
- Other contract-defined filters

Search behavior must:

1. Debounce text input where appropriate.
2. Avoid sending requests for every keystroke without control.
3. Normalize input only according to shared API conventions.
4. Preserve user-selected filters during navigation when intended.
5. Distinguish temporary search state from persisted preferences.
6. Cancel or ignore stale requests safely.
7. Encode query parameters through a centralized API utility.
8. Handle invalid or unsupported filter combinations from the server.

Do not invent filter values or send undocumented parameters.

## 7. Location Handling

Support the approved location flow:

- Ask for device location only when needed and with clear explanation.
- Respect denied permissions.
- Provide manual location selection where supported.
- Do not block discovery permanently when location permission is denied.
- Avoid storing precise location unnecessarily.
- Do not expose exact coordinates in user-facing cards unless explicitly approved.
- Treat backend geospatial results as authoritative.

Location permission state must not be treated as proof of a user's permanent location.

## 8. Listing Cards

A listing card may display only fields supplied by the listing/search contract, such as:

- Cover image
- Title or approved short label
- Area or approximate location
- Rent or sale price
- Property type
- Furnishing status
- Relevant size or room information
- Verification/trust indicators
- Availability summary
- Sponsored label when applicable

Cards must:

- Have a stable key from the backend result identity.
- Support missing images and incomplete optional fields.
- Avoid layout shifts where practical.
- Use consistent formatting utilities for currency, area, and dates.
- Never imply that a sponsored listing is organically ranked.
- Avoid exposing private owner or broker contact details.

## 9. Ranking and Sponsored Content

The backend owns ranking. The client only renders the received order.

The app must:

- Preserve the backend result order.
- Avoid client-side re-sorting unless explicitly required for a local presentation-only operation.
- Render sponsored inventory in the dedicated location specified by the API.
- Display a clear sponsored label.
- Never merge sponsored items into organic results without the contract explicitly requiring that behavior.
- Avoid language suggesting that payment equals quality or verification.

The client must not calculate the platform's quality, rating, closure, or trust formula.

## 10. Pagination and Refresh

Use the pagination strategy defined by the API, preferably a cursor when provided.

Required behavior:

- Prevent duplicate page requests.
- Preserve the current result set while loading the next page.
- Deduplicate results by stable listing ID.
- Handle an exhausted cursor correctly.
- Avoid appending results from a stale query.
- Provide retry for failed page loads.
- Support pull-to-refresh without corrupting pagination state.
- Reset pagination when query-defining filters change.

If the backend returns a new result snapshot, reconcile it rather than blindly concatenating it.

## 11. Listing Visibility and Stale Results

A listing may become unavailable after it was loaded. The app must:

- Handle detail-screen or action-level not-found responses.
- Remove or mark stale cards when the API indicates unavailability.
- Avoid presenting cached results as guaranteed current availability.
- Refresh at appropriate lifecycle points.
- Show a clear explanation when a selected listing is no longer available.

Do not conceal backend publication or moderation changes.

## 12. Navigation and Deep Links

Every listing card should navigate through the centralized route/navigation contract.

Deep-link handling must:

- Validate the listing identifier.
- Require authentication only when the destination requires it.
- Handle deleted, unpublished, or unavailable listings.
- Preserve safe return context where practical.
- Avoid placing sensitive data in URLs or navigation parameters.

Do not duplicate listing details in navigation state when a stable identifier is sufficient.

## 13. Error and Empty States

Provide distinct states for:

- No search query
- No matching results
- Invalid filters
- Location unavailable
- Permission denied
- Network failure
- Rate limiting
- Authentication expiry
- Listing no longer available
- Partial home-section failure
- Server maintenance

Each state should provide a useful next action such as retry, reset filters, choose another location, or return to home.

Use the shared API error format and centralized error-to-UI mapping.

## 14. Performance Requirements

- Use virtualized lists for large result sets.
- Optimize image loading and caching.
- Use stable list keys.
- Avoid unnecessary rerenders of listing cards.
- Debounce or throttle expensive interactions.
- Avoid blocking the UI on optional home sections.
- Preserve scroll position when appropriate.
- Do not preload unlimited pages.
- Instrument slow discovery operations using approved telemetry.

Performance optimizations must not change business ordering or visibility rules.

## 15. Security and Privacy

The app must:

- Use authenticated API clients for private endpoints.
- Keep private contact information out of public cards.
- Avoid logging search queries when they may contain sensitive data.
- Avoid placing personal location data in analytics payloads.
- Validate listing IDs and deep-link parameters.
- Never trust client-provided verification or sponsored flags.
- Respect account restrictions and backend access decisions.

## 16. Analytics

Use only the approved analytics catalog. Potential events include:

- Home viewed
- Search started
- Search submitted
- Filter applied
- Filter reset
- Location selected
- Listing card viewed
- Listing results loaded
- Listing result page loaded
- Listing opened
- Sponsored listing impression
- Sponsored listing opened
- Empty results displayed

Do not send full search payloads, precise location, private contact details, or unrestricted listing data. Analytics must not be used to reconstruct sensitive user behavior beyond approved retention and privacy limits.

## 17. Testing Requirements

### Unit and Component Tests

Test:

- Filter serialization
- Query debouncing
- Currency and metadata formatting
- Listing-card fallback states
- Sponsored-label rendering
- Pagination state transitions
- Duplicate-result prevention
- Stale-request protection
- Permission-denied UI
- Accessibility labels

### Integration Tests

Test:

- Home-section loading
- Search success and validation errors
- Filter combinations
- Location fallback
- Cursor pagination
- Refresh and retry
- Listing unavailability
- Rate-limit handling
- Session expiry
- Deep-link routing

### End-to-End Tests

At minimum:

1. A user can open the home screen.
2. A user can search for properties.
3. A user can apply and reset filters.
4. Results preserve backend ordering.
5. Sponsored listings are clearly labelled and separated as required.
6. Pagination does not duplicate or mix stale results.
7. A denied location permission does not make discovery unusable.
8. An unavailable listing is handled safely.
9. Empty and network-error states provide recovery actions.
10. A listing card opens the correct detail route.

## 18. Definition of Done

- Home and discovery screens use shared typed contracts.
- Search parameters match the approved API.
- Backend ordering and visibility are preserved.
- Sponsored content is clearly labelled according to the contract.
- Pagination, refresh, retry, and stale-request behavior are reliable.
- Location permission and manual fallback are handled safely.
- Listing cards handle missing and optional data.
- Private information is not exposed in public discovery surfaces.
- Performance and accessibility requirements are addressed.
- Critical discovery journeys have automated tests.
- No client-side ranking, moderation, verification, or ownership logic is duplicated.

## 19. AI IDE Instructions

1. Read the shared listings, search, geospatial, ranking, moderation, trust-signal, analytics, API, and error-contract documents.
2. Inspect existing navigation, API-client, image, cache, list, and design-system utilities.
3. Confirm the exact search filters and home sections from the backend contract before implementation.
4. Reuse shared query serializers, pagination helpers, formatting utilities, and analytics helpers.
5. Treat backend result order and visibility as authoritative.
6. Do not invent sponsored behavior, ranking formulas, verification rules, or listing fields.
7. Add tests for stale queries, pagination duplication, denied location, and unavailable listings.
8. Keep the app runnable after each implementation unit.
9. Record unresolved API or product questions as explicit blockers.

## 20. Acceptance Criteria

1. The home screen renders approved sections with independent loading and failure states.
2. Search uses only documented query fields and filters.
3. Temporary search state is distinct from persisted user preferences.
4. Location permission denial still permits an approved manual discovery path.
5. Listing cards render safely with missing optional data.
6. Backend ordering is preserved.
7. Sponsored inventory is clearly identified and positioned according to the contract.
8. Pagination prevents duplicate, stale, or cross-query results.
9. Listing unavailability is handled without misleading the user.
10. Shared error, navigation, formatting, analytics, and API utilities are reused.
11. Sensitive data is excluded from logs, analytics, and public discovery surfaces.
12. Critical discovery workflows have automated test coverage.
13. No listing ranking, moderation, verification, or ownership logic is duplicated in the User App.
