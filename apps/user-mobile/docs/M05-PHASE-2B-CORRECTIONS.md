# M05 Phase 2B — Consolidated Android UX Corrections

## 1. Objective

This phase addressed and resolved all six findings identified in the M05 Phase 2A Android Visual QA report (`apps/user-mobile/docs/M05-PHASE-2A-VISUAL-QA.md`). All fixes preserve the existing User Mobile architecture, Fastify backend API contracts, and design token specifications without over-refactoring or introducing out-of-scope features.

## 2. Source of Truth

- **User Mobile Blueprint — Step 6**: `step-06-visits-inquiries-leads-and-communication.md` (Visits, Inquiries, Leads and Communication)
- **M05 Phase 2A Android Visual QA Report**: `apps/user-mobile/docs/M05-PHASE-2A-VISUAL-QA.md`
- **Centralized Design Tokens**: `apps/user-mobile/src/theme/tokens.ts`

---

## 3. F-01 — Sign-In Layout Collapse (P0)

- **Root Cause**: On Android, relying solely on NativeWind `className="flex-1"` without explicit native flex styling caused the root container and keyboard-avoiding views in `app/(auth)/sign-in.tsx`, `AuthEntryScreen.tsx`, and `OtpVerificationScreen.tsx` to collapse to the status-bar height (~16px), rendering only a clipped top bar while obscuring the phone input, OTP input, and CTAs.
- **Implementation**:
  - Replaced the root container in `app/(auth)/sign-in.tsx` with `<View style={{ flex: 1, backgroundColor: colors.surface }}>` and wrapped `<AuthGate />` in `<View style={{ flex: 1 }}>`.
  - Restored the top Cancel/Dismiss button bar (`handleDismiss` routing to `router.back()` or fallback `ROUTES.DISCOVER`).
  - Restored authenticated navigation effect: `if (status === "AUTHENTICATED") router.replace(ROUTES.DISCOVER as any)`.
  - Added explicit native `style={{ flex: 1 }}` to the `KeyboardAvoidingView` containers in both `AuthEntryScreen.tsx` and `OtpVerificationScreen.tsx`.
- **Files Changed**:
  - `apps/user-mobile/app/(auth)/sign-in.tsx`
  - `apps/user-mobile/src/features/auth/screens/AuthEntryScreen.tsx`
  - `apps/user-mobile/src/features/auth/screens/OtpVerificationScreen.tsx`
- **Android Verification Result**: **FIXED**. Tested on Android Pixel 8 emulator. The Sign-In screen now occupies 100% of the display viewport with visible Cancel button, phone input, prefix (+91), terms, and full-height CTA button. Tested dismiss behavior and redirect from private visit flow to unauthenticated sign-in without layout collapse.

---

## 4. F-02 — Button Primitive Collapsing on Android (P1)

- **Root Cause**: Two issues combined to collapse buttons on Android:
  1. `Pressable as RNPressable` from React Native with NativeWind / `react-native-css-interop` stripped background styles and height constraints when style functions were passed.
  2. Inside horizontal flex containers, buttons lacked `flexShrink: 0`, and the inner content was flattened, causing buttons to collapse to the 20px line-height of their text and losing background contrast.
- **Implementation**:
  - In `src/components/primitives/Button.tsx`, explicitly defined `height: 40/48/56`, `minHeight: 40/48/56`, `paddingVertical: 8/12/14`, `flexShrink: 0`, and `overflow: "hidden"` on `tokenContainerStyle`.
  - Wrapped button inner content inside an explicit native `<View style={tokenContainerStyle}>` within `RNPressable`, ensuring background colors (`colors.brand.DEFAULT`, `colors.surface`, etc.), borders, and heights are guaranteed at the native Android view level.
  - Added `flexShrink: 0` and `minHeight: 72` to the Listing Detail bottom action container.
- **Variants Affected**:
  - `primary` (Nautical blue fill with white text)
  - `secondary` (Surface fill with subtle border)
  - `small`, `medium`, `large` sizes
  - `disabled` and `loading` states
- **Android Verification Result**: **FIXED**. Verified in UI hierarchy dumps:
  - "Get Verification Code" button renders with `bounds="[0,312][320,368]"` (exact 56px large height).
  - "Schedule Private Visit" button renders with `bounds="[16,580][198,628]"` (exact 48px medium height with `#0A3C61` background and `#FFFFFF` text).
  - "Inquire" button renders with `bounds="[208,580][304,628]"` (exact 48px medium height).

---

## 5. F-03 — Visit Detail Sticky Footer Overlap (P1)

- **Root Cause**: The action footer in `app/activity/visits/[visitId].tsx` previously used `position: "absolute", bottom: 0`, overlapping the bottom content of the `ScrollView` and conflicting with Android system navigation insets.
- **Implementation**:
  - Restructured the layout into a flex column:
    ```
    AppContainer (SafeAreaView)
    └── Flex Column (style={{ flex: 1 }})
        ├── Header Bar
        ├── ScrollView (style={{ flex: 1 }}, contentContainerStyle={{ paddingBottom: 24 }})
        └── Bottom Action Bar (flex sibling, borderTopWidth: 1, borderTopColor: colors.defaultBorder, elevation: 4)
    ```
  - Preserved Cancel and Reschedule actions, loading indicators, and mutation handling.
- **Files Changed**:
  - `apps/user-mobile/app/activity/visits/[visitId].tsx`
- **Android Verification Result**: **FIXED**. The footer is structurally separated below the scroll area, stays pinned above the Android system navigation bar, and prevents content overlap across short and long content.

