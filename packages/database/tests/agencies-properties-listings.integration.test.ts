import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Pool } from "pg";
import {
  allMigrations,
  ForeignKeyViolationError,
  runMigrations,
  UniqueConstraintViolationError,
  withTransaction,
  CheckConstraintViolationError,
} from "../src/index.js";
import { cleanTestDatabase, createTestPool } from "./test-config.js";

describe("Agencies, Properties, Listings & PostGIS Integration Tests (Real PostgreSQL)", () => {
  let pool: Pool;

  before(async () => {
    pool = await createTestPool();
    await cleanTestDatabase(pool);
    // Run all migrations fresh (001, 002, 003, 004, 005)
    await runMigrations(pool, allMigrations);
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    await pool.query(`
      TRUNCATE TABLE
        listings,
        properties,
        agency_memberships,
        agencies,
        auth_security_events,
        auth_sessions,
        auth_otp_challenges,
        user_profiles,
        auth_identities
      CASCADE;
    `);
  });

  // Helper to insert an auth identity
  async function createTestIdentity(phone: string, role = "USER"): Promise<string> {
    const res = await pool.query<{ id: string }>(
      "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
      [phone, role],
    );
    return res.rows[0]!.id;
  }

  // Helper to insert an agency
  async function createTestAgency(name: string, slug: string): Promise<string> {
    const res = await pool.query<{ id: string }>(
      "INSERT INTO agencies (name, slug) VALUES ($1, $2) RETURNING id;",
      [name, slug],
    );
    return res.rows[0]!.id;
  }

  // =========================================================================
  // A. AGENCIES TABLE & SLUG UNIQUENESS
  // =========================================================================
  describe("A. Agencies Persistence Model", () => {
    it("creates an agency with valid fields and generates UUID", async () => {
      const agencyId = await createTestAgency("Skyline Realty", "skyline-realty");
      assert.ok(agencyId);
      assert.match(
        agencyId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const check = await pool.query<{ name: string; slug: string; status: string }>(
        "SELECT name, slug, status FROM agencies WHERE id = $1;",
        [agencyId],
      );
      assert.equal(check.rows[0]?.name, "Skyline Realty");
      assert.equal(check.rows[0]?.slug, "skyline-realty");
      assert.equal(check.rows[0]?.status, "ACTIVE");
    });

    it("rejects duplicate agency slug with unique violation", async () => {
      await createTestAgency("Agency One", "duplicate-slug");

      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "INSERT INTO agencies (name, slug) VALUES ($1, $2);",
              ["Agency Two", "duplicate-slug"],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.equal(err.code, "UNIQUE_VIOLATION");
          assert.ok(err.constraint?.includes("slug"));
          return true;
        },
      );
    });

    it("updates agency details safely along valid update paths", async () => {
      const agencyId = await createTestAgency("Update Agency", "update-agency");

      await pool.query(
        "UPDATE agencies SET legal_name = 'Update Agency Pvt Ltd', city = 'Bengaluru' WHERE id = $1;",
        [agencyId],
      );

      const check = await pool.query<{ legal_name: string; city: string }>(
        "SELECT legal_name, city FROM agencies WHERE id = $1;",
        [agencyId],
      );
      assert.equal(check.rows[0]?.legal_name, "Update Agency Pvt Ltd");
      assert.equal(check.rows[0]?.city, "Bengaluru");
    });
  });

  // =========================================================================
  // B. AGENCY MEMBERSHIP INTEGRITY & AT MOST ONE OWNER
  // =========================================================================
  describe("B. Agency Membership Referential Integrity & Invariants", () => {
    it("allows valid agency membership reference and enforces FK", async () => {
      const userId = await createTestIdentity("+919876543210", "AGENCY_BROKER");
      const agencyId = await createTestAgency("Horizon Realty", "horizon-realty");

      const res = await pool.query<{ id: string; agency_id: string; user_id: string }>(
        `INSERT INTO agency_memberships (agency_id, user_id, role, status)
         VALUES ($1, $2, 'BROKER', 'ACTIVE')
         RETURNING id, agency_id, user_id;`,
        [agencyId, userId],
      );

      assert.ok(res.rows[0]?.id);
      assert.equal(res.rows[0]?.agency_id, agencyId);
      assert.equal(res.rows[0]?.user_id, userId);
    });

    it("rejects membership referencing a nonexistent agency (FK violation)", async () => {
      const userId = await createTestIdentity("+919876543299", "AGENCY_BROKER");
      const nonExistentAgencyId = "00000000-0000-0000-0000-000000000000";

      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO agency_memberships (agency_id, user_id, role, status)
               VALUES ($1, $2, 'BROKER', 'ACTIVE');`,
              [nonExistentAgencyId, userId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForeignKeyViolationError);
          assert.equal(err.code, "FOREIGN_KEY_VIOLATION");
          assert.ok(err.constraint?.includes("fk_agency_memberships_agency"));
          return true;
        },
      );
    });

    it("enforces at most one active AGENCY_OWNER per agency (permits ownerless initial state)", async () => {
      const user1 = await createTestIdentity("+919876543211", "AGENCY_ADMIN");
      const user2 = await createTestIdentity("+919876543212", "AGENCY_ADMIN");
      const agencyId = await createTestAgency("Prime Properties", "prime-props");

      // 1. Ownerless agency state is currently permitted by the database schema
      const ownerCheck = await pool.query(
        "SELECT * FROM agency_memberships WHERE agency_id = $1 AND role = 'AGENCY_OWNER';",
        [agencyId],
      );
      assert.equal(ownerCheck.rows.length, 0);

      // 2. First active owner succeeds
      await pool.query(
        `INSERT INTO agency_memberships (agency_id, user_id, role, status)
         VALUES ($1, $2, 'AGENCY_OWNER', 'ACTIVE');`,
        [agencyId, user1],
      );

      // 3. Second active owner for same agency fails with unique violation on uq_agency_active_owner
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO agency_memberships (agency_id, user_id, role, status)
               VALUES ($1, $2, 'AGENCY_OWNER', 'ACTIVE');`,
              [agencyId, user2],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.ok(err.constraint?.includes("uq_agency_active_owner"));
          return true;
        },
      );

      // 4. Inactive (TERMINATED) owner does NOT block a new active owner
      await pool.query(
        "UPDATE agency_memberships SET status = 'TERMINATED' WHERE user_id = $1;",
        [user1],
      );

      // Now user2 can become active owner
      const res2 = await pool.query<{ id: string }>(
        `INSERT INTO agency_memberships (agency_id, user_id, role, status)
         VALUES ($1, $2, 'AGENCY_OWNER', 'ACTIVE')
         RETURNING id;`,
        [agencyId, user2],
      );
      assert.ok(res2.rows[0]?.id);

      // 5. UPDATE-path invariant: attempting to reactivate user1 when user2 is already active owner fails
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "UPDATE agency_memberships SET status = 'ACTIVE' WHERE user_id = $1;",
              [user1],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.ok(err.constraint?.includes("uq_agency_active_owner"));
          return true;
        },
      );
    });

    it("enforces one active agency membership per user on INSERT and UPDATE", async () => {
      const userId = await createTestIdentity("+919876543221", "AGENCY_BROKER");
      const agencyA = await createTestAgency("Agency Alpha", "agency-alpha");
      const agencyB = await createTestAgency("Agency Beta", "agency-beta");

      // Active membership in Agency A succeeds
      await pool.query(
        `INSERT INTO agency_memberships (agency_id, user_id, role, status)
         VALUES ($1, $2, 'BROKER', 'ACTIVE');`,
        [agencyA, userId],
      );

      // Simultaneous active membership in Agency B fails
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO agency_memberships (agency_id, user_id, role, status)
               VALUES ($1, $2, 'BROKER', 'ACTIVE');`,
              [agencyB, userId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.ok(err.constraint?.includes("uq_user_active_membership"));
          return true;
        },
      );

      // Terminating membership in Alpha allows joining Beta
      await pool.query(
        "UPDATE agency_memberships SET status = 'TERMINATED' WHERE user_id = $1;",
        [userId],
      );

      const resBeta = await pool.query<{ id: string }>(
        `INSERT INTO agency_memberships (agency_id, user_id, role, status)
         VALUES ($1, $2, 'BROKER', 'ACTIVE')
         RETURNING id;`,
        [agencyB, userId],
      );
      assert.ok(resBeta.rows[0]?.id);

      // UPDATE-path invariant: updating membership in Agency A back to ACTIVE while active in B fails
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "UPDATE agency_memberships SET status = 'ACTIVE' WHERE agency_id = $1 AND user_id = $2;",
              [agencyA, userId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.ok(err.constraint?.includes("uq_user_active_membership"));
          return true;
        },
      );
    });
  });

  // =========================================================================
  // C. PROPERTIES TABLE & POSTGIS GEOGRAPHY & COORDINATE CONSISTENCY
  // =========================================================================
  describe("C. Properties, PostGIS Geography & Coordinate Consistency", () => {
    it("persists property with valid PostGIS point and correct coordinate ordering", async () => {
      // Bangalore coordinates: Lon 77.5946, Lat 12.9716
      const lon = 77.5946;
      const lat = 12.9716;

      const res = await pool.query<{
        id: string;
        st_x: number;
        st_y: number;
        st_srid: number;
      }>(
        `INSERT INTO properties (
           property_type,
           sub_type,
           title,
           address_line_1,
           locality,
           city,
           state,
           postal_code,
           latitude,
           longitude,
           location
         )
         VALUES (
           'RESIDENTIAL',
           'APARTMENT',
           'Highland Residency 3BHK',
           '123 MG Road',
           'Central',
           'Bengaluru',
           'Karnataka',
           '560001',
           $1,
           $2,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
         )
         RETURNING
           id,
           ST_X(location::geometry) as st_x,
           ST_Y(location::geometry) as st_y,
           ST_SRID(location::geometry) as st_srid;`,
        [lat, lon],
      );

      assert.ok(res.rows[0]?.id);
      // ST_X must be longitude
      assert.ok(Math.abs(Number(res.rows[0]?.st_x) - lon) < 0.0001);
      // ST_Y must be latitude
      assert.ok(Math.abs(Number(res.rows[0]?.st_y) - lat) < 0.0001);
      // SRID must be 4326
      assert.equal(res.rows[0]?.st_srid, 4326);
    });

    it("prevents coordinate divergence: rejects mismatched latitude/longitude on INSERT", async () => {
      // Mismatched latitude: lat column is 12.9716, but location point is lat 15.0000
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(`
              INSERT INTO properties (
                property_type, sub_type, address_line_1, locality, city, state, postal_code,
                latitude, longitude, location
              ) VALUES (
                'RESIDENTIAL', 'APARTMENT', 'Mismatched Lat Address', 'Locality', 'City', 'State', '123456',
                12.9716, 77.5946, ST_SetSRID(ST_MakePoint(77.5946, 15.0000), 4326)::geography
              );
            `);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          return true;
        },
      );

      // Mismatched longitude: lon column is 77.5946, but location point is lon 80.0000
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(`
              INSERT INTO properties (
                property_type, sub_type, address_line_1, locality, city, state, postal_code,
                latitude, longitude, location
              ) VALUES (
                'RESIDENTIAL', 'APARTMENT', 'Mismatched Lon Address', 'Locality', 'City', 'State', '123456',
                12.9716, 77.5946, ST_SetSRID(ST_MakePoint(80.0000, 12.9716), 4326)::geography
              );
            `);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          return true;
        },
      );
    });

    it("prevents coordinate divergence on UPDATE path", async () => {
      const res = await pool.query<{ id: string }>(`
        INSERT INTO properties (
          property_type, sub_type, address_line_1, locality, city, state, postal_code,
          latitude, longitude, location
        ) VALUES (
          'RESIDENTIAL', 'VILLA', 'Update Coord Test', 'Locality', 'City', 'State', '123456',
          12.9716, 77.5946, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography
        ) RETURNING id;
      `);
      const propertyId = res.rows[0]!.id;

      // 1. Mismatched update of latitude without updating location is rejected
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "UPDATE properties SET latitude = 18.0000 WHERE id = $1;",
              [propertyId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          return true;
        },
      );

      // 2. Synchronized matching update succeeds
      await pool.query(
        `UPDATE properties
         SET latitude = 12.9800,
             longitude = 77.6000,
             location = ST_SetSRID(ST_MakePoint(77.6000, 12.9800), 4326)::geography
         WHERE id = $1;`,
        [propertyId],
      );

      const check = await pool.query<{ latitude: number; longitude: number }>(
        "SELECT latitude, longitude FROM properties WHERE id = $1;",
        [propertyId],
      );
      assert.ok(Math.abs(check.rows[0]!.latitude - 12.9800) < 0.0001);
      assert.ok(Math.abs(check.rows[0]!.longitude - 77.6000) < 0.0001);
    });

    it("rejects invalid coordinate bounds via database CHECK constraints", async () => {
      // Longitude > 180
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(`
              INSERT INTO properties (
                property_type, sub_type, address_line_1, locality, city, state, postal_code,
                latitude, longitude, location
              ) VALUES (
                'RESIDENTIAL', 'APARTMENT', 'Test', 'Loc', 'City', 'State', '123',
                12.0, 185.0, ST_SetSRID(ST_MakePoint(185.0, 12.0), 4326)::geography
              );
            `);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          return true;
        },
      );

      // Latitude > 90
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(`
              INSERT INTO properties (
                property_type, sub_type, address_line_1, locality, city, state, postal_code,
                latitude, longitude, location
              ) VALUES (
                'RESIDENTIAL', 'APARTMENT', 'Test', 'Loc', 'City', 'State', '123',
                95.0, 77.0, ST_SetSRID(ST_MakePoint(77.0, 95.0), 4326)::geography
              );
            `);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          return true;
        },
      );
    });
  });

  // =========================================================================
  // D. LISTINGS TABLE, BIGINT MONEY & OWNERSHIP CONSTRAINTS
  // =========================================================================
  describe("D. Listings Persistence Model, BIGINT Minor Units & Ownership Constraints", () => {
    it("persists listing with BIGINT minor units and verifies exact precision", async () => {
      const brokerId = await createTestIdentity("+919876543231", "AGENCY_BROKER");
      const agencyId = await createTestAgency("Commercial Partners", "comm-partners");

      const propRes = await pool.query<{ id: string }>(
        `INSERT INTO properties (
           property_type, sub_type, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'COMMERCIAL', 'OFFICE', 'Tech Park Block B', 'Bellandur', 'Bengaluru', 'Karnataka', '560103',
           12.9255, 77.6841, ST_SetSRID(ST_MakePoint(77.6841, 12.9255), 4326)::geography
         ) RETURNING id;`,
      );
      const propertyId = propRes.rows[0]!.id;

      // Large monetary value: 25,00,00,000 INR = 25 Cr = 25000000000 minor units
      const largePriceMinor = 25000000000n;
      const depositMinor = 5000000000n;

      const listRes = await pool.query<{
        id: string;
        status: string;
        price_minor: string;
        security_deposit_minor: string;
      }>(
        `INSERT INTO listings (
           property_id, owner_type, agency_id, broker_id, listing_intent,
           title, price_minor, security_deposit_minor, currency, status, created_by
         ) VALUES (
           $1, 'AGENCY', $2, $3, 'RENT',
           '5000 sqft Modern Plug-and-play Office', $4, $5, 'INR', 'DRAFT', $3
         ) RETURNING id, status, price_minor, security_deposit_minor;`,
        [propertyId, agencyId, brokerId, largePriceMinor.toString(), depositMinor.toString()],
      );

      assert.ok(listRes.rows[0]?.id);
      assert.equal(listRes.rows[0]?.status, "DRAFT");
      assert.equal(BigInt(listRes.rows[0]?.price_minor), largePriceMinor);
      assert.equal(BigInt(listRes.rows[0]?.security_deposit_minor), depositMinor);
    });

    it("accepts zero price_minor and rejects negative monetary values on INSERT and UPDATE", async () => {
      const brokerId = await createTestIdentity("+919876543232", "INDEPENDENT_BROKER");
      const propRes = await pool.query<{ id: string }>(
        `INSERT INTO properties (
           property_type, sub_type, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'APARTMENT', 'Zero Price Flat', 'Locality', 'City', 'State', '123456',
           12.0, 77.0, ST_SetSRID(ST_MakePoint(77.0, 12.0), 4326)::geography
         ) RETURNING id;`,
      );
      const propertyId = propRes.rows[0]!.id;

      // 1. Zero price is allowed (e.g. promotional or unpriced inquiry)
      const zeroList = await pool.query<{ id: string; price_minor: string }>(
        `INSERT INTO listings (
           property_id, owner_type, broker_id, listing_intent,
           price_minor, created_by
         ) VALUES ($1, 'INDEPENDENT_BROKER', $2, 'RENT', 0, $2)
         RETURNING id, price_minor;`,
        [propertyId, brokerId],
      );
      assert.equal(BigInt(zeroList.rows[0]!.price_minor), 0n);
      const listingId = zeroList.rows[0]!.id;

      // 2. Negative price_minor on INSERT is rejected
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO listings (
                 property_id, owner_type, broker_id, listing_intent,
                 price_minor, created_by
               ) VALUES ($1, 'INDEPENDENT_BROKER', $2, 'RENT', -100, $2);`,
              [propertyId, brokerId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          assert.ok(err.constraint?.includes("chk_listings_price_minor"));
          return true;
        },
      );

      // 3. Negative price_minor on UPDATE path is rejected
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "UPDATE listings SET price_minor = -500 WHERE id = $1;",
              [listingId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          assert.ok(err.constraint?.includes("chk_listings_price_minor"));
          return true;
        },
      );
    });

    it("demonstrates the broker_id identity existence boundary (FK to auth_identities)", async () => {
      // Valid identity succeeds
      const brokerId = await createTestIdentity("+919876543234", "USER"); // Note: USER role identity can be stored in FK
      const propRes = await pool.query<{ id: string }>(
        `INSERT INTO properties (
           property_type, sub_type, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'APARTMENT', 'Identity Boundary Flat', 'Locality', 'City', 'State', '123456',
           12.0, 77.0, ST_SetSRID(ST_MakePoint(77.0, 12.0), 4326)::geography
         ) RETURNING id;`,
      );
      const propertyId = propRes.rows[0]!.id;

      // The FK ensures identity existence only
      const res = await pool.query<{ id: string }>(
        `INSERT INTO listings (
           property_id, owner_type, broker_id, listing_intent,
           price_minor, created_by
         ) VALUES ($1, 'INDEPENDENT_BROKER', $2, 'RENT', 1000000, $2)
         RETURNING id;`,
        [propertyId, brokerId],
      );
      assert.ok(res.rows[0]?.id);

      // Nonexistent identity is rejected by FK
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO listings (
                 property_id, owner_type, broker_id, listing_intent,
                 price_minor, created_by
               ) VALUES ($1, 'INDEPENDENT_BROKER', $2, 'RENT', 1000000, $3);`,
              [propertyId, nonExistentId, brokerId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForeignKeyViolationError);
          return true;
        },
      );
    });

    it("enforces conditional ownership invariants at database level", async () => {
      const brokerId = await createTestIdentity("+919876543233", "AGENCY_BROKER");
      const propRes = await pool.query<{ id: string }>(
        `INSERT INTO properties (
           property_type, sub_type, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'VILLA', 'Whitefield Main Rd', 'Whitefield', 'Bengaluru', 'Karnataka', '560066',
           12.9698, 77.7499, ST_SetSRID(ST_MakePoint(77.7499, 12.9698), 4326)::geography
         ) RETURNING id;`,
      );
      const propertyId = propRes.rows[0]!.id;

      // Invariant 1: owner_type = 'AGENCY' requires agency_id
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO listings (
                 property_id, owner_type, agency_id, broker_id, listing_intent,
                 price_minor, created_by
               ) VALUES (
                 $1, 'AGENCY', NULL, $2, 'SALE',
                 1500000000, $2
               );`,
              [propertyId, brokerId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          assert.ok(err.constraint?.includes("chk_listings_agency_owner"));
          return true;
        },
      );

      // Invariant 2: owner_type = 'INDEPENDENT_BROKER' requires broker_id and agency_id IS NULL
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO listings (
                 property_id, owner_type, broker_id, listing_intent,
                 price_minor, created_by
               ) VALUES (
                 $1, 'INDEPENDENT_BROKER', NULL, 'SALE',
                 1500000000, $2
               );`,
              [propertyId, brokerId],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          assert.ok(err.constraint?.includes("chk_listings_broker_owner_requires_broker"));
          return true;
        },
      );
    });
  });

  // =========================================================================
  // E. POSTGIS SPATIAL SEARCH PRIMITIVES & GIST INDEX VERIFICATION
  // =========================================================================
  describe("E. PostGIS Spatial Queries & GiST Index Verification", () => {
    async function insertSampleProperties() {
      // 1. Indiranagar, Bengaluru (approx 4.5km from central Bengaluru)
      await pool.query(
        `INSERT INTO properties (
           property_type, sub_type, title, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'APARTMENT', 'Indiranagar Flat', '100ft Rd', 'Indiranagar', 'Bengaluru', 'Karnataka', '560038',
           12.9784, 77.6408, ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)::geography
         );`,
      );

      // 2. Whitefield, Bengaluru (approx 16km from central Bengaluru)
      await pool.query(
        `INSERT INTO properties (
           property_type, sub_type, title, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'VILLA', 'Whitefield Villa', 'ITPB Main Rd', 'Whitefield', 'Bengaluru', 'Karnataka', '560066',
           12.9698, 77.7499, ST_SetSRID(ST_MakePoint(77.7499, 12.9698), 4326)::geography
         );`,
      );

      // 3. Mumbai (~840km from Bengaluru)
      await pool.query(
        `INSERT INTO properties (
           property_type, sub_type, title, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'COMMERCIAL', 'OFFICE', 'BKC Office', 'G Block', 'Bandra Kurla Complex', 'Mumbai', 'Maharashtra', '400051',
           19.0760, 72.8777, ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326)::geography
         );`,
      );
    }

    it("returns nearby properties within radius in meters and excludes distant properties", async () => {
      await insertSampleProperties();

      // Search from Central Bengaluru (Lon: 77.5946, Lat: 12.9716) with 10km radius (10,000 meters)
      const centerLon = 77.5946;
      const centerLat = 12.9716;
      const radiusMeters = 10000;

      const radiusResults = await pool.query<{
        title: string;
        distance: number;
      }>(
        `SELECT title, ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
         FROM properties
         WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         ORDER BY distance ASC;`,
        [centerLon, centerLat, radiusMeters],
      );

      // Indiranagar (~5km) should be found; Whitefield (~16km) and Mumbai (~840km) excluded
      assert.equal(radiusResults.rows.length, 1);
      assert.equal(radiusResults.rows[0]?.title, "Indiranagar Flat");
      assert.ok(Number(radiusResults.rows[0]?.distance) < 6000);

      // Expand radius to 25km (25,000 meters)
      const expandedResults = await pool.query<{ title: string }>(
        `SELECT title
         FROM properties
         WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         ORDER BY ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) ASC;`,
        [centerLon, centerLat, 25000],
      );

      // Both Bengaluru properties returned; Mumbai still excluded
      assert.equal(expandedResults.rows.length, 2);
      assert.equal(expandedResults.rows[0]?.title, "Indiranagar Flat");
      assert.equal(expandedResults.rows[1]?.title, "Whitefield Villa");
    });

    it("filters properties within bounding box", async () => {
      await insertSampleProperties();

      // Bounding box for Bengaluru urban region:
      // minLon: 77.50, minLat: 12.85, maxLon: 77.80, maxLat: 13.10
      const bboxResults = await pool.query<{ title: string }>(
        `SELECT title
         FROM properties
         WHERE ST_Covers(
           ST_MakeEnvelope(77.50, 12.85, 77.80, 13.10, 4326)::geography,
           location
         );`,
      );

      assert.equal(bboxResults.rows.length, 2);
      const titles = bboxResults.rows.map((r) => r.title);
      assert.ok(titles.includes("Indiranagar Flat"));
      assert.ok(titles.includes("Whitefield Villa"));
      assert.ok(!titles.includes("BKC Office"));
    });

    it("verifies spatial GiST index is recognized and utilized by PostgreSQL query planner", async () => {
      // Seed 60 properties across distinct points to provide realistic planner selectivity
      for (let i = 0; i < 60; i++) {
        const lat = 12.8 + (i * 0.01);
        const lon = 77.4 + (i * 0.01);
        await pool.query(
          `INSERT INTO properties (
             property_type, sub_type, address_line_1, locality, city, state, postal_code,
             latitude, longitude, location
           ) VALUES (
             'RESIDENTIAL', 'APARTMENT', 'Seeded Prop ' || $1, 'Locality', 'Bengaluru', 'Karnataka', '560001',
             $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
           );`,
          [i, lat, lon],
        );
      }

      // In a transaction, disable sequential scan to verify GiST index execution capability
      await withTransaction(pool, async (tx) => {
        await tx.query("SET LOCAL enable_seqscan = off;");

        const explainRes = await tx.query<{ "QUERY PLAN": string }>(
          `EXPLAIN (FORMAT TEXT)
           SELECT id FROM properties
           WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography, 2000);`,
        );

        const planText = explainRes.rows.map((r) => r["QUERY PLAN"]).join("\n");
        assert.ok(
          planText.includes("idx_properties_location_gist") ||
          planText.includes("Index Scan") ||
          planText.includes("Bitmap Index Scan"),
          `Expected plan to utilize spatial index, got:\n${planText}`,
        );
      });

      // Verify the GiST index exists in pg_indexes
      const idxCheck = await pool.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE tablename = 'properties' AND indexname = 'idx_properties_location_gist';`,
      );
      assert.equal(idxCheck.rows.length, 1);
      assert.ok(idxCheck.rows[0]?.indexdef.includes("USING gist (location)"));
    });
  });

  // =========================================================================
  // F. RETENTION / DELETION SAFETY (RESTRICT)
  // =========================================================================
  describe("F. Retention / Deletion Safety (Governed Lifecycle)", () => {
    it("prohibits deleting agency when active listings or memberships reference it (ON DELETE RESTRICT)", async () => {
      const brokerId = await createTestIdentity("+919876543241", "INDEPENDENT_BROKER");
      const agencyId = await createTestAgency("Permanent Agency", "permanent-agency");

      const propRes = await pool.query<{ id: string }>(
        `INSERT INTO properties (
           property_type, sub_type, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'APARTMENT', 'Add 1', 'Loc 1', 'City', 'State', '123456',
           12.0, 77.0, ST_SetSRID(ST_MakePoint(77.0, 12.0), 4326)::geography
         ) RETURNING id;`,
      );
      const propertyId = propRes.rows[0]!.id;

      await pool.query(
        `INSERT INTO listings (
           property_id, owner_type, agency_id, broker_id, listing_intent,
           price_minor, created_by
         ) VALUES (
           $1, 'AGENCY', $2, $3, 'SALE',
           100000000, $3
         );`,
        [propertyId, agencyId, brokerId],
      );

      // Attempting to DELETE agency must fail with foreign key violation (RESTRICT)
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query("DELETE FROM agencies WHERE id = $1;", [agencyId]);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForeignKeyViolationError);
          assert.equal(err.code, "FOREIGN_KEY_VIOLATION");
          return true;
        },
      );
    });

    it("prohibits deleting property when listings reference it (ON DELETE RESTRICT)", async () => {
      const brokerId = await createTestIdentity("+919876543242", "INDEPENDENT_BROKER");
      const propRes = await pool.query<{ id: string }>(
        `INSERT INTO properties (
           property_type, sub_type, address_line_1, locality, city, state, postal_code,
           latitude, longitude, location
         ) VALUES (
           'RESIDENTIAL', 'APARTMENT', 'Add 2', 'Loc 2', 'City', 'State', '123456',
           12.1, 77.1, ST_SetSRID(ST_MakePoint(77.1, 12.1), 4326)::geography
         ) RETURNING id;`,
      );
      const propertyId = propRes.rows[0]!.id;

      await pool.query(
        `INSERT INTO listings (
           property_id, owner_type, broker_id, listing_intent,
           price_minor, created_by
         ) VALUES (
           $1, 'INDEPENDENT_BROKER', $2, 'SALE',
           200000000, $2
         );`,
        [propertyId, brokerId],
      );

      // Attempting to DELETE property must fail with foreign key violation (RESTRICT)
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query("DELETE FROM properties WHERE id = $1;", [propertyId]);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForeignKeyViolationError);
          assert.equal(err.code, "FOREIGN_KEY_VIOLATION");
          return true;
        },
      );
    });
  });
});
