/**
 * M05 Deep-Links, L1 Listing Contract, and Query Cache Isolation Tests
 *
 * Covers:
 * 1. Deep link parsing for /activity/visits/:visitId, /activity/inquiries/:inquiryId, /listing/:listingId/schedule
 * 2. Strict UUID enforcement on deep links with safe Discover fallback
 * 3. L1 listing detail route & adapter mapping (verifying error propagation when endpoint missing)
 * 4. Centralized Query Cache invalidation & Logout private-state isolation
 */

import "./setup";

import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDeepLink,
  resolveNotificationTarget,
} from "../src/navigation/deep-links";
import {
  getInquiryDetailRoute,
  getListingScheduleRoute,
  getVisitDetailRoute,
  ROUTES,
} from "../src/navigation/routes";
import { RealDiscoveryApiAdapter } from "../src/features/discovery/api/discovery-adapter";
import { QUERY_KEYS, queryCache } from "../src/services/api/query-cache";
import { ApiError } from "../src/services/api/errors";

const VALID_UUID = "11111111-2222-4444-8888-111111111111";
const INVALID_UUID = "invalid-not-a-uuid";

test("deep-links: parses /activity/visits/:visitId with valid UUID", () => {
  const result = parseDeepLink(
    `zero-brokerage://activity/visits/${VALID_UUID}`,
  );
  assert.equal(result.isValid, true);
  assert.equal(result.requiresAuth, true);
  assert.equal(result.targetPath, `/activity/visits/${VALID_UUID}`);
  assert.equal(result.destination.type, "ACTIVITY_VISIT_DETAIL");
  if (result.destination.type === "ACTIVITY_VISIT_DETAIL") {
    assert.equal(result.destination.visitId, VALID_UUID);
  }
});

test("deep-links: rejects /activity/visits/:visitId with invalid UUID and falls back to Discover", () => {
  const result = parseDeepLink(
    `zero-brokerage://activity/visits/${INVALID_UUID}`,
  );
  assert.equal(result.isValid, false);
  assert.equal(result.destination.type, "UNKNOWN");
  assert.equal(result.targetPath, "/(app)/discover");
});

test("deep-links: parses /activity/inquiries/:inquiryId with valid UUID", () => {
  const result = parseDeepLink(
    `zero-brokerage://activity/inquiries/${VALID_UUID}`,
  );
  assert.equal(result.isValid, true);
  assert.equal(result.requiresAuth, true);
  assert.equal(result.targetPath, `/activity/inquiries/${VALID_UUID}`);
  assert.equal(result.destination.type, "ACTIVITY_INQUIRY_DETAIL");
  if (result.destination.type === "ACTIVITY_INQUIRY_DETAIL") {
    assert.equal(result.destination.inquiryId, VALID_UUID);
  }
});

test("deep-links: rejects /activity/inquiries/:inquiryId with invalid UUID", () => {
  const result = parseDeepLink(
    `zero-brokerage://activity/inquiries/${INVALID_UUID}`,
  );
  assert.equal(result.isValid, false);
  assert.equal(result.destination.type, "UNKNOWN");
  assert.equal(result.targetPath, "/(app)/discover");
});

test("deep-links: parses /listing/:listingId/schedule with valid UUID", () => {
  const result = parseDeepLink(
    `zero-brokerage://listing/${VALID_UUID}/schedule`,
  );
  assert.equal(result.isValid, true);
  assert.equal(result.requiresAuth, true);
  assert.equal(result.targetPath, `/listing/${VALID_UUID}/schedule`);
  assert.equal(result.destination.type, "LISTING_SCHEDULE");
  if (result.destination.type === "LISTING_SCHEDULE") {
    assert.equal(result.destination.listingId, VALID_UUID);
  }
});

test("deep-links: rejects /listing/:listingId/schedule with invalid UUID", () => {
  const result = parseDeepLink(
    `zero-brokerage://listing/${INVALID_UUID}/schedule`,
  );
  assert.equal(result.isValid, false);
  assert.equal(result.destination.type, "UNKNOWN");
  assert.equal(result.targetPath, "/(app)/discover");
});

test("deep-links: parses Expo Go development URL in dev mode", () => {
  const result = parseDeepLink(
    `exp://127.0.0.1:8081/--/listing/${VALID_UUID}/schedule`,
  );
  assert.equal(result.isValid, true);
  assert.equal(result.requiresAuth, true);
  assert.equal(result.targetPath, `/listing/${VALID_UUID}/schedule`);
  assert.equal(result.destination.type, "LISTING_SCHEDULE");
});

test("deep-links: handles malformed Expo Go URLs gracefully", () => {
  const result = parseDeepLink("exp://127.0.0.1:8081/missing-delimiter");
  assert.equal(result.isValid, false);
  assert.equal(result.destination.type, "UNKNOWN");
  assert.equal(result.targetPath, "/(app)/discover");
});

test("navigation builders: construct valid paths and throw on invalid identifiers", () => {
  assert.equal(
    getVisitDetailRoute(VALID_UUID),
    `/activity/visits/${VALID_UUID}`,
  );
  assert.equal(
    getInquiryDetailRoute(VALID_UUID),
    `/activity/inquiries/${VALID_UUID}`,
  );
  assert.equal(
    getListingScheduleRoute(VALID_UUID),
    `/listing/${VALID_UUID}/schedule`,
  );

  assert.throws(() => getVisitDetailRoute(INVALID_UUID), /invalid visit/i);
  assert.throws(() => getInquiryDetailRoute(INVALID_UUID), /invalid inquiry/i);
  assert.throws(
    () => getListingScheduleRoute(INVALID_UUID),
    /invalid listing/i,
  );
});

