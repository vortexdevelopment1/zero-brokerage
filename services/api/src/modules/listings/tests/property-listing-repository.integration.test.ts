import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Pool } from "pg";
import {
  createDatabasePool,
  ForeignKeyViolationError,
  GeospatialValidationError,
  CheckConstraintViolationError,
} from "@zero-brokerage/database";
import {
  PropertyRepository,
} from "../repositories/property-repository.js";
import {
  ListingRepository,
} from "../repositories/listing-repository.js";
import {
  AgencyRepository,
} from "../../agencies/repositories/agency-repository.js";
import type {
  CreatePropertyParams,
} from "../types.js";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/zero_brokerage_test";

describe("PropertyRepository & ListingRepository Integration Tests (Real PostgreSQL)", () => {
  let pool: Pool;
  let propertyRepo: PropertyRepository;
  let listingRepo: ListingRepository;
  let agencyRepo: AgencyRepository;

  let testUserId: string;
  let testAgencyId: string;

  before(async () => {
    pool = createDatabasePool({ connectionString: TEST_DB_URL, maxConnections: 5 });
    propertyRepo = new PropertyRepository(pool);
    listingRepo = new ListingRepository(pool);
    agencyRepo = new AgencyRepository(pool);
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Clean up test data in reverse-dependency order
    await pool.query("DELETE FROM listings WHERE title LIKE 'Repo Test Listing%'");
    await pool.query("DELETE FROM properties WHERE address_line_1 LIKE 'Repo Test Property%'");
    await pool.query(
      "DELETE FROM agency_memberships WHERE agency_id IN (SELECT id FROM agencies WHERE slug LIKE 'repo-test-agency-%')"
    );
    await pool.query("DELETE FROM agencies WHERE slug LIKE 'repo-test-agency-%'");
    await pool.query("DELETE FROM auth_identities WHERE phone = '+919988776655'");

    // Create a base user for broker/creator references
    const userRes = await pool.query(
      `INSERT INTO auth_identities (
        phone, role, status
      ) VALUES (
        '+919988776655', 'INDEPENDENT_BROKER', 'ACTIVE'
      ) RETURNING id`
    );
    testUserId = userRes.rows[0].id;

    // Create a base agency
    const agency = await agencyRepo.createAgency({
      name: "Repo Test Agency",
      legalName: "Repo Test Agency Private Limited",
      slug: `repo-test-agency-${Date.now()}`,
      countryCode: "IN",
      state: "Karnataka",
      city: "Bengaluru",
      postalCode: "560001",
    });
    testAgencyId = agency.id;
  });

  describe("PropertyRepository", () => {
    it("creates and retrieves a property", async () => {
      const input: CreatePropertyParams = {
        propertyType: "RESIDENTIAL",
        subType: "APARTMENT",
        addressLine1: "Repo Test Property Flat 402, Highrise Tower",
        locality: "Central Residency",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        countryCode: "IN",
        longitude: 77.5946,
        latitude: 12.9716,
      };

      const created = await propertyRepo.createProperty(input);
      assert.ok(created.id);
      assert.equal(created.propertyType, "RESIDENTIAL");
      assert.equal(created.subType, "APARTMENT");
      assert.ok(Math.abs(created.longitude - 77.5946) < 0.0001);
      assert.ok(Math.abs(created.latitude - 12.9716) < 0.0001);
      assert.ok(created.createdAt instanceof Date);

      const fetched = await propertyRepo.findById(created.id);
      assert.ok(fetched);
      assert.equal(fetched?.id, created.id);
      assert.equal(fetched?.city, "Bengaluru");
    });

    it("rejects out-of-range coordinates at application boundary", async () => {
      const invalidLonInput: CreatePropertyParams = {
        propertyType: "RESIDENTIAL",
        subType: "VILLA",
        addressLine1: "Repo Test Property Villa",
        locality: "Palm Grove",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        countryCode: "IN",
        longitude: 185.0, // Invalid > 180
        latitude: 12.9716,
      };

      await assert.rejects(
        async () => {
          await propertyRepo.createProperty(invalidLonInput);
        },
        (err) => err instanceof GeospatialValidationError
      );
    });

    it("finds properties within radius in meters", async () => {
      // Point A: Bengaluru MG Road (77.6074, 12.9754)
      const prop1 = await propertyRepo.createProperty({
        propertyType: "RESIDENTIAL",
        subType: "APARTMENT",
        addressLine1: "Repo Test Property Near MG Road",
        locality: "MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        countryCode: "IN",
        longitude: 77.6074,
        latitude: 12.9754,
      });

      // Point B: Mysore Palace (~130 km away: 76.6552, 12.3052)
      await propertyRepo.createProperty({
        propertyType: "RESIDENTIAL",
        subType: "VILLA",
        addressLine1: "Repo Test Property In Mysore",
        locality: "Palace Road",
        city: "Mysuru",
        state: "Karnataka",
        postalCode: "570001",
        countryCode: "IN",
        longitude: 76.6552,
        latitude: 12.3052,
      });

      // Search within 5,000 meters of MG Road
      const nearby = await propertyRepo.searchPropertiesByRadius({
        center: { longitude: 77.6074, latitude: 12.9754 },
        radiusMeters: 5000,
        limit: 10,
      });

      const foundIds = nearby.map((p) => p.id);
      assert.ok(foundIds.includes(prop1.id));
      assert.equal(nearby.some((p) => p.city === "Mysuru"), false);
      assert.ok(nearby[0] && nearby[0].distanceMeters >= 0);
    });

    it("finds properties within a bounding box", async () => {
      const prop = await propertyRepo.createProperty({
        propertyType: "COMMERCIAL",
        subType: "OFFICE",
        addressLine1: "Repo Test Property Commercial Hub",
        locality: "CBD",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        countryCode: "IN",
        longitude: 77.595,
        latitude: 12.975,
      });

      const inBox = await propertyRepo.searchPropertiesByBoundingBox({
        bbox: {
          minLongitude: 77.58,
          minLatitude: 12.96,
          maxLongitude: 77.61,
          maxLatitude: 12.99,
        },
        limit: 10,
      });

      const inBoxIds = inBox.map((p) => p.id);
      assert.ok(inBoxIds.includes(prop.id));

      const outOfBox = await propertyRepo.searchPropertiesByBoundingBox({
        bbox: {
          minLongitude: 78.0,
          minLatitude: 13.0,
          maxLongitude: 78.5,
          maxLatitude: 13.5,
        },
        limit: 10,
      });
      assert.equal(outOfBox.some((p) => p.id === prop.id), false);
    });

    it("accepts degenerate bounding box (minLon == maxLon or minLat == maxLat)", async () => {
      // Point exact coordinate query
      const exact = await propertyRepo.searchPropertiesByBoundingBox({
        bbox: {
          minLongitude: 77.595,
          minLatitude: 12.975,
          maxLongitude: 77.595,
          maxLatitude: 12.975,
        },
        limit: 10,
      });
      assert.ok(Array.isArray(exact));
    });

    it("rejects antimeridian-crossing bounding box (minLon > maxLon)", async () => {
      await assert.rejects(
        async () => {
          await propertyRepo.searchPropertiesByBoundingBox({
            bbox: {
              minLongitude: 179.0,
              minLatitude: 10.0,
              maxLongitude: -179.0, // Crossing antimeridian
              maxLatitude: 20.0,
            },
            limit: 10,
          });
        },
        (err) => err instanceof GeospatialValidationError
      );
    });
  });

  describe("ListingRepository", () => {
    let testPropertyId: string;

    beforeEach(async () => {
      const prop = await propertyRepo.createProperty({
        propertyType: "RESIDENTIAL",
        subType: "APARTMENT",
        addressLine1: "Repo Test Property For Listing Tests",
        locality: "Koramangala",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        countryCode: "IN",
        longitude: 77.6000,
        latitude: 12.9700,
      });
      testPropertyId = prop.id;
    });

    it("creates an independent broker listing (agency_id null)", async () => {
      const listing = await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "INDEPENDENT_BROKER",
        brokerId: testUserId,
        agencyId: null,
        listingIntent: "RENT",
        status: "DRAFT",
        title: "Repo Test Listing Independent 2BHK",
        priceMinor: 2500000n, // 25,000 INR
        currency: "INR",
        pricePeriod: "MONTHLY",
        createdBy: testUserId,
      });

      assert.ok(listing.id);
      assert.equal(listing.agencyId, null);
      assert.equal(listing.brokerId, testUserId);
      assert.equal(listing.priceMinor, 2500000n);

      const fetched = await listingRepo.findById(listing.id);
      assert.ok(fetched);
      assert.equal(fetched?.title, "Repo Test Listing Independent 2BHK");
    });

    it("creates an agency-managed listing with large minor units", async () => {
      const listing = await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "AGENCY",
        agencyId: testAgencyId,
        brokerId: testUserId,
        listingIntent: "SALE",
        status: "PUBLISHED",
        title: "Repo Test Listing Agency Penthouse",
        priceMinor: 1500000000n, // 1.5 Cr INR in minor units (15,000,000.00)
        currency: "INR",
        pricePeriod: "ONE_TIME",
        securityDepositMinor: 50000000n, // 5 Lakh INR
        maintenanceFeeMinor: 1500000n, // 15,000 INR
        createdBy: testUserId,
      });

      assert.ok(listing.id);
      assert.equal(listing.agencyId, testAgencyId);
      assert.equal(listing.brokerId, testUserId);
      assert.equal(listing.priceMinor, 1500000000n);
      assert.equal(listing.securityDepositMinor, 50000000n);
      assert.equal(listing.maintenanceFeeMinor, 1500000n);
    });

    it("rejects listing referencing nonexistent property", async () => {
      await assert.rejects(
        async () => {
          await listingRepo.createListing({
            propertyId: "00000000-0000-0000-0000-000000000000",
            ownerType: "INDEPENDENT_BROKER",
            brokerId: testUserId,
            listingIntent: "RENT",
            status: "DRAFT",
            title: "Repo Test Listing Bad Property",
            priceMinor: 2000000n,
            currency: "INR",
            createdBy: testUserId,
          });
        },
        (err) => err instanceof ForeignKeyViolationError
      );
    });

    it("rejects listing referencing nonexistent agency", async () => {
      await assert.rejects(
        async () => {
          await listingRepo.createListing({
            propertyId: testPropertyId,
            ownerType: "AGENCY",
            agencyId: "00000000-0000-0000-0000-000000000000",
            brokerId: testUserId,
            listingIntent: "SALE",
            status: "DRAFT",
            title: "Repo Test Listing Bad Agency",
            priceMinor: 500000000n,
            currency: "INR",
            createdBy: testUserId,
          });
        },
        (err) => err instanceof ForeignKeyViolationError
      );
    });

    it("supports cursor pagination via listListings()", async () => {
      // Create 3 listings with predictable titles
      await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "INDEPENDENT_BROKER",
        brokerId: testUserId,
        listingIntent: "RENT",
        status: "PUBLISHED",
        title: "Repo Test Listing Page Item 1",
        priceMinor: 1000000n,
        currency: "INR",
        createdBy: testUserId,
      });
      await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "INDEPENDENT_BROKER",
        brokerId: testUserId,
        listingIntent: "RENT",
        status: "PUBLISHED",
        title: "Repo Test Listing Page Item 2",
        priceMinor: 2000000n,
        currency: "INR",
        createdBy: testUserId,
      });
      await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "INDEPENDENT_BROKER",
        brokerId: testUserId,
        listingIntent: "RENT",
        status: "PUBLISHED",
        title: "Repo Test Listing Page Item 3",
        priceMinor: 3000000n,
        currency: "INR",
        createdBy: testUserId,
      });

      // Page 1: limit 2
      const page1 = await listingRepo.listListings({
        status: "PUBLISHED",
        limit: 2,
      });

      assert.equal(page1.data.length, 2);
      assert.equal(page1.pagination.hasNextPage, true);
      assert.ok(page1.pagination.nextCursor);

      // Page 2: with cursor
      const page2 = await listingRepo.listListings({
        status: "PUBLISHED",
        limit: 2,
        cursor: page1.pagination.nextCursor,
      });

      assert.ok(page2.data.length >= 1);
      // Ensure no items from page 1 are repeated in page 2
      const page1Ids = new Set(page1.data.map((i) => i.id));
      for (const item of page2.data) {
        assert.equal(page1Ids.has(item.id), false);
      }
    });

    it("updates listing status with state transition protection", async () => {
      const listing = await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "INDEPENDENT_BROKER",
        brokerId: testUserId,
        listingIntent: "RENT",
        status: "DRAFT",
        title: "Repo Test Listing Status Transition",
        priceMinor: 1000000n,
        currency: "INR",
        createdBy: testUserId,
      });

      // Valid transition from DRAFT to PUBLISHED
      const updated = await listingRepo.updateStatus(listing.id, "PUBLISHED", ["DRAFT"]);
      assert.ok(updated);
      assert.equal(updated?.status, "PUBLISHED");

      // Invalid transition: current is PUBLISHED, expected is DRAFT
      const invalid = await listingRepo.updateStatus(listing.id, "ARCHIVED", ["DRAFT"]);
      assert.equal(invalid, null);

      // Current status remains PUBLISHED
      const fetched = await listingRepo.findById(listing.id);
      assert.equal(fetched?.status, "PUBLISHED");
    });

    it("rejects negative monetary values via database check constraint", async () => {
      await assert.rejects(
        async () => {
          await listingRepo.createListing({
            propertyId: testPropertyId,
            ownerType: "INDEPENDENT_BROKER",
            brokerId: testUserId,
            listingIntent: "RENT",
            status: "DRAFT",
            title: "Repo Test Negative Price",
            priceMinor: -500000n, // Negative price
            currency: "INR",
            createdBy: testUserId,
          });
        },
        (err) => err instanceof CheckConstraintViolationError
      );
    });

    it("preserves exact BigInt value for large price minor units across round-trip", async () => {
      // 50,00,00,000 INR = 50 Cr = 50000000000 minor units
      const fiftyCroreMinor = 50000000000n;
      const listing = await listingRepo.createListing({
        propertyId: testPropertyId,
        ownerType: "INDEPENDENT_BROKER",
        brokerId: testUserId,
        listingIntent: "SALE",
        status: "DRAFT",
        title: "Repo Test 50 Crore Luxury Estate",
        priceMinor: fiftyCroreMinor,
        currency: "INR",
        createdBy: testUserId,
      });

      assert.equal(listing.priceMinor, fiftyCroreMinor);

      const fetched = await listingRepo.findById(listing.id);
      assert.ok(fetched);
      assert.equal(fetched?.priceMinor, fiftyCroreMinor);
      assert.equal(typeof fetched?.priceMinor, "bigint");
    });
  });
});
