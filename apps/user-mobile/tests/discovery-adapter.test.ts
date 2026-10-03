import "./setup";

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DiscoveryApiPort,
  DiscoveryRepository,
  FixtureDiscoveryApiAdapter,
  discoveryRepository,
} from "../src/features/discovery/api/discovery-adapter";
import { isValidUuid } from "../src/navigation/routes";
import type {
  CursorPaginationDto,
  DiscoveryFeedUiModel,
  ListingPresentationModel,
  SearchFilterParams,
} from "../src/features/discovery/types/discovery.types";

class MockDiscoveryApiPort implements DiscoveryApiPort {
  public calledMethods: string[] = [];
  public shouldThrow = false;
  public errorToThrow: Error = new Error("Simulated 500 Internal Server Error");

  async getDiscoveryHome(_signal?: AbortSignal): Promise<DiscoveryFeedUiModel> {
    this.calledMethods.push("getDiscoveryHome");
    if (this.shouldThrow) throw this.errorToThrow;
    return { sections: [] };
  }

  async searchListings(
    _filters: SearchFilterParams,
    _cursor?: string | null,
    _limit?: number,
    _signal?: AbortSignal,
  ): Promise<CursorPaginationDto<ListingPresentationModel>> {
    this.calledMethods.push("searchListings");
    if (this.shouldThrow) throw this.errorToThrow;
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }

  async fetchListingById(
    listingId: string,
    _signal?: AbortSignal,
  ): Promise<ListingPresentationModel> {
    this.calledMethods.push(`fetchListingById:${listingId}`);
    if (this.shouldThrow) throw this.errorToThrow;
    return {
      id: listingId,
      title: "Mock Listing",
      price: 50000,
      currency: "INR",
      listingIntent: "RENT",
    };
  }
}

