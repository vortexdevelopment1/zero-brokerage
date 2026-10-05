# M05 Phase 2A — Android Visual QA

**Date:** 2026-10-03  
**Target Platform:** Android (Google Pixel 8 emulator, Android API 34 / SDK 57)  
**Target Branch:** `feat/user-mobile`  
**Backend Branch:** `feat/shared-core-backend` (`http://127.0.0.1:3000`)  
**Source of Truth:** `blueprints/02-user-app/step-06-visits-inquiries-leads-and-communication.md`  

---

## 1. Current Working Tree State

### Git Status Summary

```text
Changes tracked & modified:
  M apps/user-mobile/app/(app)/activity/index.tsx
  M apps/user-mobile/app/_layout.tsx
  D apps/user-mobile/app/listing/[id].tsx
  M apps/user-mobile/src/components/AppContainer.tsx
  M apps/user-mobile/src/components/primitives/Button.tsx
  M apps/user-mobile/src/components/primitives/Card.tsx
  M apps/user-mobile/src/components/primitives/IconButton.tsx
  M apps/user-mobile/src/components/primitives/Pressable.tsx
  M apps/user-mobile/src/components/primitives/Stack.tsx
  M apps/user-mobile/src/components/primitives/Text.tsx
  M apps/user-mobile/src/navigation/deep-links.ts
  M apps/user-mobile/src/navigation/routes.ts
  M apps/user-mobile/src/services/api/errors.ts
  M apps/user-mobile/src/services/api/index.ts
  M apps/user-mobile/src/services/auth/auth-service.ts
  M apps/user-mobile/tests/navigation-deep-links.test.ts
  M services/api/package.json
  M services/api/src/app/register-modules.ts

Untracked files present:
  ?? apps/user-mobile/app/activity/inquiries/[inquiryId].tsx
  ?? apps/user-mobile/app/activity/visits/[visitId].tsx
  ?? apps/user-mobile/app/listing/[id]/index.tsx
  ?? apps/user-mobile/app/listing/[id]/schedule.tsx
  ?? apps/user-mobile/docs/M05-FRONTEND-BACKEND-INTEGRATION-AUDIT.md
  ?? apps/user-mobile/src/features/inquiries/
  ?? apps/user-mobile/src/features/visits/
  ?? apps/user-mobile/src/services/api/query-cache.ts
  ?? apps/user-mobile/tests/inquiries-integration.test.ts
  ?? apps/user-mobile/tests/m05-deep-links-and-cache.test.ts
  ?? apps/user-mobile/tests/visits-integration.test.ts
  ?? services/api/package-lock.json
  ?? services/api/src/common/http/response.ts
  ?? services/api/src/modules/inquiries/
  ?? services/api/src/modules/visits/
```

### What M05 Work is Actually Present

1. **Visits Architecture & Endpoints (V1–V6):**
   - API client contracts, adapters (`VisitsApiAdapter`, `FixtureVisitsApiAdapter`), and repository.
   - Centralized hooks: `useVisits` (V1), `useVisitDetail` (V2), `useVisitAvailability` (V4), `useVisitMutations` (V3 create, V5 cancel, V6 reschedule).
   - Authoritative status mapping (`REQUESTED`, `PENDING_CONFIRMATION`, `CONFIRMED`, `CANCELLED_BY_USER`, `RESCHEDULE_REQUESTED`, `REJECTED`, `EXPIRED`, `COMPLETED`, `NO_SHOW`).
2. **Inquiries Architecture & Endpoints (I1–I3):**
   - API client contracts, adapters (`InquiriesApiAdapter`, `FixtureInquiriesApiAdapter`), and repository.
   - Centralized hooks: `useInquiries` (I2), `useInquiryDetail` (I3), `useSubmitInquiry` (I1).
   - Authoritative status mapping (`SUBMITTED`, `ACKNOWLEDGED`, `RESPONDED`, `CLOSED`).
3. **Screen Routes:**
   - Property Detail: `apps/user-mobile/app/listing/[id]/index.tsx`
   - Visit Booking: `apps/user-mobile/app/listing/[id]/schedule.tsx`
   - Visit Detail: `apps/user-mobile/app/activity/visits/[visitId].tsx`
   - Inquiry Detail: `apps/user-mobile/app/activity/inquiries/[inquiryId].tsx`
   - Activity Hub: `apps/user-mobile/app/(app)/activity/index.tsx`
4. **Automated Verification:**
   - 95 unit and integration tests passing across 9 test suites.
   - TypeScript compilation (`tsc --noEmit`) passes with 0 errors.

### What Appears Incomplete / Defective in Current State

