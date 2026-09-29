# Milestone 03 — Contract & Blocker Audit

**Application:** Zero Brokerage User Mobile App (`@zero-brokerage/user-mobile`)  
**Milestone:** 03 — App Shell + Navigation + Discover Foundation  
**Auditor:** Principal React Native / Expo Architect & Senior Frontend Engineer  
**Status:** IMPLEMENTATION ACTIVE — CONTRACT SAFE

---

## 1. Executive Summary

Milestone 03 establishes the production App Shell, Expo Router tab and stack navigation, deep-linking foundation, and luxury property Discover architecture.

As mandated by project governance:

- The frontend **MUST NOT** invent missing backend APIs, mock live endpoints, or hardcode fake listings.
- The frontend **MUST NOT** assert unsupported business claims (e.g. curated, recommended, 100% verified, trusted, owner verified) unless confirmed by backend data contracts.
- When backend contracts are not yet registered or implemented, the frontend must establish typed domain boundaries, contract-neutral state abstractions, and user-safe unavailable/empty states, while explicitly recording every dependency and its Resolution Owner.

This document serves as the authoritative blocker register for Milestone 03. Every item is verified against the actual repository code (`services/api` on `feat/shared-core-backend` / `develop`) and cross-referenced with backend blueprints.

---

## 2. Comprehensive Contract & Blocker Matrix

The following matrix audits all 20 architectural areas (A–T) specified in the Milestone 03 contract:

| Area  | Topic                                 | Actual Repository Status                                                                                 | Frontend Action in Milestone 03                                                                              |      Blocker Classification      |     Blocker ID      |       Resolution Owner       |
| :---- | :------------------------------------ | :------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------: | :-----------------: | :--------------------------: |
| **A** | **Navigation Architecture**           | Single stack in `app/_layout.tsx` + `app/index.tsx`. No tab navigation or subroutes configured.          | Implement Expo Router primary tab shell: Discover, Saved, Activity, Account. Contextual route for Furniture. |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |
| **B** | **Auth Route Protection**             | Complete in M02: `AuthGate`, `useAuthStore`, `useAuthBootstrap`, `session-service`.                      | Integrate App Shell with `AuthGate` & `useAuthStore`. Guard sensitive tabs/actions.                          |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |
| **C** | **Public / Guest Route Behavior**     | Backend `services/api` only has `/health` and identity routes. No public discovery route registered.     | Allow guest entry to Discover; display sign-in prompts for protected tabs (Saved, Activity, Account).        |    **P0 Backend Dependency**     |   `DISC-API-001`    |      **Shared Backend**      |
| **D** | **Discover / Home Endpoint**          | **NOT IMPLEMENTED** in backend (`registerModules` in `services/api` has no discovery module).            | Centralize `getDiscoveryHome()` API call; handle 404/503/offline with contract-safe unavailable state.       |    **P0 Backend Dependency**     |   `DISC-API-001`    |      **Shared Backend**      |
| **E** | **Listing Search Endpoint**           | **NOT IMPLEMENTED** in backend. No search route in `services/api`.                                       | Implement `searchListings()` client with debounce, stale-request protection, and pagination hook.            |    **P1 Backend Dependency**     |  `SEARCH-API-001`   |      **Shared Backend**      |
| **F** | **Listing Detail Endpoint**           | **NOT IMPLEMENTED** in backend (`GET /api/v1/listings/:listingId` does not exist).                       | Create `app/listing/[id].tsx` with UUID parameter validation and unavailable error boundary.                 |    **P1 Backend Dependency**     |  `DETAIL-API-001`   |      **Shared Backend**      |
| **G** | **Search Filters & Taxonomy**         | Blueprint defined (Step 04 / Step 10), but no backend filter schema or enum registered.                  | Provide typed filter models; keep search filters session-local; do NOT send unconfirmed category enums.      |    **P1 Backend Dependency**     | `SEARCH-FILTER-001` |    **Product + Backend**     |
| **H** | **Pagination Architecture**           | Backend pagination utility is an empty `.gitkeep` (`services/api/src/common/pagination`).                | Build contract-neutral cursor pagination hook (`cursor`, `hasMore`, stable UUID deduplication).              | **P2 Architectural Foundation**  |     `PAGIN-001`     |      **Shared Backend**      |
| **I** | **Sorting & Ranking**                 | Backend owns ranking. Step 10 defines quality-first ranking, but no service exists in code.              | Preserve server response order strictly; never re-sort or calculate ranking client-side.                     |    **P2 Backend Dependency**     |    `RANKING-001`    |    **Product + Backend**     |
| **J** | **Sponsored Result Representation**   | Step 10 defines separate sponsored placement, but no monetization/boost service exists.                  | Support `isSponsored` flag on listing model; render dedicated visual badge only when flag is true.           |    **P2 Backend Dependency**     |  `SPONSOR-API-001`  |    **Product + Backend**     |
| **K** | **Verification / Trust Indicators**   | Verification rules specified in Step 07/10, but no property verification service exists.                 | Render verification badge only when backend explicitly returns `verificationStatus === 'VERIFIED'`.          |    **P2 Backend Dependency**     |   `TRUST-API-001`   |    **Product + Backend**     |
| **L** | **Location / Geospatial API**         | PostGIS schema planned in Step 03/10, but no geocoding or radius search API exists.                      | Provide honest location placeholder interaction without fake cities or coordinates.                          |    **P1 Backend Dependency**     |    `GEO-API-001`    | **Backend + Infrastructure** |
| **M** | **Analytics Contract**                | Step 11 lists events, but no analytics pipeline or SDK is configured in the repository.                  | Build privacy-preserving analytics abstraction (`trackEvent`) strictly sanitizing PII and coordinates.       |  **P2 Operational Dependency**   |   `ANALYTICS-001`   |    **Product + Frontend**    |
| **N** | **Image / Media Contract**            | Media pipeline (Step 05/07) not provisioned. No CDN base URL in environment.                             | Implement `ListingCard` with `expo-image` aspect-ratio containers and neutral placeholder fallback.          | **P2 Infrastructure Dependency** |   `MEDIA-CDN-001`   | **Backend + Infrastructure** |
| **O** | **Error Contract**                    | Implemented in M02: `ApiError`, `mapApiErrorToUserMessage`, `parseApiErrorEnvelope`.                     | Map HTTP 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504 to privacy-safe user messages.                |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |
| **P** | **Query / Cache Strategy**            | Zustand installed for client state. Monorepo lacks finalized server-state library (e.g. TanStack Query). | Implement typed query hook abstraction (`useQueryState`) with request caching and cancellation.              |   **P2 Architecture Decision**   |   `CACHE-LIB-001`   |  **Frontend Architecture**   |
| **Q** | **Deep-Link Strategy**                | `scheme: "zero-brokerage"` in `app.json`. No route allowlist parser existed.                             | Implement `src/navigation/deep-links.ts` with allowlisted routes, UUID validation, and auth checks.          |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |
| **R** | **Stable UUID Route Identifiers**     | Not previously enforced.                                                                                 | Enforce RFC 4122 UUID validation for listing IDs (`listing/[id]`); never pass objects in routes.             |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |
| **S** | **Environment Configuration**         | Implemented in M02: `src/lib/config/env.ts` with `EXPO_PUBLIC_API_BASE_URL`.                             | Consume existing validated environment configuration.                                                        |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |
| **T** | **Existing Design-System Primitives** | Milestone 01 primitives exist: `Box`, `Stack`, `Text`, `Button`, `Card`, feedback states.                | Build Discover UI and App Shell exclusively from Milestone 01 design tokens and primitives.                  |       **Resolved in M03**        |          —          |  **Frontend Architecture**   |

