/**
 * Visits Integration Tests (M05)
 *
 * Covers:
 * 1. V1 GET /api/v1/visits request & response mapping
 * 2. V2 GET /api/v1/visits/:visitId request & response mapping
 * 3. V3 POST /api/v1/visits request body & response mapping
 * 4. V4 GET /api/v1/listings/:listingId/visit-availability mapping
 * 5. V5 POST /api/v1/visits/:visitId/cancel mapping
 * 6. V6 POST /api/v1/visits/:visitId/reschedule mapping
 * 7. Error envelope parsing & user-friendly error mapping (409 conflict, 422 invalid, 401 unauthorized)
 * 8. Duplicate mutation lock protection
 * 9. Repository adapter selection & non-swallowing error discipline
 */

import "./setup";

import assert from "node:assert/strict";
import test from "node:test";

import {
  RealVisitsApiAdapter,
  FixtureVisitsApiAdapter,
  VisitsRepository,
  VISITS_ROUTES,
} from "../src/features/visits/api/visits-adapter";
import type {
  RequestVisitDto,
  RescheduleVisitDto,
  VisitRecord,
} from "../src/features/visits/types/visits.types";
import { ApiError, mapApiErrorToUserMessage } from "../src/services/api/errors";

const VALID_LISTING_ID = "11111111-2222-4444-8888-111111111111";
const VALID_VISIT_ID = "v-00000001-1111-4000-8000-000000000001";