1. **Auth Modal Rendering Collapse (P0):** `apps/user-mobile/app/(auth)/sign-in.tsx` relies on `className="flex-1"` without `style={{ flex: 1 }}` or `AppContainer`, causing the entire auth form to collapse to height 16px on Android. Unauthenticated users tapping "Sign In to Continue" from visit or inquiry gates are trapped on a blank screen.
2. **Button Height and Contrast Anomalies (P1):** In `Button.tsx`, button containers collapse to 20–24px high on Android when wrapped in flex containers without explicit inline height tokens, and primary buttons in certain containers lose background fill, causing white-on-white text illegibility.
3. **Absolute Positioning in Sticky Footers (P1):** In `apps/user-mobile/app/activity/visits/[visitId].tsx`, the action footer uses `position: "absolute", bottom: 0`, which overlaps scrollable content and risks collision with system navigation bar insets.
4. **Development Scheme in Deep-Link Parser (P1):** `deep-links.ts` strictly strips `zero-brokerage://` and `zerobrokerage.com`, but does not handle Expo development URIs (`exp://.../--/`), causing deep-link intents launched in Expo Go to fail or default to Discover.
5. **Tailwind Class Inconsistencies (P2):** Some components (e.g. status badges in Inquiry Detail and Activity tabs) use ad-hoc Tailwind classes (`bg-emerald-100`, `border-amber-300`) that do not reliably resolve on native Android via NativeWind, rather than semantic tokens from `@/theme/tokens`.

---

## 2. Screens Audited

| Screen | Available? | Visual Status | Findings |
|---|---|---|---|
| **1. Listing Detail** (`/listing/[id]`) | **YES** | Partially Degraded | Hero photo, verified badge, title, location, price card, overview stats (BHK, sqft, baths) render with calm luxury aesthetics. However, bottom action bar buttons ("Schedule Private Visit" and "Inquire") suffer from height constraint issues (`bounds="[16,608][198,628]"`, height 20px) and missing background fill on the primary button. |
| **2. Schedule Visit** (`/listing/[id]/schedule`) | **YES** | Blocked for Guests / Available for Authed | Correctly guards against unauthenticated users with a "Private Visit Access" gate card. However, the "Sign In to Continue" primary button inside the gate card has an invisible label due to button style truncation. |
| **3. Availability / Slot Selection** (`schedule.tsx`) | **YES** | Functional | Grouped date carousel and timeslots with 1-on-1 viewing indicators render using V4 backend data. Slots marked unavailable are dimmed and unselectable. Asia/Kolkata timezone context is explicitly displayed. |
| **4. Visit Review** (`schedule.tsx` Step 2) | **YES** | Functional | Renders property summary, formatted date/time, user note, and platform policy notice ("Notice: Submission requests the visit slot from the homeowner"). |
| **5. Visit Result / Submission State** | **YES** | Functional | Single-flight submit lock active; shows loading indicator ("Submitting..."); transitions immediately to server-authoritative state via V3 endpoint (`POST /api/v1/visits`) and routes to Visit Detail. |
| **6. Visit Detail** (`/activity/visits/[visitId]`) | **YES** | Partially Degraded | Full property summary, status badge (`PENDING_CONFIRMATION`, `CONFIRMED`, `CANCELLED_BY_USER`, etc.), appointment timing, request notes, reference ID, and Code of Conduct card. Sticky footer has `position: "absolute"` which overlaps lower card content on smaller viewports. |
| **7. Cancel Visit** (`[visitId].tsx` modal) | **YES** | Functional | Modal presents explicit warning, optional reason input, and single-flight cancel button calling V5 (`POST /api/v1/visits/:visitId/cancel`). Cache is invalidated upon response. |
| **8. Reschedule Visit** (`[visitId].tsx` modal) | **YES** | Functional | Modal fetches fresh V4 availability slots, enforces new slot selection, accepts optional reason, and submits via V6 (`POST /api/v1/visits/:visitId/reschedule`). |
| **9. Inquiry Form** (`/listing/[id]` modal) | **YES** | Functional | Bottom sheet modal with property context, character counter (10–1,000 chars), validation, and submit lock calling I1 (`POST /api/v1/inquiries`). Lacks `KeyboardAvoidingView`, risking keyboard overlap on short displays. |
| **10. Activity** (`/(app)/activity`) | **YES** | Functional | Segmented control toggling "Visits" (V1) and "Inquiries" (I2). Supports pull-to-refresh, skeleton loaders, and empty states. Deep-links directly to respective detail screens. |
| **11. Inquiry Detail** (`/activity/inquiries/[inquiryId]`) | **YES** | Functional | Authoritative fetch via I3 (`GET /api/v1/inquiries/:inquiryId`), status badge, property reference card, message card, and response timeline. |

---

## 3. Flow Audit