---

## 3. Detailed Blocker Register

### Blocker DISC-API-001 (Priority: P0 — Blocks Live Discovery)

- **Area:** Public Listing Discovery Endpoint
- **Resolution Owner:** **Shared Backend**
- **Exact Missing Contract:** `GET /api/v1/discovery/home` or `GET /api/v1/listings` is not registered in `services/api/src/app/register-routes.ts` or `services/api/src/modules/`.
- **Current Repository Evidence:** `services/api/src/app/register-modules.ts` has an empty `registerModules` function (`// Domain modules will be registered here.`). Only the `identity` module exists in the backend branch.
- **Affected Screens/Features:** User Mobile Discover Screen (`app/(app)/discover/index.tsx`).
- **Why Frontend Cannot Safely Resolve It:** Inventing mock listing data, fake prices, or fake properties violates production requirements and could mislead users or break once real contracts land.
- **Safest Temporary Frontend Behavior:** Render contract-safe Discover presentation shell with independent section unavailable states. Displays an informative "Properties Service Initializing" state with retry option.
- **Backend Dependency:** Implement the Listings module in `services/api/src/modules/listings` and register `GET /api/v1/discovery/home` or `GET /api/v1/listings`.
- **Requires:** Backend change.

---

### Blocker SEARCH-API-001 (Priority: P1 — Blocks Live Search)