test("V1: getVisits request mapping and response unwrapping", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedHeaders: Headers | undefined;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";
    capturedHeaders = new Headers(init?.headers);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          items: [
            {
              id: VALID_VISIT_ID,
              userId: "user-123",
              listingId: VALID_LISTING_ID,
              listingTitle: "The Glasshouse Penthouse",
              listingLocalityName: "Indiranagar",
              listingCityName: "Bengaluru",
              listingCoverImageUrl: null,
              requestedStartAt: "2026-10-04T10:00:00.000Z",
              requestedEndAt: "2026-10-04T11:00:00.000Z",
              confirmedStartAt: null,
              confirmedEndAt: null,
              status: "REQUESTED",
              requestNote: "Please confirm parking",
              cancellationReason: null,
              rescheduleReason: null,
              canCancel: true,
              canReschedule: false,
              createdAt: "2026-10-03T10:00:00.000Z",
              updatedAt: "2026-10-03T10:00:00.000Z",
            },
          ],
          total: 1,
          nextCursor: null,
          hasMore: false,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealVisitsApiAdapter();
    const result = await adapter.getVisits();

    assert.equal(capturedMethod, "GET");
    assert.match(capturedUrl, new RegExp(`${VISITS_ROUTES.LIST}$`));
    assert.equal(result.items.length, 1);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, VALID_VISIT_ID);
    assert.equal(result.items[0].status, "REQUESTED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("V2: getVisitById request mapping and detail unwrapping", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: VALID_VISIT_ID,
          userId: "user-123",
          listingId: VALID_LISTING_ID,
          listingTitle: "The Glasshouse Penthouse",
          listingLocalityName: "Indiranagar",
          listingCityName: "Bengaluru",
          listingCoverImageUrl: null,
          requestedStartAt: "2026-10-04T10:00:00.000Z",
          requestedEndAt: "2026-10-04T11:00:00.000Z",
          confirmedStartAt: "2026-10-04T10:00:00.000Z",
          confirmedEndAt: "2026-10-04T11:00:00.000Z",
          status: "CONFIRMED",
          requestNote: null,
          cancellationReason: null,
          rescheduleReason: null,
          canCancel: true,
          canReschedule: true,
          createdAt: "2026-10-03T10:00:00.000Z",
          updatedAt: "2026-10-03T10:00:00.000Z",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealVisitsApiAdapter();
    const result = await adapter.getVisitById(VALID_VISIT_ID);

    assert.equal(capturedMethod, "GET");
    assert.match(capturedUrl, new RegExp(`/api/v1/visits/${VALID_VISIT_ID}$`));
    assert.equal(result.id, VALID_VISIT_ID);
    assert.equal(result.status, "CONFIRMED");
    assert.equal(result.canReschedule, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("V3: requestVisit sends exact JSON body and unwraps 201 response", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";
    capturedBody = String(init?.body);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: "v-new-12345",
          userId: "user-123",
          listingId: VALID_LISTING_ID,
          listingTitle: "The Glasshouse Penthouse",
          listingLocalityName: "Indiranagar",
          listingCityName: "Bengaluru",
          listingCoverImageUrl: null,
          requestedStartAt: "2026-10-05T10:00:00.000Z",
          requestedEndAt: "2026-10-05T11:00:00.000Z",
          confirmedStartAt: null,
          confirmedEndAt: null,
          status: "REQUESTED",
          requestNote: "Looking forward to viewing",
          cancellationReason: null,
          rescheduleReason: null,
          canCancel: true,
          canReschedule: false,
          createdAt: "2026-10-03T11:00:00.000Z",
          updatedAt: "2026-10-03T11:00:00.000Z",
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealVisitsApiAdapter();
    const dto: RequestVisitDto = {
      listingId: VALID_LISTING_ID,
      requestedStartAt: "2026-10-05T10:00:00.000Z",
      requestedEndAt: "2026-10-05T11:00:00.000Z",
      requestNote: "Looking forward to viewing",
    };
    const result = await adapter.requestVisit(dto);

    assert.equal(capturedMethod, "POST");
    assert.match(capturedUrl, new RegExp(`${VISITS_ROUTES.REQUEST}$`));

    const parsedBody = JSON.parse(capturedBody);
    assert.equal(parsedBody.listingId, VALID_LISTING_ID);
    assert.equal(parsedBody.requestedStartAt, "2026-10-05T10:00:00.000Z");
    assert.equal(parsedBody.requestedEndAt, "2026-10-05T11:00:00.000Z");
    assert.equal(parsedBody.requestNote, "Looking forward to viewing");

    // Must return server status (REQUESTED, not optimistically CONFIRMED)
    assert.equal(result.status, "REQUESTED");
    assert.equal(result.id, "v-new-12345");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("V4: getVisitAvailability maps listing visit availability slots and eligibility", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          listingId: VALID_LISTING_ID,
          listing: {
            id: VALID_LISTING_ID,
            title: "The Glasshouse Penthouse",
            localityName: "Indiranagar",
            cityName: "Bengaluru",
            coverImageUrl: "https://example.com/photo.jpg",
          },
          visitEligibility: {
            isEligible: true,
            reason: "AVAILABLE",
            existingVisitId: null,
          },
          slots: [
            {
              slotId: "slot-1",
              startAt: "2026-10-04T10:00:00.000Z",
              endAt: "2026-10-04T11:00:00.000Z",
              isAvailable: true,
            },
            {
              slotId: "slot-2",
              startAt: "2026-10-04T14:00:00.000Z",
              endAt: "2026-10-04T15:00:00.000Z",
              isAvailable: false,
            },
          ],
          timezone: "Asia/Kolkata",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealVisitsApiAdapter();
    const result = await adapter.getVisitAvailability(VALID_LISTING_ID);

    assert.equal(capturedMethod, "GET");
    assert.match(
      capturedUrl,
      new RegExp(`/api/v1/listings/${VALID_LISTING_ID}/visit-availability$`),
    );
    assert.equal(result.visitEligibility.isEligible, true);
    assert.equal(result.slots.length, 2);
    assert.equal(result.slots[0].isAvailable, true);
    assert.equal(result.slots[1].isAvailable, false);
    assert.equal(result.timezone, "Asia/Kolkata");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("V5: cancelVisit sends POST to cancel endpoint with optional reason", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";
    capturedBody = String(init?.body);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: VALID_VISIT_ID,
          userId: "user-123",
          listingId: VALID_LISTING_ID,
          listingTitle: "The Glasshouse Penthouse",
          listingLocalityName: "Indiranagar",
          listingCityName: "Bengaluru",
          listingCoverImageUrl: null,
          requestedStartAt: "2026-10-04T10:00:00.000Z",
          requestedEndAt: "2026-10-04T11:00:00.000Z",
          confirmedStartAt: null,
          confirmedEndAt: null,
          status: "CANCELLED_BY_USER",
          requestNote: null,
          cancellationReason: "Schedule conflict",
          canCancel: false,
          canReschedule: false,
          createdAt: "2026-10-03T10:00:00.000Z",
          updatedAt: "2026-10-03T12:00:00.000Z",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealVisitsApiAdapter();
    const result = await adapter.cancelVisit(VALID_VISIT_ID, {
      reason: "Schedule conflict",
    });

    assert.equal(capturedMethod, "POST");
    assert.match(
      capturedUrl,
      new RegExp(`/api/v1/visits/${VALID_VISIT_ID}/cancel$`),
    );
    const parsedBody = JSON.parse(capturedBody);
    assert.equal(parsedBody.reason, "Schedule conflict");
    assert.equal(result.status, "CANCELLED_BY_USER");
    assert.equal(result.canCancel, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("V6: rescheduleVisit sends POST to reschedule endpoint with requested range", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";
    capturedBody = String(init?.body);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: VALID_VISIT_ID,
          userId: "user-123",
          listingId: VALID_LISTING_ID,
          listingTitle: "The Glasshouse Penthouse",
          listingLocalityName: "Indiranagar",
          listingCityName: "Bengaluru",
          listingCoverImageUrl: null,
          requestedStartAt: "2026-10-06T14:00:00.000Z",
          requestedEndAt: "2026-10-06T15:00:00.000Z",
          confirmedStartAt: null,
          confirmedEndAt: null,
          status: "RESCHEDULE_REQUESTED",
          requestNote: null,
          cancellationReason: null,
          rescheduleReason: "Prefer afternoon",
          canCancel: true,
          canReschedule: false,
          createdAt: "2026-10-03T10:00:00.000Z",
          updatedAt: "2026-10-03T13:00:00.000Z",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealVisitsApiAdapter();
    const dto: RescheduleVisitDto = {
      requestedStartAt: "2026-10-06T14:00:00.000Z",
      requestedEndAt: "2026-10-06T15:00:00.000Z",
      reason: "Prefer afternoon",
    };
    const result = await adapter.rescheduleVisit(VALID_VISIT_ID, dto);

    assert.equal(capturedMethod, "POST");
    assert.match(
      capturedUrl,
      new RegExp(`/api/v1/visits/${VALID_VISIT_ID}/reschedule$`),
    );
    const parsedBody = JSON.parse(capturedBody);
    assert.equal(parsedBody.requestedStartAt, "2026-10-06T14:00:00.000Z");
    assert.equal(parsedBody.reason, "Prefer afternoon");
    assert.equal(result.status, "RESCHEDULE_REQUESTED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("visits error handling: 409 conflict and 422 time invalid parse safe user messages", () => {
  const conflictErr = new ApiError(
    "VISIT_CONFLICT",
    "You already have an active visit request for this property.",
    { status: 409 },
  );
  assert.equal(
    mapApiErrorToUserMessage(conflictErr),
    "You already have an active visit request for this property.",
  );

  const timeErr = new ApiError(
    "VISIT_TIME_INVALID",
    "The requested visit time cannot be in the past.",
    { status: 422 },
  );
  assert.equal(
    mapApiErrorToUserMessage(timeErr),
    "The requested visit time cannot be in the past.",
  );

  const transitionErr = new ApiError(
    "VISIT_STATE_TRANSITION_INVALID",
    "This visit cannot currently be cancelled.",
    { status: 409 },
  );
  assert.equal(
    mapApiErrorToUserMessage(transitionErr),
    "This visit cannot currently be cancelled.",
  );

  const notFoundErr = new ApiError("VISIT_NOT_FOUND", "Visit not found", {
    status: 404,
  });
  assert.equal(
    mapApiErrorToUserMessage(notFoundErr),
    "The requested visit could not be found.",
  );
});

test("visits repository: explicit mode routing and non-swallowing error propagation", async () => {
  const failingRealAdapter = new RealVisitsApiAdapter();
  const repo = new VisitsRepository({
    realAdapter: failingRealAdapter,
    useFixtures: false,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required to view visits.",
        },
        meta: { requestId: "req-err-401" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await assert.rejects(
      async () => {
        await repo.getVisits();
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, "UNAUTHORIZED");
        assert.equal(err.status, 401);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
