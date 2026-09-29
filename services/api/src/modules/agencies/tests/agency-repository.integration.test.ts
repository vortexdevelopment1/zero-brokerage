import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Pool } from "pg";
import { createDatabasePool, withTransaction } from "@zero-brokerage/database";
import { AgencyRepository } from "../repositories/agency-repository.js";

// Note: createDatabasePool using test DB url for real integration test
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/zero_brokerage_test";

describe("AgencyRepository Integration Tests (Real PostgreSQL)", () => {
  let pool: Pool;
  let repository: AgencyRepository;

  before(async () => {
    pool = createDatabasePool({ connectionString: TEST_DB_URL, maxConnections: 5 });
    repository = new AgencyRepository(pool);
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
        auth_identities
      CASCADE;
    `);
  });

  it("creates, retrieves by id and slug, and lists agencies with keyset pagination", async () => {
    // 1. Create agencies
    const agency1 = await repository.createAgency({
      name: "Blue Horizon Realty",
      slug: "blue-horizon-realty",
      city: "Bengaluru",
      state: "Karnataka",
      email: "contact@bluehorizon.com",
    });

    const agency2 = await repository.createAgency({
      name: "Golden Key Properties",
      slug: "golden-key-props",
      city: "Bengaluru",
      state: "Karnataka",
    });

    const agency3 = await repository.createAgency({
      name: "Coastal Living",
      slug: "coastal-living",
      city: "Mumbai",
      state: "Maharashtra",
    });

    assert.ok(agency1.id);
    assert.equal(agency1.slug, "blue-horizon-realty");

    // 2. Find by ID
    const foundById = await repository.findById(agency1.id);
    assert.deepEqual(foundById, agency1);

    // 3. Find by Slug
    const foundBySlug = await repository.findBySlug("golden-key-props");
    assert.deepEqual(foundBySlug, agency2);

    // 4. Keyset pagination: Page 1 (limit 2)
    const page1 = await repository.listAgencies({ limit: 2 });
    assert.equal(page1.data.length, 2);
    assert.equal(page1.pagination.hasNextPage, true);
    assert.ok(page1.pagination.nextCursor);

    // Page 2 using cursor
    const page2 = await repository.listAgencies({
      limit: 2,
      cursor: page1.pagination.nextCursor,
    });
    assert.equal(page2.data.length, 1);
    assert.equal(page2.pagination.hasNextPage, false);

    // Ensure zero overlap between page 1 and page 2
    const p1Ids = new Set(page1.data.map((a) => a.id));
    for (const a of page2.data) {
      assert.equal(p1Ids.has(a.id), false);
    }
  });

  it("adds and queries agency members with transaction participation", async () => {
    // Create agency and user identity
    const agency = await repository.createAgency({
      name: "Alliance Realty",
      slug: "alliance-realty",
    });

    const userRes = await pool.query<{ id: string }>(
      "INSERT INTO auth_identities (phone, role) VALUES ('+919876543301', 'AGENCY_ADMIN') RETURNING id;",
    );
    const userId = userRes.rows[0]!.id;

    // Add member within transaction
    await withTransaction(pool, async (tx) => {
      const member = await repository.addMember(
        {
          agencyId: agency.id,
          userId,
          role: "AGENCY_OWNER",
        },
        tx,
      );
      assert.equal(member.agencyId, agency.id);
      assert.equal(member.userId, userId);
      assert.equal(member.role, "AGENCY_OWNER");
    });

    // Query members
    const members = await repository.findMembers(agency.id);
    assert.equal(members.length, 1);
    assert.equal(members[0]?.userId, userId);
    assert.equal(members[0]?.role, "AGENCY_OWNER");
  });
});