- **Area:** Listing Search & Query API
- **Resolution Owner:** **Shared Backend**
- **Exact Missing Contract:** `GET /api/v1/listings/search` or `GET /api/v1/listings?query=...` with full-text, property type, price range, and bedroom filters.
- **Current Repository Evidence:** No search route registered in `services/api`.
- **Affected Screens/Features:** Search entry in Discover screen, search results view, filter controls.
- **Why Frontend Cannot Safely Resolve It:** Full-text indexing, fuzzy search, and relevance ranking reside exclusively in PostgreSQL/search index on the backend.
- **Safest Temporary Frontend Behavior:** Implement search bar UI with debounce, query parameter serialization, and cancelation tokens. Render contract-safe empty/unavailable state upon query execution until the endpoint is provisioned.
- **Backend Dependency:** Implement search endpoint with validated query schema per Blueprint Step 10.
- **Requires:** Backend change.

---

### Blocker DETAIL-API-001 (Priority: P1 — Blocks Listing Details)

- **Area:** Listing Detail Endpoint
- **Resolution Owner:** **Shared Backend**
- **Exact Missing Contract:** `GET /api/v1/listings/:listingId` returning validated `ListingDetailDto`.
- **Current Repository Evidence:** No listing routes exist in `services/api`.
- **Affected Screens/Features:** Listing Detail route (`app/listing/[id].tsx`).
- **Why Frontend Cannot Safely Resolve It:** Listing ownership, contact redaction, and verified amenities must be backend-filtered.
- **Safest Temporary Frontend Behavior:** Validate the `listingId` UUID parameter. If invalid, render `Invalid Identifier`. If valid but unmounted on backend, render an informative unavailable state with a button to return to Discover.
- **Backend Dependency:** Implement `GET /api/v1/listings/:listingId` in backend listings module.
- **Requires:** Backend change.

---

### Blocker SEARCH-FILTER-001 (Priority: P1 — Blocks Filter Finalization)

- **Area:** Property Category & Filter Taxonomy
- **Resolution Owner:** **Product + Backend**
- **Exact Missing Contract:** Finalized enum values for property categories (e.g. Apartment, Villa, Commercial) and amenity filters.
- **Current Repository Evidence:** No category enums registered in `services/api` or database schemas.
- **Affected Screens/Features:** Category shortcuts, search filter dialog.
- **Why Frontend Cannot Safely Resolve It:** Hardcoding arbitrary category enums in client queries causes backend 400 Bad Request once strict schema validation lands.
- **Safest Temporary Frontend Behavior:** Category shortcuts display neutral exploratory placeholders without serializing unconfirmed enum parameters to the search API.
- **Backend Dependency:** Define and document approved property category enum in shared schema.
- **Requires:** Product decision & backend change.

---

### Blocker GEO-API-001 (Priority: P1 — Blocks Location-Aware Discovery)

- **Area:** Location / Geospatial API
- **Resolution Owner:** **Backend + Infrastructure**
- **Exact Missing Contract:** `GET /api/v1/locations/suggest` or geospatial query parameter `lat`, `lng`, `radiusKm` on listing search.
- **Current Repository Evidence:** No geospatial routes or PostGIS queries exist in `services/api`.
- **Affected Screens/Features:** Location selector in Discover header, "Properties Near You" section.
- **Why Frontend Cannot Safely Resolve It:** Device coordinates alone cannot determine municipal boundaries, local micro-markets, or zero-brokerage operational zones without server validation.
- **Safest Temporary Frontend Behavior:** Display honest location placeholder ("All Locations") with explicit tooltip/hint indicating that geospatial filtering is pending backend geocoding integration. Zero fake cities or coordinates.
- **Backend Dependency:** Implement reverse-geocoding or city/locality listing API.
- **Requires:** Backend change & infrastructure setup.

---

### Blocker MEDIA-CDN-001 (Priority: P2 — Media Pipeline)

- **Area:** Property Image & Media Pipeline
- **Resolution Owner:** **Backend + Infrastructure**
- **Exact Missing Contract:** Finalized CDN image transformation URL pattern and cloud storage signing endpoint.
- **Current Repository Evidence:** No S3/Cloud Storage integration or image resizing proxy configured in `services/api`.
- **Affected Screens/Features:** `ListingCard` imagery, gallery thumbnails.
- **Why Frontend Cannot Safely Resolve It:** Direct client uploads or unauthenticated media hosting are security risks.
- **Safest Temporary Frontend Behavior:** Build `ListingCard` with `expo-image` supporting standard remote URLs, robust placeholder gradients, error fallbacks, and strict aspect-ratio containers to prevent layout shifts.
- **Backend Dependency:** Provision media storage and provide CDN image base URL.
- **Requires:** Backend change & DevOps provisioning.

---

### Blocker SPONSOR-API-001 (Priority: P2 — Monetization / Boost Representation)