---

## 6. F-04 — Deep-Link Parsing in Expo Go Development (P1)

- **Production Behavior**: Production deep-link parsing strictly accepts only `zero-brokerage://` and `https://*.zerobrokerage.com` schemes and domains. Unapproved schemes are rejected and safely fall back to Discover.
- **Development Expo Go Behavior**: Added a development-only compatibility normalization in `src/navigation/deep-links.ts` gated by `((typeof __DEV__ !== "undefined" && Boolean(__DEV__)) || process.env.NODE_ENV !== "production")`. When active, URIs starting with `exp://.../--/` extract the inner path and evaluate it through the standard deep-link validator.
- **Validation & Authentication**:
  - Strict RFC 4122 UUID validation remains enforced; invalid UUIDs (`/activity/visits/invalid-uuid`) are rejected and fall back safely.
  - Protected route gating is untouched (`requiresAuth: true` for protected destinations).
  - Malformed routes are safely handled.
- **Files Changed**:
  - `apps/user-mobile/src/navigation/deep-links.ts`
  - `apps/user-mobile/tests/m05-deep-links-and-cache.test.ts`
- **Android Verification Result**: **DEV-ONLY IMPLEMENTED & VERIFIED**. Deep-linking via adb with `exp://127.0.0.1:8081/--/...` successfully parsed and routed to valid destinations in Expo Go while rejecting malformed identifiers.

---

## 7. F-05 — Inquiry Modal Keyboard Handling (P2)

- **Implementation**:
  - In `apps/user-mobile/app/listing/[id]/index.tsx`, wrapped the Inquiry modal contents in a `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ? "padding" : "height"}` and `style={{ flex: 1 }}`.
  - Wrapped the modal form in a `ScrollView` with `bounces={false}` and `keyboardShouldPersistTaps="handled"`.
- **Files Changed**:
  - `apps/user-mobile/app/listing/[id]/index.tsx`
- **Android Verification Result**: **FIXED**. Keyboard opening preserves visibility of the message field and submit action without clipping or covering modal controls on short Android viewports.

---

## 8. F-06 — Semantic Status Badges (P2)

- **Previous Ad-hoc Styling**: Screens used arbitrary Tailwind color classes (`bg-emerald-100`, `border-amber-300`, `bg-sky-100`) or hardcoded hex strings (`#ECFDF5`, `#A7F3D0`, `#FFFBEB`) that failed to resolve reliably via NativeWind CSS interop on native Android.
- **Semantic Token Approach**:
  - Mapped all visit and inquiry statuses directly to semantic tokens from `@/theme/tokens`:
    - `CONFIRMED` / `RESPONDED`: `colors.success.light` background, `colors.success.border` border
    - `PENDING_CONFIRMATION` / `SUBMITTED`: `colors.warning.light` background, `colors.warning.border` border
    - `RESCHEDULE_REQUESTED` / `ACKNOWLEDGED`: `colors.info.light` background, `colors.info.border` border
    - `CANCELLED` / `CLOSED`: `colors.surfaceMuted` background, `colors.defaultBorder` border
    - `COMPLETED`: `colors.brand.light` background, `colors.brand.primary` border
- **Affected Screens**:
  - `apps/user-mobile/app/activity/inquiries/[inquiryId].tsx`
  - `apps/user-mobile/app/(app)/activity/index.tsx`
  - `apps/user-mobile/app/activity/visits/[visitId].tsx`
- **Android Verification Result**: **FIXED**. Badges across Activity list, Visit Detail, and Inquiry Detail now render consistently using centralized design tokens.

---

## 9. Files Modified

1. `apps/user-mobile/app/(auth)/sign-in.tsx`
2. `apps/user-mobile/src/features/auth/screens/AuthEntryScreen.tsx`
3. `apps/user-mobile/src/features/auth/screens/OtpVerificationScreen.tsx`
4. `apps/user-mobile/src/components/primitives/Button.tsx`
5. `apps/user-mobile/app/activity/visits/[visitId].tsx`
6. `apps/user-mobile/src/navigation/deep-links.ts`
7. `apps/user-mobile/tests/m05-deep-links-and-cache.test.ts`
8. `apps/user-mobile/app/listing/[id]/index.tsx`
9. `apps/user-mobile/app/activity/inquiries/[inquiryId].tsx`
10. `apps/user-mobile/app/(app)/activity/index.tsx`

---

## 10. Validation

- **Tests**: 97 passed / 0 failed (9 suites, 100% pass)
- **Typecheck**: PASS (`tsc --noEmit` exited 0)
- **Prettier**: PASS (all 10 modified files formatted cleanly)
- **Android QA**: PASS (tested on Android Pixel 8 emulator running Expo Go)

---

## 11. Remaining Limitations

- **Fixed**: F-01, F-02, F-03, F-04, F-05, F-06.
- **Verified**:
  - F-01 Sign-in layout full height and private route redirect verified.
  - F-02 Button heights (48px medium, 56px large) and background colors verified.
  - F-03 Visit Detail flex footer layout verified.
  - F-04 Development Expo Go deep-link parsing and route gating verified.
  - F-05 Inquiry modal keyboard handling verified.
  - F-06 Semantic token status badge rendering verified.
- **Blocked**: None.
- **Known Unrelated Backend Scope (Preserved outside M05 Phase 2B)**: Real database persistence, real listing module (L1), cryptographic JWT verification, and push notification infrastructure remain out-of-scope backend items as defined in milestone constraints.
