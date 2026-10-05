# M05 — Frontend ↔ Backend Integration Audit

**Repository:** `E:\zero-brokerage`  
**Frontend Branch:** `feat/user-mobile`  
**Backend Branch:** `feat/shared-core-backend`  
**Date:** October 2026  
**Auditor:** Antigravity Mobile Core Engineering

---

## 1. Executive Summary

Milestone M05 integrates the User Mobile App with the Shared Core Backend for **Property Detail Experience & Interactive Visit Booking** (V1–V6, I1–I3, and L1).

Prior to this audit, previous notes labeled operations as "INTEGRATED" prematurely. An exhaustive trace of the end-to-end stack:
$$\text{Screen} \longrightarrow \text{Feature Hook} \longrightarrow \text{Domain API / Repository} \longrightarrow \text{Central apiRequest} \longrightarrow \text{HTTP Layer} \longrightarrow \text{Backend Fastify Routes} \longrightarrow \text{Response / Error Adapters} \longrightarrow \text{UI}$$
revealed that:

1. **Visits (V1–V6)**: Backend fixture-backed Fastify routes (`/api/v1/visits`, `/api/v1/visits/:visitId`, `/api/v1/listings/:listingId/visit-availability`, etc.) were implemented on the backend. The frontend had only placeholder UI text. We established the complete architecture (`src/features/visits/*`, screens `listing/[id]/schedule.tsx`, `activity/visits/[visitId].tsx`), matching all request/response schemas, UUID validation, single-flight submission locks, status transitions, and error envelopes.
2. **Inquiries (I1–I3)**: Backend fixture-backed Fastify routes (`/api/v1/inquiries`, `/api/v1/inquiries/:inquiryId`) were implemented with Zod validation. The frontend had no inquiry clients. We implemented `src/features/inquiries/*`, inquiry modal in listing detail, and `activity/inquiries/[inquiryId].tsx`.
3. **Listing (L1)**: `GET /api/v1/listings/:listingId` is **NOT IMPLEMENTED** on the backend Fastify routes (the real listing module is not yet mounted in `services/api`). The frontend cleanly handles this via the `DiscoveryRepository` adapter boundary (`RealDiscoveryApiAdapter` propagates 404 cleanly; `FixtureDiscoveryApiAdapter` provides presentation data during development).
4. **Deep Links**: Supported and strictly validated for `/activity/visits/:visitId`, `/activity/inquiries/:inquiryId`, and `/listing/:listingId/schedule`.
5. **Session Isolation**: Centralized `queryCache` enforces that private visit and inquiry data is wiped immediately upon logout (`queryCache.clearAll()`).

---

## 2. Endpoint Contract Matrix

| ID     | Operation                    | Frontend Path                                     | Backend Path                                     | Method | Request Match | Response Match      | Error Match | Integrated          | Notes                                                                                                                                                                                                                                                |
| ------ | ---------------------------- | ------------------------------------------------- | ------------------------------------------------ | ------ | ------------- | ------------------- | ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **V1** | List user visits             | `src/features/visits/api/visits-adapter.ts`       | `/api/v1/visits`                                 | `GET`  | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Bearer auth header required. Returns sorted visit list with pagination metadata.                                                                                                                                                                     |
| **V2** | Get visit detail             | `src/features/visits/api/visits-adapter.ts`       | `/api/v1/visits/:visitId`                        | `GET`  | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Validates RFC 4122 UUID. Auth check enforced. 403 if not owner, 404 if not found.                                                                                                                                                                    |
| **V3** | Request a visit              | `src/features/visits/api/visits-adapter.ts`       | `/api/v1/visits`                                 | `POST` | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Validates listing UUID, ISO 8601 offset start/end datetime, and optional note (<=500 chars). Returns 201 with status `REQUESTED`. 409 on existing active visit conflict.                                                                             |
| **V4** | Listing visit availability   | `src/features/visits/api/visits-adapter.ts`       | `/api/v1/listings/:listingId/visit-availability` | `GET`  | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Strict UUID check on listingId. Returns server-generated slots & eligibility reason (`AVAILABLE`, `EXISTING_ACTIVE_VISIT`, `LISTING_UNAVAILABLE`).                                                                                                   |
| **V5** | Cancel visit                 | `src/features/visits/api/visits-adapter.ts`       | `/api/v1/visits/:visitId/cancel`                 | `POST` | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Optional reason (<=300 chars). Transition check enforced on server. Returns updated record with status `CANCELLED_BY_USER`.                                                                                                                          |
| **V6** | Reschedule visit             | `src/features/visits/api/visits-adapter.ts`       | `/api/v1/visits/:visitId/reschedule`             | `POST` | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Validates new start/end time and optional reason. Server enforces `canReschedule` (available for confirmed visits). Returns status `RESCHEDULE_REQUESTED`.                                                                                           |
| **I1** | Submit inquiry               | `src/features/inquiries/api/inquiries-adapter.ts` | `/api/v1/inquiries`                              | `POST` | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Validates listing UUID and message (10–1000 chars). Duplicate check prevents active duplicate inquiries (409). Returns 201 with status `SUBMITTED`.                                                                                                  |
| **I2** | List user inquiries          | `src/features/inquiries/api/inquiries-adapter.ts` | `/api/v1/inquiries`                              | `GET`  | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Bearer auth header required. Returns sorted user inquiries.                                                                                                                                                                                          |
| **I3** | Get inquiry detail           | `src/features/inquiries/api/inquiries-adapter.ts` | `/api/v1/inquiries/:inquiryId`                   | `GET`  | **PASS**      | **PASS**            | **PASS**    | **PASS**            | Validates UUID. 403 if not owner, 404 if not found. Returns full inquiry record.                                                                                                                                                                     |
| **L1** | Listing detail + eligibility | `src/features/discovery/api/discovery-adapter.ts` | `/api/v1/listings/:listingId`                    | `GET`  | **FAIL**      | **NOT IMPLEMENTED** | **PASS**    | **NOT IMPLEMENTED** | Backend has no mounted Fastify route for `/api/v1/listings/:id` (known limitation). Frontend handles via `DiscoveryRepository` adapter boundary. Real adapter accurately propagates 404 without crashing; fixture adapter serves presentation model. |