- **Area:** Sponsored Placement Classification
- **Resolution Owner:** **Product + Backend**
- **Exact Missing Contract:** Policy and API representation distinguishing sponsored placements from organic search ranking.
- **Current Repository Evidence:** No sponsored classification flags exist in backend contracts.
- **Affected Screens/Features:** `ListingCard` sponsored pill, feed section placement.
- **Why Frontend Cannot Safely Resolve It:** Client cannot determine monetization or boost tiers without backend calculation.
- **Safest Temporary Frontend Behavior:** Support `isSponsored?: boolean` in presentation model; render sponsored label only when backend flag is explicitly `true`. Never infer sponsored status client-side.
- **Backend Dependency:** Define sponsored placement criteria in search indexer.
- **Requires:** Product decision & backend change.

---

### Blocker TRUST-API-001 (Priority: P2 — Property Verification)

- **Area:** Listing Verification Pipeline
- **Resolution Owner:** **Product + Backend**
- **Exact Missing Contract:** Physical inspection and document verification workflow endpoints.
- **Current Repository Evidence:** Verification rules defined only in blueprints.
- **Affected Screens/Features:** `ListingCard` verified badge.
- **Why Frontend Cannot Safely Resolve It:** Verification is a legal/operational guarantee owned by platform moderation.
- **Safest Temporary Frontend Behavior:** Render verified badge only when `verificationStatus === 'VERIFIED'`. Never infer verification from other fields.
- **Backend Dependency:** Implement verification state machine and projection.
- **Requires:** Product decision & backend change.

---

### Blocker CACHE-LIB-001 (Priority: P2 — Server-State Architecture)

- **Area:** Client Query & Cache Layer
- **Resolution Owner:** **Frontend Architecture**
- **Exact Missing Contract:** Decision on monorepo-wide query caching library (TanStack React Query vs custom SWR vs Zustand slice).
- **Current Repository Evidence:** `package.json` contains `zustand: ^4.5.7` but no `@tanstack/react-query`. Monorepo policy prohibits adding unauthorized dependencies.
- **Affected Screens/Features:** All data-fetching hooks across User Mobile (`useDiscoveryFeed`, `useListingSearch`).
- **Why Frontend Cannot Safely Resolve It:** Introducing `@tanstack/react-query` unilaterally would alter package dependencies without architectural sign-off.
- **Safest Temporary Frontend Behavior:** Implement a clean, typed query hook abstraction (`useQueryState`) inside `apps/user-mobile/src/features/discovery/hooks/` providing request lifecycle management (idle, loading, success, error, unavailable, offline), cancellation, and memory caching.
- **Backend Dependency:** None (Internal frontend/monorepo architecture alignment).
- **Requires:** Team architectural decision.

---

### Blocker ANALYTICS-001 (Priority: P2 — Telemetry & Analytics)

- **Area:** Mobile Event Tracking Infrastructure
- **Resolution Owner:** **Product + Frontend**
- **Exact Missing Contract:** Approved telemetry provider (e.g. PostHog, Segment, Firebase) and event taxonomy.
- **Current Repository Evidence:** No analytics packages installed or server telemetry endpoints provisioned.
- **Affected Screens/Features:** Discover screen viewing, search tracking, listing engagement metrics.
- **Why Frontend Cannot Safely Resolve It:** Cannot transmit telemetry to third-party endpoints without privacy disclosure and configuration.
- **Safest Temporary Frontend Behavior:** Create a centralized `src/services/analytics/` abstraction with strict PII stripping (passwords, tokens, OTPs, GPS coordinates sanitized).
- **Backend Dependency:** Analytics provider selection and proxy endpoint.
- **Requires:** Product decision.

---

## 4. Future-Blocker Prevention Decisions

To guarantee later milestones (Milestone 04: Listing Details, Milestone 05: Favorites, Milestone 06: Visits, Milestone 07: Furniture, Milestone 08: Account) do not require a navigation or architecture rewrite:

1. **Tab Structure Strictness:** Primary tabs are strictly locked to `Discover`, `Saved`, `Activity`, `Account`. Furniture is kept as a contextual route accessed through Discover and category navigation, preventing tab-bar refactoring later.
2. **Stable UUID Route Contracts:** All listing navigation strictly passes UUIDs (`/listing/[id]`). Passing listing objects in params is prohibited, preventing stale state, parameter truncation, and deep-link incompatibility.
3. **Deep-Link Allowlisting:** Deep-link matching verifies resource identifiers and destination authentication requirements before navigation, preventing security bypasses.
4. **Independent Section Error Boundaries:** In Discover, section-level failures are isolated. The app shell will never crash due to a single endpoint regression.
5. **Separation of Client vs Server State:** Search filters and pagination state are managed in ephemeral hooks; account preferences and authentication are stored in Zustand. No large server collections are stored in client state stores.
