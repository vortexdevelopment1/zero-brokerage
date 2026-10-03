# Milestone M04 — Visual Product Foundation

## Executive Summary

Milestone M04 transforms the Zero Brokerage User Mobile foundation into an editorial, luxury, calm, and production-quality mobile product. The application communicates quality through generous whitespace, deliberate typography hierarchy, architectural photography, and understated motion rather than superficial decoration.

---

## 1. Visual & Emotional Journey

The application implements the approved emotional discovery flow:

```
Beautiful Visual Hook ("Where to live?")
        ↓
Honest Location Context ("All Locations" / City Filter)
        ↓
Dynamic Search Entry & Exploratory Taxonomy
        ↓
Cinematic Featured Residence (PropertyHero)
        ↓
Curated Property Sections (ListingCard)
        ↓
Contextual Furnished Living Moment (FurnitureBannerCard)
        ↓
Immersion & Engagement (Listing Detail, Save, Visit Request)
        ↓
Effortless Tracking (Saved Favorites & Activity Tab)
```

---

## 2. Fixture / Adapter Architecture (Section 23)

To ensure high-fidelity visual evaluation independent of incomplete backend endpoints, M04 introduces a clean boundary pattern:

```
Screen / UI
    ↓
Feature Hook (`useDiscoveryFeed`, `useListingSearch`, `useQueryState`)
    ↓
Repository (`discoveryRepository`)
    ↓
┌─────────────────────────────────┴─────────────────────────────────┐
│                                                                   │
RealDiscoveryApiAdapter                            FixtureDiscoveryApiAdapter
(Calls HTTP endpoints via apiRequest)              (Serves backend-shaped presentation data)
```

### Disciplinary Boundaries

- **Backend-shaped fixtures**: Every fixture object strictly satisfies `ListingPresentationModel`, `DiscoveryFeedUiModel`, and `CursorPaginationDto`.
- **Valid RFC 4122 UUIDs**: All fixture listing IDs use valid version 4 UUIDs (e.g. `11111111-2222-4444-8888-111111111111`).
- **Explicit adapter selection**: Controlled centrally via `EXPO_PUBLIC_USE_FIXTURES=true` (or injected options). When not set or set to `false`, routes directly to `RealDiscoveryApiAdapter` without swallowing errors, ensuring genuine integration failures (401, 403, 404, 500, network) are propagated directly.
- **Fixture search filter parity**: `FixtureDiscoveryApiAdapter` supports deterministic filtering across `query`, `intent`, `minPrice`, `maxPrice`, `bedrooms`, and `verifiedOnly`, while respecting the `limit` parameter.

---

## 3. Reusable Component System

### Primitives & Feedback

- **`PropertyHero`**: Top-of-feed cinematic showcase with 16:11 aspect ratio, editorial label, price block, and direct details action.
- **`ListingCard`**: Standardized 16:10 property card with non-nested Pressable architecture, graceful image error fallback, verified badge, sponsored indicator, and favorite bookmark button.
- **`PropertyPrice`**: Price formatter supporting scales across INR Thousands, Lakhs, and Crores with `/mo` suffix for rental properties.
- **`PropertyMeta`**: Specs summary (`BHK • Area sq.ft • Property Type • Bathrooms`) supporting inline text and pill formats.
- **`VerificationBadge`**: Calm emerald badge strictly rendered only when `verificationStatus === "VERIFIED"`.
- **`FavoriteButton`**: Micro-interaction button with `useFavoritesStore` integration and accessible ARIA attributes.
- **`SearchEntryBar`**: Focus-transitioned search input with activity spinner, clear button, and active filter indicator.
- **`CategoryShortcuts`**: Restrained exploratory taxonomy pills with active state indication.
- **`FurnitureBannerCard`**: Editorial deep-canvas entry point promoting curated living without disrupting the 4 bottom tabs.
- **`Skeleton`, `PropertyCardSkeleton`, `PropertyHeroSkeleton`**: Layout-matching skeleton loaders that prevent cumulative layout shifts during async fetches.

---

## 4. Screens Completed

1. **Discover Screen (`app/(app)/discover/index.tsx`)**:
   - Header with honest location state ("All Locations") and profile access.
   - Search entry with focus feedback and loading indicators.
   - Exploratory category pills.
   - Visual rhythm combining `PropertyHero`, horizontal breathing room, `FurnitureBannerCard`, and curated `ListingCard` collections.
   - Layout-preserving skeletons and isolated section error boundaries.

2. **Listing Detail Screen (`app/listing/[id].tsx`)**:
   - Enforces strict RFC 4122 UUID validation.
   - High-resolution architectural photography hero with verified & intent overlays.
   - Overview specs, zero-brokerage assurance, and sticky bottom visit scheduling CTA.

3. **Furniture Living Screen (`app/furniture/index.tsx`)**:
   - Curated room packages (Living Suite, Master Retreat, Executive Workstation) with high-res photography, itemized breakdowns, transparent monthly rates, and direct inquiry CTA.

4. **Saved Properties Tab (`app/(app)/saved/index.tsx`)**:
   - Displays live favorited listings across the app with responsive un-save capability.
   - Calm, actionable empty state when no items are bookmarked or when browsing as guest.

5. **Activity Tab (`app/(app)/activity/index.tsx`)**:
   - Real-time journey milestone tracking (confirmed visits, concierge notices).
   - Clear sign-in prompt for guest users.

6. **Account Tab (`app/(app)/account/index.tsx`)**:
   - Member profile avatar and masked mobile number.
   - Active session encryption and security metadata.
   - Confirmed sign-out modal with loading state.

7. **Authentication & Onboarding (`AuthEntryScreen`, `OtpVerificationScreen`, `OnboardingScreen`)**:
   - Polished mobile number input with active focus borders and country code indicator.
   - High-contrast 6-digit OTP cells with numeric keypad and resend countdown.
   - Welcoming onboarding screen celebrating verified identity without mandatory form friction.

---

## 5. Explicit Backend & API Gaps Discovered

| Area                  | Missing / Provisional Contract                 | Status in Frontend                                                  |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **Discovery Home**    | `/api/v1/discovery/home`                       | Supported via `DiscoveryApiPort` and `discoveryRepository` fallback |
| **Listings Search**   | `/api/v1/listings?q=&intent=`                  | Supported with cursor pagination envelope via adapter               |
| **Listing Details**   | `/api/v1/listings/:id`                         | Supported with strict RFC 4122 UUID validation                      |
| **Geocoding**         | `/api/v1/geo/cities`, `/api/v1/geo/localities` | Honest UI placeholder ("All Locations") without fake geolocation    |
| **Taxonomy**          | `/api/v1/taxonomy/categories`                  | Exploratory pills without unconfirmed query parameters              |
| **Profile Setup**     | `/api/v1/auth/profile`                         | Clean welcoming screen without speculative form submissions         |
| **Furniture Catalog** | `/api/v1/furniture/packages`                   | Contextual catalog with inquiry trigger                             |

---

## 6. Testing & Quality Verification

- **Unit Tests**: 61 passing tests across 7 test suites (Node.js test runner).
- **TypeScript**: 0 errors (`tsc --noEmit`).
- **Prettier**: Formatted across all modified and created source files.
- **Android Emulator QA**: Booted Pixel 8 AVD, verified layout stability, safe area insets, and visual contrast.