---

## 3. Discovered Mismatches & Frontend Resolutions

| Area                            | Discovered Mismatch                                                                                                                                                                           | Resolution Applied                                                                                                                                                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Architecture**            | Visited and Inquiry code was completely missing from `apps/user-mobile/src/features`. Screens had static text or unlinked Alert placeholders.                                                 | Implemented `src/features/visits/` and `src/features/inquiries/` adhering to the standard: Screen → Hook → Repository → API Adapter → Central `apiRequest`.                                                                                                                                                |
| **Error Message Mapping**       | `errors.ts` was hardcoding 401 UNAUTHORIZED to "Invalid verification code. Please check and try again.", which was specific to auth OTP and incorrect for visits/inquiries.                   | Updated `mapApiErrorToUserMessage` to recognize domain error codes (`VISIT_CONFLICT`, `DUPLICATE_ACTIVE_INQUIRY`, `VISIT_STATE_TRANSITION_INVALID`, `VISIT_TIME_INVALID`, `FORBIDDEN`, `VISIT_NOT_FOUND`, `INQUIRY_NOT_FOUND`) and distinguish OTP 401s from session 401s ("Please sign in to continue."). |
| **Deep Link Parser**            | `src/navigation/deep-links.ts` only parsed top-level tabs and `/listing/:id`. Did not parse `/activity/visits/:visitId`, `/activity/inquiries/:inquiryId`, or `/listing/:listingId/schedule`. | Added strict parsing for all three deep links with RFC 4122 UUID validation and safe fallback to Discover on invalid inputs.                                                                                                                                                                               |
| **Query Cache & Invalidation**  | Cache invalidation was ad-hoc; no centralized query keys existed for visits and inquiries. Mutations did not automatically invalidate query keys.                                             | Created `src/services/api/query-cache.ts` with standardized keys (`visits.list`, `visits.detail:id`, `visits.availability:id`, `inquiries.list`, `inquiries.detail:id`). Hooks auto-subscribe and refetch when keys are invalidated after mutations.                                                       |
| **Session Isolation on Logout** | Cached server state in memory could survive logout and account switching.                                                                                                                     | Wired `queryCache.clearAll()` directly into `logout()` in `src/services/auth/auth-service.ts`.                                                                                                                                                                                                             |
| **Activity Screen**             | `app/(app)/activity/index.tsx` was a static mockup with dummy journey text.                                                                                                                   | Replaced with real server-state rendering via `useVisits` and `useInquiries`, including tab toggle, pull-to-refresh, loading skeletons, empty states, and status badges.                                                                                                                                   |
| **Visit Detail Screen**         | Did not exist.                                                                                                                                                                                | Created `app/activity/visits/[visitId].tsx` with authoritative fetch by ID, UUID validation, status badges, cancel with confirmation modal, and reschedule slot picker.                                                                                                                                    |
| **Schedule Visit Screen**       | Did not exist.                                                                                                                                                                                | Created `app/listing/[id]/schedule.tsx` with server-controlled slots, date picker, review step, single-submission lock, and direct navigation to visit detail.                                                                                                                                             |
| **Inquiry Detail Screen**       | Did not exist.                                                                                                                                                                                | Created `app/activity/inquiries/[inquiryId].tsx` with authoritative fetch by ID, UUID validation, and full thread review.                                                                                                                                                                                  |

---

## 4. Backend Known Limitations & Architectural Notes

The following characteristics and limitations of the Shared Core Backend (`services/api`) were confirmed:

1. **In-Memory Fixture Storage**: Visits and Inquiries in `services/api/src/modules/visits/` and `inquiries/` operate on Fastify plugin memory stores (`visitStore`, `inquiryStore`). State does not persist across server restarts.
2. **Auth Header Stubs**: `extractUserFromToken` inspects the `Authorization: Bearer <token>` header for length >= 10 and returns a synthetic fixture user ID (`fixture-user-00000000-0000-4000-8000-000000000001`). JWT validation is not yet wired to a cryptographic verification pipeline.
3. **No Real Listing Module in Fastify**: Fastify only registers routes for `/health`, `/api/v1/visits`, `/api/v1/listings/:listingId/visit-availability`, and `/api/v1/inquiries`. Route `GET /api/v1/listings/:listingId` (L1) returns a 404 Route Not Found.
4. **No Background Expiry/Reminder Jobs**: Visit expiry transitions and reminder push dispatches are deferred to future milestones.
5. **No Push Delivery Infrastructure**: No APNs/FCM delivery layer mounted.

---

## 5. Test Suite Verification

- **Total Test Suites**: 9
- **Total Tests**: 95 passing (0 failing)
- **New Integration Tests Added**: 22 tests across:
  - `tests/visits-integration.test.ts` (V1–V6 contract & error tests)
  - `tests/inquiries-integration.test.ts` (I1–I3 contract & error tests)
  - `tests/m05-deep-links-and-cache.test.ts` (Deep links, L1 404 propagation, query cache isolation)
- **TypeScript Typecheck**: `npm --prefix apps/user-mobile run typecheck` passes with 0 errors.
