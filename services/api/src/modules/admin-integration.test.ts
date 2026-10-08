import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import errorHandlerPlugin from "../plugins/error-handler.js";
import rateLimitPlugin from "../plugins/rate-limit.js";
import authenticationPlugin from "../plugins/authentication.js";
import authorizationPlugin from "../plugins/authorization.js";
import requestContextPlugin from "../plugins/request-context.js";
import { registerIdentityModule } from "./identity/index.js";
import { registerAgenciesModule } from "./agencies/index.js";
import { registerListingsModule } from "./listings/index.js";
import { registerOperationsModule } from "./operations/index.js";
import { signAccessToken } from "./identity/utils/tokens.js";
import { env } from "../config/env.js";

describe("Super Admin & Operations Modules Integration Tests", () => {
  let app: FastifyInstance;
  let mockPool: any;
  let adminToken: string;
  let userToken: string;
  const adminId = "550e8400-e29b-41d4-a716-446655440001";
  const regularUserId = "550e8400-e29b-41d4-a716-446655440002";
  const brokerId = "550e8400-e29b-41d4-a716-446655440003";

  beforeEach(async () => {
    // In-memory mock database store
    const dbStore = {
      identities: new Map<string, any>(),
      profiles: new Map<string, any>(),
      sessions: new Map<string, any>(),
      agencies: new Map<string, any>(),
      agencyMemberships: new Map<string, any>(),
      properties: new Map<string, any>(),
      listings: new Map<string, any>(),
      brokerVerifications: new Map<string, any>(),
      deals: new Map<string, any>(),
      cancellations: new Map<string, any>(),
      visits: new Map<string, any>(),
      urgentRequirements: new Map<string, any>(),
    };

    // Pre-seed admin and regular user
    dbStore.identities.set(adminId, {
      id: adminId,
      phone: "+919999999999",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });
    dbStore.profiles.set(adminId, {
      user_id: adminId,
      full_name: "Super Admin",
      email: "admin@zerobrokerage.com",
    });

    dbStore.identities.set(regularUserId, {
      id: regularUserId,
      phone: "+918888888888",
      role: "USER",
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });

    dbStore.identities.set(brokerId, {
      id: brokerId,
      phone: "+917777777777",
      role: "INDEPENDENT_BROKER",
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });
    dbStore.brokerVerifications.set(brokerId, {
      id: "bv-001",
      user_id: brokerId,
      status: "PENDING",
      license_number: "BRK-12345",
      document_urls: ["https://example.com/license.pdf"],
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Pre-seed sessions
    const adminSessionId = "sess-admin";
    dbStore.sessions.set(adminSessionId, {
      id: adminSessionId,
      user_id: adminId,
      refresh_token_hash: "hash",
      revoked_at: null,
      expires_at: new Date(Date.now() + 1000000),
    });

    const userSessionId = "sess-user";
    dbStore.sessions.set(userSessionId, {
      id: userSessionId,
      user_id: regularUserId,
      refresh_token_hash: "hash",
      revoked_at: null,
      expires_at: new Date(Date.now() + 1000000),
    });

    adminToken = signAccessToken(
      { sub: adminId, sessionId: adminSessionId, role: "SUPER_ADMIN" },
      env.JWT_SECRET,
      900,
    );

    userToken = signAccessToken(
      { sub: regularUserId, sessionId: userSessionId, role: "USER" },
      env.JWT_SECRET,
      900,
    );

    mockPool = {
      query: async (text: string, params: any[] = []) => {
        const norm = text.replace(/\s+/g, " ").trim();

        // auth_sessions lookup
        if (norm.includes("FROM auth_sessions WHERE id = $1")) {
          const s = dbStore.sessions.get(params[0]);
          return { rows: s ? [s] : [], rowCount: s ? 1 : 0 };
        }

        // auth_identities lookup by id
        if (norm.includes("FROM auth_identities WHERE id = $1")) {
          const u = dbStore.identities.get(params[0]);
          return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
        }

        // user_profiles lookup
        if (norm.includes("FROM user_profiles WHERE user_id = $1")) {
          const p = dbStore.profiles.get(params[0]);
          return { rows: p ? [p] : [], rowCount: p ? 1 : 0 };
        }

        // auth_identities count
        if (norm.includes("SELECT COUNT(*) FROM auth_identities")) {
          return { rows: [{ count: "5" }], rowCount: 1 };
        }

        // agencies count
        if (norm.includes("SELECT COUNT(*) FROM agencies")) {
          return { rows: [{ count: "2" }], rowCount: 1 };
        }

        // listings count
        if (norm.includes("SELECT COUNT(*) FROM listings")) {
          return { rows: [{ count: "10" }], rowCount: 1 };
        }

        // auth_security_events
        if (norm.includes("FROM auth_security_events")) {
          return { rows: [], rowCount: 0 };
        }

        // listBrokers
        if (norm.includes("LEFT JOIN broker_verifications bv")) {
          const broker = dbStore.identities.get(brokerId);
          const bv = dbStore.brokerVerifications.get(brokerId);
          const rows = broker
            ? [
                {
                  id: broker.id,
                  phone: broker.phone,
                  role: broker.role,
                  status: broker.status,
                  created_at: broker.created_at,
                  updated_at: broker.updated_at,
                  full_name: "Test Broker",
                  email: "broker@example.com",
                  avatar_url: null,
                  agency_name: "Test Agency",
                  verification_status: bv?.status ?? "PENDING",
                  license_number: bv?.license_number ?? "BRK-123",
                  document_urls: bv?.document_urls ?? [],
                  rejection_reason: bv?.rejection_reason ?? null,
                  reviewed_at: null,
                },
              ]
            : [];
          return { rows, rowCount: rows.length };
        }

        // listUsers
        if (norm.includes("FROM auth_identities i LEFT JOIN user_profiles p")) {
          const rows = Array.from(dbStore.identities.values()).map((i) => ({
            id: i.id,
            phone: i.phone,
            role: i.role,
            status: i.status,
            created_at: i.created_at,
            updated_at: i.updated_at,
            full_name: dbStore.profiles.get(i.id)?.full_name ?? null,
            email: dbStore.profiles.get(i.id)?.email ?? null,
            avatar_url: null,
          }));
          return { rows, rowCount: rows.length };
        }

        // broker_verifications lookup / update
        if (norm.includes("FROM broker_verifications WHERE user_id = $1")) {
          const bv = dbStore.brokerVerifications.get(params[0]);
          return { rows: bv ? [bv] : [], rowCount: bv ? 1 : 0 };
        }

        if (norm.startsWith("INSERT INTO broker_verifications")) {
          const rec = {
            id: "bv-001",
            user_id: params[0],
            status: params[1],
            license_number: "BRK-12345",
            document_urls: [],
            rejection_reason: params[2],
            reviewed_by: params[3],
            reviewed_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          };
          dbStore.brokerVerifications.set(params[0], rec);
          return { rows: [rec], rowCount: 1 };
        }

        // agencies queries
        if (norm.startsWith("INSERT INTO agencies")) {
          const agency = {
            id: "550e8400-e29b-41d4-a716-446655440010",
            name: params[0],
            slug: params[1],
            legal_name: params[2],
            license_number: params[3],
            status: params[4] ?? "ACTIVE",
            email: params[5],
            phone: params[6],
            address_line_1: params[7],
            address_line_2: params[8],
            city: params[9],
            state: params[10],
            postal_code: params[11],
            country_code: params[12] ?? "IN",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          };
          dbStore.agencies.set(agency.id, agency);
          return { rows: [agency], rowCount: 1 };
        }

        if (norm.includes("FROM agencies WHERE slug = $1")) {
          const found = Array.from(dbStore.agencies.values()).find((a) => a.slug === params[0]);
          return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (norm.includes("FROM agencies WHERE id = $1")) {
          const found = dbStore.agencies.get(params[0]);
          return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (norm.startsWith("UPDATE agencies SET status = $1")) {
          const found = dbStore.agencies.get(params[1]);
          if (found) {
            found.status = params[0];
            return { rows: [found], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }

        if (norm.includes("FROM agencies")) {
          const rows = Array.from(dbStore.agencies.values());
          return { rows, rowCount: rows.length };
        }

        // properties queries
        if (norm.includes("FROM properties WHERE id = $1")) {
          const prop = {
            id: params[0],
            property_type: "RESIDENTIAL",
            sub_type: "APARTMENT",
            title: "Sunny Heights",
            address_line_1: "123 Main St",
            address_line_2: null,
            locality: "Indiranagar",
            city: "Bangalore",
            state: "Karnataka",
            postal_code: "560038",
            country_code: "IN",
            latitude: 12.9716,
            longitude: 77.5946,
            built_up_area: 1200,
            carpet_area: 1000,
            plot_area: null,
            area_unit: "SQ_FT",
            bedroom_count: 2,
            bathroom_count: 2,
            balcony_count: 1,
            floor_number: 3,
            total_floors: 5,
            furnishing_status: "SEMI_FURNISHED",
            amenities: ["GYM", "LIFT"],
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          };
          return { rows: [prop], rowCount: 1 };
        }

        if (norm.includes("FROM properties")) {
          return { rows: [], rowCount: 0 };
        }

        // listings queries
        if (norm.includes("FROM listings WHERE id = $1")) {
          const listing = {
            id: params[0],
            property_id: "550e8400-e29b-41d4-a716-446655440020",
            owner_type: "DIRECT_OWNER",
            agency_id: null,
            broker_id: null,
            listing_intent: "RENT",
            title: "Great 2BHK Flat",
            description: "Spacious flat",
            price_minor: "2500000",
            currency: "INR",
            price_period: "MONTHLY",
            security_deposit_minor: "5000000",
            maintenance_fee_minor: null,
            is_negotiable: true,
            available_from: null,
            status: "DRAFT",
            is_verified: true,
            is_featured: false,
            created_by: adminId,
            updated_by: null,
            published_at: null,
            expires_at: null,
            archived_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          return { rows: [listing], rowCount: 1 };
        }

        if (norm.startsWith("UPDATE listings SET status = $2::varchar")) {
          const listing = {
            id: params[0],
            property_id: "550e8400-e29b-41d4-a716-446655440020",
            owner_type: "DIRECT_OWNER",
            agency_id: null,
            broker_id: null,
            listing_intent: "RENT",
            title: "Great 2BHK Flat",
            description: "Spacious flat",
            price_minor: "2500000",
            currency: "INR",
            price_period: "MONTHLY",
            security_deposit_minor: null,
            maintenance_fee_minor: null,
            is_negotiable: false,
            available_from: null,
            status: params[1],
            is_verified: true,
            is_featured: false,
            created_by: adminId,
            updated_by: null,
            published_at: new Date(),
            expires_at: null,
            archived_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          return { rows: [listing], rowCount: 1 };
        }

        if (norm.includes("FROM listings")) {
          return { rows: [], rowCount: 0 };
        }

        // deals queries
        if (norm.includes("FROM deals")) {
          return { rows: [], rowCount: 0 };
        }

        // default fallback
        return { rows: [], rowCount: 0 };
      },
    };

    const mockDbPlugin = fp(
      async (f) => {
        f.decorate("db", mockPool);
      },
      { name: "database" },
    );

    app = Fastify();
    await app.register(requestContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(mockDbPlugin);
    await app.register(rateLimitPlugin);
    await app.register(authenticationPlugin);
    await app.register(authorizationPlugin);
    await app.register(registerIdentityModule);
    await app.register(registerAgenciesModule);
    await app.register(registerListingsModule);
    await app.register(registerOperationsModule);

    await app.ready();
  });

  it("authenticates super admin and returns session info", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/session",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.user.role, "SUPER_ADMIN");
    assert.ok(Array.isArray(body.data.permissions));
  });

  it("rejects non-admin from /api/v1/admin/auth/session with 403 Forbidden", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/session",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });

    assert.equal(res.statusCode, 403);
  });

  it("rejects unauthenticated requests to protected admin routes with 401 Unauthorized", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
    });

    assert.equal(res.statusCode, 401);
  });

  it("lists platform users for super admin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta.requestId);
  });

  it("lists platform brokers for super admin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/brokers",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data[0].id, brokerId);
  });

  it("approves broker verification", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/brokers/${brokerId}/approve`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.verification, "APPROVED");
  });

  it("rejects broker verification with a reason", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/brokers/${brokerId}/reject`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: { reason: "Invalid license document" },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.verification, "REJECTED");
    assert.equal(body.data.reason, "Invalid license document");
  });

  it("creates and approves agency via admin endpoints", async () => {
    // 1. Create agency
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/admin/agencies",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "Prime Estates",
        slug: "prime-estates",
        city: "Mumbai",
      },
    });

    assert.equal(createRes.statusCode, 201);
    const createdBody = JSON.parse(createRes.payload);
    const agencyId = createdBody.data.id;

    // 2. Approve agency
    const approveRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/agencies/${agencyId}/approve`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    assert.equal(approveRes.statusCode, 200);
    const approvedBody = JSON.parse(approveRes.payload);
    assert.equal(approvedBody.data.status, "ACTIVE");
  });

  it("approves and publishes listing via admin endpoints", async () => {
    const listingId = "550e8400-e29b-41d4-a716-446655440020";
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/listings/${listingId}/approve`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.status, "PUBLISHED");
  });

  it("returns dashboard stats and monitoring information", async () => {
    const statsRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/dashboard",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(statsRes.statusCode, 200);
    const statsBody = JSON.parse(statsRes.payload);
    assert.equal(statsBody.data.totalUsers, 5);
    assert.equal(statsBody.data.totalAgencies, 2);

    const monRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/monitoring",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(monRes.statusCode, 200);
    const monBody = JSON.parse(monRes.payload);
    assert.equal(monBody.data.status, "HEALTHY");
  });

  it("returns revenue overview and trends", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/revenue/overview",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.currency, "INR");
    assert.ok(body.data.totalRevenue > 0);
  });

  it("returns dual-compatibility route /api/admin/dashboard seamlessly", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/dashboard",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.totalUsers, 5);
  });
});