### Visit Flow
`Listing` → `Schedule Visit` → `Availability` → `Select Slot` → `Review` → `Submit` → `Result` → `Visit Detail`

1. **Listing → Schedule Visit:** User taps "Schedule Private Visit" from listing. If guest, "Private Visit Access" gate is shown.
2. **Schedule Visit → Availability:** Valid listing UUID fetches V4 availability from `GET /api/v1/listings/:listingId/visit-availability`. Date carousel and slots render.
3. **Availability → Select Slot:** Tapping a slot selects it with a radio indicator. "Review Appointment" button activates.
4. **Select Slot → Review:** Transition to Step 2 renders full summary with Asia/Kolkata timezone context and optional note field.
5. **Review → Submit:** Tapping "Request Private Visit" triggers V3 `POST /api/v1/visits`. Button disables immediately to prevent duplicate requests.
6. **Submit → Result → Visit Detail:** Server 201 response returns created visit. Router navigates to `/activity/visits/:visitId`. Status defaults to `REQUESTED` / `PENDING_CONFIRMATION` as dictated by backend fixture.
7. **Flow Status:** **PARTIAL / IMPEDED FOR GUESTS.** The entire flow functions correctly from a logic and API standpoint, but guest authentication is blocked by the collapsed Sign-In screen (P0), and button touch targets on Listing Detail are clipped (P1).

### Inquiry Flow
`Listing` → `Inquiry` → `Submit` → `Activity` → `Inquiry Detail`

1. **Listing → Inquiry:** Tapping "Inquire" on Listing Detail opens the Inquiry bottom modal.
2. **Inquiry Form:** Form validates message length (min 10, max 1,000 characters). Submit button remains disabled until valid.
3. **Submit:** Tapping "Send Inquiry" executes I1 `POST /api/v1/inquiries`. Button locks into loading state.
4. **Result → Activity / Detail:** Server 201 response returns created inquiry ID. Modal closes, query cache invalidates `inquiries-list`, and user can navigate to `/activity/inquiries/:inquiryId`.
5. **Activity → Inquiry Detail:** Inquiries tab in Activity displays authoritative list; tapping card navigates to `/activity/inquiries/:inquiryId` with full message and timeline.
6. **Flow Status:** **COMPLETE BUT REQUIRES KEYBOARD POLISH.** Form submission, caching, and detail navigation work end-to-end against the Fastify backend.

---

## 4. Findings

| ID | Severity | Screen | Observation | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| **F-01** | **P0** | Sign-In Screen (`/(auth)/sign-in.tsx`) | The entire sign-in container collapses to 16px on Android. Only a clipped "Cancel" button is rendered; phone input and OTP flow are completely invisible. | `bounds="[0,0][320,16]"` in `window_dump.xml`. Screencap `qa_screen_03_signin.png` is blank white below y=16. | Wrap `SignInScreen` in `AppContainer` with explicit `style={{ flex: 1 }}` rather than uncompiled `className="flex-1"`. |
| **F-02** | **P1** | Button Primitive (`src/components/primitives/Button.tsx`) | Button heights collapse to 20–24px and primary buttons lose background color contrast when placed inside flex wrappers on Android. | `bounds="[16,608][198,628]"` on Listing Detail. Text "Schedule Private Visit" has white text on unstyled background. | Provide explicit `height: 48` (for medium) and `minHeight: 48` on `sizeStyles`, ensuring `RNPressable` styles are applied directly with tokens. |
| **F-03** | **P1** | Visit Detail (`app/activity/visits/[visitId].tsx`) | The bottom action footer uses `position: "absolute", bottom: 0`, causing content overlap with the bottom of the ScrollView and potential clipping by Android system navigation bars. | Code inspection lines 488–502: `position: "absolute", bottom: 0`. | Convert footer to a flex sibling below `ScrollView` with `borderTopColor: colors.defaultBorder` and `elevation: 4`, setting `ScrollView` `paddingBottom: 24`. |
| **F-04** | **P1** | Deep-Link Parser (`src/navigation/deep-links.ts`) | Deep-link parser only recognizes `zero-brokerage://` and `zerobrokerage.com` domains; it rejects Expo development URIs (`exp://.../--/`), preventing automated adb testing in Expo Go. | `adb shell am start -d "zero-brokerage://..."` failed to resolve intent in Expo Go. | Add normalization for `exp://.../--/` development prefix in `parseDeepLink`. |
| **F-05** | **P2** | Inquiry Modal (`app/listing/[id]/index.tsx`) | Inquiry form modal lacks `KeyboardAvoidingView`, causing the virtual keyboard to obscure the 1000-char message input on low-density Android screens. | Visual inspection on Pixel 8 (320x640 density 160). | Wrap modal body in `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ? "padding" : "height"}`. |
| **F-06** | **P2** | Inquiry Detail & Activity (`[inquiryId].tsx`, `activity/index.tsx`) | Status badges use ad-hoc Tailwind color classes (`bg-emerald-100`, `border-sky-300`) that do not consistently resolve through NativeWind CSS interop on Android. | Code inspection lines 45–65 in `[inquiryId].tsx`. | Replace Tailwind string classes with semantic tokens from `@/theme/tokens` (`colors.success.light`, `colors.info.light`, etc.). |
| **F-07** | **P2** | Listing Detail (`app/listing/[id]/index.tsx`) | ScrollView `contentContainerStyle` had `paddingBottom: 110`, leaving excessive empty white space when the bottom bar is not absolutely positioned. | Code inspection line 272. | Reduce `paddingBottom` to `24` once the footer is a flex sibling. |

