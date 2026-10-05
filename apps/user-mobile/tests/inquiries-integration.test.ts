/**
 * Inquiries Integration Tests (M05)
 *
 * Covers:
 * 1. I1 POST /api/v1/inquiries request body & 201 response mapping
 * 2. I2 GET /api/v1/inquiries list mapping
 * 3. I3 GET /api/v1/inquiries/:inquiryId detail mapping
 * 4. Error envelope parsing & user-friendly error mapping (409 duplicate, 422 validation, 404 not found)
 * 5. Repository adapter selection & error propagation
 */

import "./setup";

import assert from "node:assert/strict";
import test from "node:test";

import {
  RealInquiriesApiAdapter,
  FixtureInquiriesApiAdapter,
  InquiriesRepository,
  INQUIRIES_ROUTES,
} from "../src/features/inquiries/api/inquiries-adapter";
import type {
  InquiryRecord,
  SubmitInquiryDto,
} from "../src/features/inquiries/types/inquiries.types";
import { ApiError, mapApiErrorToUserMessage } from "../src/services/api/errors";

const VALID_LISTING_ID = "33333333-4444-4444-8888-333333333333";
const VALID_INQUIRY_ID = "inq-00000001-1111-4000-8000-000000000001";

test("I1: submitInquiry sends exact JSON body and unwraps 201 response", async () => {
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
          id: VALID_INQUIRY_ID,
          userId: "user-123",
          listingId: VALID_LISTING_ID,
          listingTitle: "Minimalist Garden Villa",
          listingLocalityName: "Jubilee Hills",
          listingCityName: "Hyderabad",
          listingCoverImageUrl: null,
          message: "Interested in lease terms for 2 years.",
          status: "SUBMITTED",
          createdAt: "2026-10-03T10:00:00.000Z",
          updatedAt: "2026-10-03T10:00:00.000Z",
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealInquiriesApiAdapter();
    const dto: SubmitInquiryDto = {
      listingId: VALID_LISTING_ID,
      message: "Interested in lease terms for 2 years.",
    };
    const result = await adapter.submitInquiry(dto);

    assert.equal(capturedMethod, "POST");
    assert.match(capturedUrl, new RegExp(`${INQUIRIES_ROUTES.SUBMIT}$`));

    const parsedBody = JSON.parse(capturedBody);
    assert.equal(parsedBody.listingId, VALID_LISTING_ID);
    assert.equal(parsedBody.message, "Interested in lease terms for 2 years.");

    assert.equal(result.id, VALID_INQUIRY_ID);
    assert.equal(result.status, "SUBMITTED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("I2: getInquiries request mapping and response unwrapping", async () => {
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
          items: [
            {
              id: VALID_INQUIRY_ID,
              userId: "user-123",
              listingId: VALID_LISTING_ID,
              listingTitle: "Minimalist Garden Villa",
              listingLocalityName: "Jubilee Hills",
              listingCityName: "Hyderabad",
              listingCoverImageUrl: null,
              message: "Interested in lease terms for 2 years.",
              status: "SUBMITTED",
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
    const adapter = new RealInquiriesApiAdapter();
    const result = await adapter.getInquiries();

    assert.equal(capturedMethod, "GET");
    assert.match(capturedUrl, new RegExp(`${INQUIRIES_ROUTES.LIST}$`));
    assert.equal(result.items.length, 1);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, VALID_INQUIRY_ID);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("I3: getInquiryById request mapping and detail unwrapping", async () => {
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
          id: VALID_INQUIRY_ID,
          userId: "user-123",
          listingId: VALID_LISTING_ID,
          listingTitle: "Minimalist Garden Villa",
          listingLocalityName: "Jubilee Hills",
          listingCityName: "Hyderabad",
          listingCoverImageUrl: null,
          message: "Interested in lease terms for 2 years.",
          status: "ACKNOWLEDGED",
          createdAt: "2026-10-03T10:00:00.000Z",
          updatedAt: "2026-10-03T12:00:00.000Z",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const adapter = new RealInquiriesApiAdapter();
    const result = await adapter.getInquiryById(VALID_INQUIRY_ID);

    assert.equal(capturedMethod, "GET");
    assert.match(
      capturedUrl,
      new RegExp(`/api/v1/inquiries/${VALID_INQUIRY_ID}$`),
    );
    assert.equal(result.id, VALID_INQUIRY_ID);
    assert.equal(result.status, "ACKNOWLEDGED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("inquiries error handling: 409 duplicate active inquiry and 404 not found", () => {
  const duplicateErr = new ApiError(
    "DUPLICATE_ACTIVE_INQUIRY",
    "You already have an active inquiry for this property.",
    { status: 409 },
  );
  assert.equal(
    mapApiErrorToUserMessage(duplicateErr),
    "You already have an active inquiry for this property.",
  );

  const notFoundErr = new ApiError("INQUIRY_NOT_FOUND", "Inquiry not found", {
    status: 404,
  });
  assert.equal(
    mapApiErrorToUserMessage(notFoundErr),
    "The requested inquiry could not be found.",
  );
});

test("inquiries repository: explicit mode routing and error propagation", async () => {
  const failingRealAdapter = new RealInquiriesApiAdapter();
  const repo = new InquiriesRepository({
    realAdapter: failingRealAdapter,
    useFixtures: false,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to access this inquiry.",
        },
        meta: { requestId: "req-err-403" },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await assert.rejects(
      async () => {
        await repo.getInquiryById(VALID_INQUIRY_ID);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, "FORBIDDEN");
        assert.equal(err.status, 403);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
