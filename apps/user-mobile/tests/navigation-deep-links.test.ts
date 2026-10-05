import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isValidUuid,
  getListingDetailRoute,
  getInquiryDetailRoute,
  getVisitDetailRoute,
  sanitizeRouteParams,
} from "../src/navigation/routes";
import { parseDeepLink } from "../src/navigation/deep-links";

describe("navigation: routes & UUID validation", () => {
  it("validates valid RFC 4122 UUIDs", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const uppercaseUuid = "A987FBC9-4BED-4278-9F07-91A22EBB4A32";

    assert.equal(isValidUuid(validUuid), true);
    assert.equal(isValidUuid(uppercaseUuid), true);
  });

  it("rejects invalid, malformed, or injection strings as UUIDs", () => {
    assert.equal(isValidUuid(""), false);
    assert.equal(isValidUuid("not-a-uuid"), false);
    assert.equal(isValidUuid("12345"), false);
    assert.equal(isValidUuid("123e4567-e89b-12d3-a456-42661417400Z"), false);
    assert.equal(
      isValidUuid("123e4567-e89b-12d3-a456-426614174000; DROP TABLE listings;"),
      false,
    );
    assert.equal(isValidUuid(null), false);
    assert.equal(isValidUuid(undefined), false);
    assert.equal(isValidUuid(12345), false);
  });

  it("getListingDetailRoute constructs path with valid UUID", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const route = getListingDetailRoute(validUuid);
    assert.equal(route, `/listing/${validUuid}`);
  });

  it("getListingDetailRoute throws on invalid identifier", () => {
    assert.throws(
      () => getListingDetailRoute("invalid-id"),
      /Invalid listing identifier/,
    );
  });

  it("getInquiryDetailRoute & getVisitDetailRoute handle UUIDs and prefixed fixture identifiers", () => {
    const canonicalUuid = "550e8400-e29b-41d4-a716-446655440000";
    const fixtureInquiryId = "inq-00000002-2222-4000-8000-000000000002";
    const fixtureVisitId = "v-00000001-1111-4000-8000-000000000001";

    assert.equal(
      getInquiryDetailRoute(canonicalUuid),
      `/activity/inquiries/${canonicalUuid}`,
    );
    assert.equal(
      getInquiryDetailRoute(fixtureInquiryId),
      `/activity/inquiries/${fixtureInquiryId}`,
    );
    assert.equal(
      getVisitDetailRoute(fixtureVisitId),
      `/activity/visits/${fixtureVisitId}`,
    );
    assert.throws(
      () => getInquiryDetailRoute("malformed-id"),
      /Invalid inquiry identifier/,
    );
    assert.throws(
      () => getVisitDetailRoute("malformed-id"),
      /Invalid visit identifier/,
    );
  });

  it("sanitizeRouteParams strictly strips tokens, OTPs, and secrets", () => {
    const raw = {
      listingId: "550e8400-e29b-41d4-a716-446655440000",
      source: "search_feed",
      token: "secret_token_value",
      accessToken: "eyJhbGciOi...",
      refreshToken: "d7f8a9...",
      otp: "123456",
      password: "user_secret",
      code: "temp_code",
    };

    const sanitized = sanitizeRouteParams(raw);

    assert.equal(sanitized.listingId, "550e8400-e29b-41d4-a716-446655440000");
    assert.equal(sanitized.source, "search_feed");
    assert.equal(sanitized.token, undefined);
    assert.equal(sanitized.accessToken, undefined);
    assert.equal(sanitized.refreshToken, undefined);
    assert.equal(sanitized.otp, undefined);
    assert.equal(sanitized.password, undefined);
    assert.equal(sanitized.code, undefined);
  });
});

describe("navigation: deep-link parser", () => {
  it("parses discover links correctly", () => {
    const result1 = parseDeepLink("zero-brokerage://discover");
    assert.equal(result1.destination.type, "DISCOVER");
    assert.equal(result1.isValid, true);
    assert.equal(result1.requiresAuth, false);

    const result2 = parseDeepLink("https://zerobrokerage.com/");
    assert.equal(result2.destination.type, "DISCOVER");
    assert.equal(result2.isValid, true);
  });

  it("parses protected tabs and marks destination as requiring authentication", () => {
    const savedLink = parseDeepLink("zero-brokerage://saved");
    assert.equal(savedLink.destination.type, "SAVED");
    assert.equal(savedLink.requiresAuth, true);

    const activityLink = parseDeepLink("https://zerobrokerage.com/activity");
    assert.equal(activityLink.destination.type, "ACTIVITY");
    assert.equal(activityLink.requiresAuth, true);

    const accountLink = parseDeepLink("zero-brokerage://account");
    assert.equal(accountLink.destination.type, "ACCOUNT");
    assert.equal(accountLink.requiresAuth, true);
  });

  it("parses contextual furniture link without requiring auth", () => {
    const furnitureLink = parseDeepLink("zero-brokerage://furniture");
    assert.equal(furnitureLink.destination.type, "FURNITURE");
    assert.equal(furnitureLink.requiresAuth, false);
    assert.equal(furnitureLink.targetPath, "/furniture");
  });

  it("parses listing details with valid UUID", () => {
    const uuid = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const result = parseDeepLink(`zero-brokerage://listing/${uuid}`);

    assert.equal(result.destination.type, "LISTING_DETAIL");
    assert.equal((result.destination as any).listingId, uuid);
    assert.equal(result.isValid, true);
    assert.equal(result.requiresAuth, false);
    assert.equal(result.targetPath, `/listing/${uuid}`);
  });

  it("safely falls back to Discover for listing links with invalid UUIDs", () => {
    const invalidLink = parseDeepLink(
      "zero-brokerage://listing/not-a-valid-uuid",
    );

    assert.equal(invalidLink.destination.type, "UNKNOWN");
    assert.equal(invalidLink.isValid, false);
    assert.equal(invalidLink.targetPath, "/(app)/discover");
  });

  it("handles malformed, empty, or unapproved deep-link schemes safely", () => {
    const malformed = parseDeepLink("unsupported-scheme://hack/admin");
    assert.equal(malformed.isValid, false);
    assert.equal(malformed.targetPath, "/(app)/discover");

    const empty = parseDeepLink("");
    assert.equal(empty.isValid, false);
  });
});