---

## 5. Missing / Incomplete UI

In accordance with Blueprint Step 6 (`step-06-visits-inquiries-leads-and-communication.md`):

1. **Listing Detail Real Backend Connection (L1):** `GET /api/v1/listings/:listingId` is not implemented on the backend; the UI currently relies on `discovery-fixtures` fallback.
2. **Push Notification In-App Banner Handler:** Push payload reception and automatic in-app banner presentation for visit approvals/reschedules are not yet connected (deferred to Step 6 push infrastructure).
3. **Dedicated Inquiry Route:** Inquiry submission is currently an inline modal within Listing Detail rather than a dedicated route (`/listing/:id/inquire`).

---

## 6. Positive Findings

1. **Strict Server-Authoritative Integrity:** The frontend never fabricates visit slots, never optimistically confirms bookings, and never assumes appointment acceptance prior to HTTP 200/201 response envelopes.
2. **Single-Flight Mutation Locks:** Double-tap and duplicate submission prevention is strictly enforced on `handleSubmitRequest` (V3), `handleCancelVisit` (V5), `handleRescheduleVisit` (V6), and `handleSubmitInquiry` (I1).
3. **RFC 4122 UUID Validation:** All navigation builders and screens validate parameter format with `isValidUuid()`, safely rejecting malformed identifiers with calm `ErrorState` components rather than crashing.
4. **Complete Backend Alignment:** All 6 Visit endpoints (V1–V6) and all 3 Inquiry endpoints (I1–I3) are wired to their respective hooks, contracts, and error parsers.
5. **Private Data Isolation:** `QueryCache` explicitly clears all cached visit and inquiry data on `logout()`, preventing cross-account data leakage.
6. **Luxury Aesthetic Direction:** Spacing, card borders (`defaultBorder: #E4E4E7`), typography hierarchy, and restrained color palette faithfully respect the luxury architectural identity defined in M04.
7. **Automated Test Parity:** 95/95 tests passing across all 9 test suites; typecheck passes cleanly with 0 TypeScript diagnostics.

---

## 7. Recommended Next Actions

### Priority 0 (Blockers)
- [ ] **Fix Sign-In Screen Layout (F-01):** Replace `className="flex-1"` with `style={{ flex: 1 }}` and wrap `apps/user-mobile/app/(auth)/sign-in.tsx` in `AppContainer` so guest users can authenticate and access visit scheduling.

### Priority 1 (Major Presentation & UX)
- [ ] **Fix Button Primitive Dimensions & Fills (F-02):** Enforce `height: 48` on `sizeStyles.medium` and explicit token backgroundColor styles in `src/components/primitives/Button.tsx`.
- [ ] **Convert Sticky Action Footers to Flex Siblings (F-03):** Remove `position: "absolute"` from footers in `app/activity/visits/[visitId].tsx` and `app/listing/[id]/index.tsx`.
- [ ] **Support Development Deep-Link Schemes (F-04):** Update `src/navigation/deep-links.ts` to handle Expo Go `exp://` prefix during testing.

### Priority 2 (Polish & Refinement)
- [ ] **Add KeyboardAvoidingView to Inquiry Modal (F-05):** Ensure inquiry text input remains visible when the Android virtual keyboard opens.
- [ ] **Standardize Status Badge Tokens (F-06):** Migrate all badge background and border colors in `activity/index.tsx` and `[inquiryId].tsx` to `@/theme/tokens`.
- [ ] **Normalize ScrollView Padding (F-07):** Ensure all detail ScrollViews use consistent `paddingBottom: 24`.

### Blocked by Backend
- Listing Detail real HTTP module (L1: `GET /api/v1/listings/:id`) remains unmounted on the backend; frontend presentation correctly relies on fixture data until backend L1 is built.
- Push notification infrastructure and background visit reminder jobs are absent on the backend.
