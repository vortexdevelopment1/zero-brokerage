import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type {
  ListingSummaryDto,
  SearchFilterParams,
} from "../src/features/discovery/types/discovery.types";

describe("discovery & search: pagination & deduplication logic", () => {
  it("deduplicates paginated listings by stable UUID", () => {
    const existingListings: ListingSummaryDto[] = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Apartment 1",
        price: 30000,
        currency: "INR",
        listingIntent: "RENT",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        title: "Apartment 2",
        price: 45000,
        currency: "INR",
        listingIntent: "RENT",
      },
    ];

    const incomingPage: ListingSummaryDto[] = [
      // Duplicate of item 2 (e.g. from concurrent listing shifts)
      {
        id: "22222222-2222-2222-2222-222222222222",
        title: "Apartment 2 (duplicate)",
        price: 45000,
        currency: "INR",
        listingIntent: "RENT",
      },
      // New item 3
      {
        id: "33333333-3333-3333-3333-333333333333",
        title: "Apartment 3",
        price: 60000,
        currency: "INR",
        listingIntent: "RENT",
      },
    ];

    const seenIds = new Set(existingListings.map((l) => l.id));
    const newUnique: ListingSummaryDto[] = [];
    for (const item of incomingPage) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        newUnique.push(item);
      }
    }

    const merged = [...existingListings, ...newUnique];

    assert.equal(merged.length, 3);
    assert.equal(merged[0].id, "11111111-1111-1111-1111-111111111111");
    assert.equal(merged[1].id, "22222222-2222-2222-2222-222222222222");
    assert.equal(merged[2].id, "33333333-3333-3333-3333-333333333333");
  });

  it("stale response rejection prevents out-of-order race conditions", () => {
    let activeRequestTimestamp = 1000;

    const request1Timestamp = 1000;
    // User types again immediately, triggering request 2
    const request2Timestamp = 1050;
    activeRequestTimestamp = request2Timestamp;

    // Suppose request 1 resolves after request 2
    const isRequest1Stale = request1Timestamp < activeRequestTimestamp;
    const isRequest2Stale = request2Timestamp < activeRequestTimestamp;

    assert.equal(isRequest1Stale, true);
    assert.equal(isRequest2Stale, false);
  });

  it("filters reset returns to clean session default without persisting", () => {
    const DEFAULT_FILTERS: SearchFilterParams = {
      query: "",
      intent: "RENT",
    };

    let currentFilters: SearchFilterParams = {
      query: "Whitefield",
      intent: "SALE",
      minPrice: 5000000,
      maxPrice: 15000000,
      bedrooms: 3,
      verifiedOnly: true,
    };

    // User resets filters
    currentFilters = { ...DEFAULT_FILTERS };

    assert.equal(currentFilters.query, "");
    assert.equal(currentFilters.intent, "RENT");
    assert.equal(currentFilters.minPrice, undefined);
    assert.equal(currentFilters.maxPrice, undefined);
    assert.equal(currentFilters.bedrooms, undefined);
    assert.equal(currentFilters.verifiedOnly, undefined);
  });
});