describe("discovery adapter & repository architecture (M04)", () => {
  const fixtureAdapter = new FixtureDiscoveryApiAdapter();

  it("fixture adapter returns valid backend-shaped discovery feed", async () => {
    const feed = await fixtureAdapter.getDiscoveryHome();

    assert.ok(feed, "Feed should not be null");
    assert.ok(Array.isArray(feed.sections), "Feed must have sections array");
    assert.ok(feed.sections.length > 0, "Feed must contain sections");

    const firstSection = feed.sections[0];
    assert.equal(typeof firstSection.id, "string");
    assert.equal(typeof firstSection.title, "string");
    assert.ok(
      Array.isArray(firstSection.listings),
      "Section must contain listings",
    );
  });

  it("all fixture listing IDs are valid RFC 4122 UUIDs", async () => {
    const feed = await fixtureAdapter.getDiscoveryHome();
    for (const section of feed.sections) {
      for (const listing of section.listings || []) {
        assert.ok(
          isValidUuid(listing.id),
          `Listing ID ${listing.id} must be a valid RFC 4122 UUID`,
        );
      }
    }
  });

  it("fixture adapter fetches listing by valid UUID and errors on unknown ID", async () => {
    const feed = await fixtureAdapter.getDiscoveryHome();
    const targetListing = feed.sections[0].listings?.[0];
    assert.ok(targetListing);

    const fetched = await fixtureAdapter.fetchListingById(targetListing.id);
    assert.equal(fetched.id, targetListing.id);
    assert.equal(fetched.title, targetListing.title);

    await assert.rejects(
      async () => {
        await fixtureAdapter.fetchListingById(
          "00000000-0000-0000-0000-000000000000",
        );
      },
      {
        message: /Listing not found/,
      },
    );
  });

  describe("fixture search filter parity (Section 2)", () => {
    it("filters listings by query matching title, locality, or property type", async () => {
      const resultTitle = await fixtureAdapter.searchListings({
        query: "Glasshouse",
      });
      assert.ok(resultTitle.items.length > 0);
      assert.ok(
        resultTitle.items.some((item) => item.title.includes("Glasshouse")),
      );

      const resultLocality = await fixtureAdapter.searchListings({
        query: "Indiranagar",
      });
      assert.ok(resultLocality.items.length > 0);
      assert.ok(
        resultLocality.items.some(
          (item) => item.localityName === "Indiranagar",
        ),
      );

      const resultType = await fixtureAdapter.searchListings({
        query: "Penthouse",
      });
      assert.ok(resultType.items.length > 0);
      assert.ok(
        resultType.items.some((item) => item.propertyType === "Penthouse"),
      );

      const resultNone = await fixtureAdapter.searchListings({
        query: "NonExistentPlaceXYZ",
      });
      assert.equal(resultNone.items.length, 0);
      assert.equal(resultNone.total, 0);
    });

    it("filters listings by intent (RENT vs SALE)", async () => {
      const rentResult = await fixtureAdapter.searchListings({
        intent: "RENT",
      });
      assert.ok(rentResult.items.length > 0);
      for (const item of rentResult.items) {
        assert.equal(item.listingIntent, "RENT");
      }

      const saleResult = await fixtureAdapter.searchListings({
        intent: "SALE",
      });
      assert.ok(saleResult.items.length > 0);
      for (const item of saleResult.items) {
        assert.equal(item.listingIntent, "SALE");
      }
    });

    it("filters listings by minPrice", async () => {
      const minPrice = 100000;
      const result = await fixtureAdapter.searchListings({ minPrice });
      assert.ok(result.items.length > 0);
      for (const item of result.items) {
        assert.ok(
          item.price >= minPrice,
          `Item price ${item.price} must be >= ${minPrice}`,
        );
      }
    });

    it("filters listings by maxPrice", async () => {
      const maxPrice = 100000;
      const result = await fixtureAdapter.searchListings({ maxPrice });
      assert.ok(result.items.length > 0);
      for (const item of result.items) {
        assert.ok(
          item.price <= maxPrice,
          `Item price ${item.price} must be <= ${maxPrice}`,
        );
      }
    });

    it("filters listings by price range (minPrice and maxPrice)", async () => {
      const minPrice = 70000;
      const maxPrice = 150000;
      const result = await fixtureAdapter.searchListings({
        minPrice,
        maxPrice,
      });
      assert.ok(result.items.length > 0);
      for (const item of result.items) {
        assert.ok(
          item.price >= minPrice && item.price <= maxPrice,
          `Item price ${item.price} must be between ${minPrice} and ${maxPrice}`,
        );
      }
    });

    it("filters listings by bedrooms count", async () => {
      const result2Bed = await fixtureAdapter.searchListings({ bedrooms: 2 });
      assert.ok(result2Bed.items.length > 0);
      for (const item of result2Bed.items) {
        assert.equal(item.bedrooms, 2);
      }

      const result4Bed = await fixtureAdapter.searchListings({ bedrooms: 4 });
      assert.ok(result4Bed.items.length > 0);
      for (const item of result4Bed.items) {
        assert.equal(item.bedrooms, 4);
      }
    });

    it("filters listings by verifiedOnly flag", async () => {
      const result = await fixtureAdapter.searchListings({
        verifiedOnly: true,
      });
      assert.ok(result.items.length > 0);
      for (const item of result.items) {
        assert.equal(
          item.verificationStatus,
          "VERIFIED",
          "Every item must be explicitly VERIFIED",
        );
      }
    });

    it("respects the limit parameter and preserves total count", async () => {
      const limit = 2;
      const result = await fixtureAdapter.searchListings({}, null, limit);
      assert.equal(result.items.length, limit);
      assert.ok(
        (result.total ?? 0) > limit,
        "Total count reflects all matching items before limit slice",
      );
      assert.equal(result.nextCursor, null);
      assert.equal(result.hasMore, false);
    });

    it("combines multiple filter parameters deterministically", async () => {
      const result = await fixtureAdapter.searchListings({
        intent: "RENT",
        bedrooms: 2,
        maxPrice: 100000,
      });
      assert.ok(result.items.length > 0);
      for (const item of result.items) {
        assert.equal(item.listingIntent, "RENT");
        assert.equal(item.bedrooms, 2);
        assert.ok(item.price <= 100000);
      }
    });
  });

  describe("repository adapter selection and error propagation (Section 1)", () => {
    it("explicit fixture mode uses FixtureDiscoveryApiAdapter", async () => {
      const mockReal = new MockDiscoveryApiPort();
      const mockFixture = new MockDiscoveryApiPort();

      const repo = new DiscoveryRepository({
        realAdapter: mockReal,
        fixtureAdapter: mockFixture,
        useFixtures: true,
      });

      await repo.getDiscoveryHome();
      assert.deepEqual(mockFixture.calledMethods, ["getDiscoveryHome"]);
      assert.deepEqual(mockReal.calledMethods, []);

      await repo.searchListings({ query: "Test" });
      assert.deepEqual(mockFixture.calledMethods, [
        "getDiscoveryHome",
        "searchListings",
      ]);
      assert.deepEqual(mockReal.calledMethods, []);

      await repo.fetchListingById("id-123");
      assert.deepEqual(mockFixture.calledMethods, [
        "getDiscoveryHome",
        "searchListings",
        "fetchListingById:id-123",
      ]);
      assert.deepEqual(mockReal.calledMethods, []);
    });

    it("non-fixture mode uses RealDiscoveryApiAdapter", async () => {
      const mockReal = new MockDiscoveryApiPort();
      const mockFixture = new MockDiscoveryApiPort();

      const repo = new DiscoveryRepository({
        realAdapter: mockReal,
        fixtureAdapter: mockFixture,
        useFixtures: false,
      });

      await repo.getDiscoveryHome();
      assert.deepEqual(mockReal.calledMethods, ["getDiscoveryHome"]);
      assert.deepEqual(mockFixture.calledMethods, []);

      await repo.searchListings({ query: "Test" });
      assert.deepEqual(mockReal.calledMethods, [
        "getDiscoveryHome",
        "searchListings",
      ]);
      assert.deepEqual(mockFixture.calledMethods, []);

      await repo.fetchListingById("id-123");
      assert.deepEqual(mockReal.calledMethods, [
        "getDiscoveryHome",
        "searchListings",
        "fetchListingById:id-123",
      ]);
      assert.deepEqual(mockFixture.calledMethods, []);
    });

    it("an error from RealDiscoveryApiAdapter is propagated rather than silently converted into fixture data", async () => {
      const mockReal = new MockDiscoveryApiPort();
      const mockFixture = new MockDiscoveryApiPort();
      mockReal.shouldThrow = true;
      mockReal.errorToThrow = new Error("401 Unauthorized: Invalid session");

      const repo = new DiscoveryRepository({
        realAdapter: mockReal,
        fixtureAdapter: mockFixture,
        useFixtures: false,
      });

      // Assert error propagates directly and is NOT swallowed
      await assert.rejects(
        async () => {
          await repo.getDiscoveryHome();
        },
        {
          message: "401 Unauthorized: Invalid session",
        },
      );

      // Assert fixture adapter was NEVER called as a fallback
      assert.equal(
        mockFixture.calledMethods.length,
        0,
        "Fixture adapter must not be called when real adapter throws",
      );

      await assert.rejects(
        async () => {
          await repo.searchListings({ query: "Test" });
        },
        {
          message: "401 Unauthorized: Invalid session",
        },
      );
      assert.equal(mockFixture.calledMethods.length, 0);

      await assert.rejects(
        async () => {
          await repo.fetchListingById("id-123");
        },
        {
          message: "401 Unauthorized: Invalid session",
        },
      );
      assert.equal(mockFixture.calledMethods.length, 0);
    });

    it("process.env.EXPO_PUBLIC_USE_FIXTURES determines default mode", async () => {
      const originalEnv = process.env.EXPO_PUBLIC_USE_FIXTURES;
      try {
        process.env.EXPO_PUBLIC_USE_FIXTURES = "true";
        const fixtureRepo = new DiscoveryRepository();
        assert.equal(fixtureRepo.isFixtureMode(), true);

        process.env.EXPO_PUBLIC_USE_FIXTURES = "false";
        const realRepo = new DiscoveryRepository();
        assert.equal(realRepo.isFixtureMode(), false);

        delete process.env.EXPO_PUBLIC_USE_FIXTURES;
        const defaultRepo = new DiscoveryRepository();
        assert.equal(defaultRepo.isFixtureMode(), false);
      } finally {
        process.env.EXPO_PUBLIC_USE_FIXTURES = originalEnv;
      }
    });

    it("singleton discoveryRepository provides transparent access", async () => {
      const originalEnv = process.env.EXPO_PUBLIC_USE_FIXTURES;
      try {
        process.env.EXPO_PUBLIC_USE_FIXTURES = "true";
        const feed = await discoveryRepository.getDiscoveryHome();
        assert.ok(feed);
        assert.ok(feed.sections.length > 0);
      } finally {
        process.env.EXPO_PUBLIC_USE_FIXTURES = originalEnv;
      }
    });
  });
});