test("L1: RealDiscoveryApiAdapter.fetchListingById calls /api/v1/listings/:id and propagates 404 when unmounted on backend", async () => {
  const adapter = new RealDiscoveryApiAdapter();
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";

  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify({
        error: {
          code: "NOT_FOUND",
          message: "Route GET:/api/v1/listings/:id not found",
        },
        meta: { requestId: "req-err-404" },
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await assert.rejects(
      async () => {
        await adapter.fetchListingById(VALID_UUID);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        assert.equal(err.code, "NOT_FOUND");
        return true;
      },
    );
    assert.match(capturedUrl, new RegExp(`/api/v1/listings/${VALID_UUID}$`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("query cache: subscription, targeted invalidation, and logout isolation", () => {
  queryCache.clearAll();

  let visitsListInvalidated = 0;
  let visitDetailInvalidated = 0;
  let otherInvalidated = 0;

  const unsub1 = queryCache.subscribe(QUERY_KEYS.visits.list(), () => {
    visitsListInvalidated++;
  });

  const unsub2 = queryCache.subscribe(
    QUERY_KEYS.visits.detail(VALID_UUID),
    () => {
      visitDetailInvalidated++;
    },
  );

  const unsub3 = queryCache.subscribe(QUERY_KEYS.inquiries.list(), () => {
    otherInvalidated++;
  });

  // Store cached data
  queryCache.set(QUERY_KEYS.visits.list(), [{ id: "v1" }]);
  queryCache.set(QUERY_KEYS.visits.detail(VALID_UUID), { id: VALID_UUID });

  assert.ok(queryCache.get(QUERY_KEYS.visits.list()));
  assert.ok(queryCache.get(QUERY_KEYS.visits.detail(VALID_UUID)));

  // Target invalidation for visits.list only
  queryCache.invalidate(QUERY_KEYS.visits.list());

  assert.equal(visitsListInvalidated, 1);
  assert.equal(visitDetailInvalidated, 0);
  assert.equal(otherInvalidated, 0);
  assert.equal(queryCache.get(QUERY_KEYS.visits.list()), undefined);
  assert.ok(queryCache.get(QUERY_KEYS.visits.detail(VALID_UUID)));

  // Invalidate visits prefix
  queryCache.invalidate("visits.detail");
  assert.equal(visitDetailInvalidated, 1);
  assert.equal(queryCache.get(QUERY_KEYS.visits.detail(VALID_UUID)), undefined);

  // Logout isolation: clearAll() wipes everything
  queryCache.clearAll();
  assert.equal(queryCache.get(QUERY_KEYS.visits.list()), undefined);
  assert.equal(queryCache.get(QUERY_KEYS.visits.detail(VALID_UUID)), undefined);

  unsub1();
  unsub2();
  unsub3();
});

test("notification-routing: routes authenticated VISIT_DETAIL payload to visit detail route", () => {
  const result = resolveNotificationTarget(
    {
      targetType: "VISIT_DETAIL",
      visitId: VALID_UUID,
      // Untrusted payload fields that should NOT affect routing
      status: "CONFIRMED",
      confirmedTime: "2026-10-06T10:00:00.000Z",
    },
    true,
  );

  assert.equal(result.status, "NAVIGATE");
  if (result.status === "NAVIGATE") {
    assert.equal(result.route, `/activity/visits/${VALID_UUID}`);
    assert.equal(result.targetType, "VISIT_DETAIL");
    assert.equal(result.resourceId, VALID_UUID);
  }
});

test("notification-routing: requires authentication for VISIT_DETAIL when user is unauthenticated", () => {
  const result = resolveNotificationTarget(
    {
      targetType: "VISIT_DETAIL",
      visitId: VALID_UUID,
    },
    false,
  );

  assert.equal(result.status, "REQUIRES_AUTH");
  if (result.status === "REQUIRES_AUTH") {
    assert.equal(result.redirectRoute, "/(auth)/sign-in");
    assert.equal(result.intendedRoute, `/activity/visits/${VALID_UUID}`);
  }
});

test("notification-routing: rejects invalid visitId in payload and falls back to Discover", () => {
  const result = resolveNotificationTarget(
    {
      targetType: "VISIT_DETAIL",
      visitId: INVALID_UUID,
    },
    true,
  );

  assert.equal(result.status, "INVALID");
  if (result.status === "INVALID") {
    assert.equal(result.fallbackRoute, "/(app)/discover");
  }
});

test("notification-routing: routes INQUIRY_DETAIL and SCHEDULE_VISIT payloads correctly", () => {
  const inqResult = resolveNotificationTarget(
    {
      targetType: "INQUIRY_DETAIL",
      inquiryId: VALID_UUID,
    },
    true,
  );
  assert.equal(inqResult.status, "NAVIGATE");
  if (inqResult.status === "NAVIGATE") {
    assert.equal(inqResult.route, `/activity/inquiries/${VALID_UUID}`);
  }

  const schedResult = resolveNotificationTarget(
    {
      targetType: "SCHEDULE_VISIT",
      listingId: VALID_UUID,
    },
    true,
  );
  assert.equal(schedResult.status, "NAVIGATE");
  if (schedResult.status === "NAVIGATE") {
    assert.equal(schedResult.route, `/listing/${VALID_UUID}/schedule`);
  }
});

test("notification-routing: parses embedded deepLinkUrl with authentication check", () => {
  const deepLinkPayload = {
    deepLinkUrl: `zero-brokerage://activity/visits/${VALID_UUID}`,
  };

  const authResult = resolveNotificationTarget(deepLinkPayload, true);
  assert.equal(authResult.status, "NAVIGATE");

  const unauthResult = resolveNotificationTarget(deepLinkPayload, false);
  assert.equal(unauthResult.status, "REQUIRES_AUTH");
});
