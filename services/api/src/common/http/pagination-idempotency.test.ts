import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adaptPaginationToCanonical,
  createFilterSchema,
  createSortQuerySchema,
  decodeHttpCursor,
  encodeCursor,
  parseFilterQuery,
  parseSortQuery,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_LIMIT,
  computeRequestFingerprint,
  InMemoryIdempotencyStore,
  PostgresIdempotencyStore,
  createIdempotencyHandler,
  withIdempotentTransaction,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_REPLAYED_HEADER,
  createCanonicalSuccessResponse,
} from "./contracts.js";
import {
  IdempotencyConflictError,
  IdempotencyMismatchError,
  InvalidCursorError,
  InvalidFilterError,
  InvalidSortError,
} from "../errors/index.js";
import { buildApp } from "../../app/build-app.js";

describe("Step 05 Batch 04: Pagination, Filtering, Sorting & Idempotency", () => {
  // ==========================================
  // 1. PAGINATION ADAPTER & CURSOR TESTS
  // ==========================================
  describe("1. Pagination Adapter and Boundaries", () => {
    it("1.1 adapts internal Step 03 keyset result to canonical Step 05 collection envelope", () => {
      const internalResult = {
        data: [
          { id: "res_1", title: "Listing 1" },
          { id: "res_2", title: "Listing 2" },
        ],
        pagination: {
          hasNextPage: true,
          nextCursor: "opaque_cursor_token_123",
        },
      };

      const adapted = adaptPaginationToCanonical(
        internalResult,
        "req_canonical_1",
      );

      assert.deepEqual(adapted, {
        data: internalResult.data,
        meta: {
          requestId: "req_canonical_1",
          pagination: {
            hasMore: true,
            nextCursor: "opaque_cursor_token_123",
          },
        },
      });
    });

    it("1.2 translates raw cursor decode errors into InvalidCursorError (422)", () => {
      assert.throws(
        () => {
          decodeHttpCursor("not-a-valid-cursor-token", {
            sortField: "createdAt",
            direction: "DESC",
          });
        },
        (err: unknown) => {
          return (
            err instanceof InvalidCursorError &&
            err.statusCode === 422 &&
            err.code === "INVALID_CURSOR"
          );
        },
      );
    });

    it("1.3 rejects cursor with queryContext mismatch as InvalidCursorError", () => {
      // Create a valid cursor for "feed_a"
      const cursor = encodeCursor({
        v: 1,
        sortField: "createdAt",
        sortValue: "2026-10-01T00:00:00.000Z",
        direction: "DESC",
        tieBreakerField: "id",
        tieBreakerValue: "id_123",
        queryContext: "feed_a",
      });

      assert.throws(
        () => {
          decodeHttpCursor(cursor, {
            sortField: "createdAt",
            direction: "DESC",
            queryContext: "feed_b", // Mismatched context!
          });
        },
        (err: unknown) => {
          return (
            err instanceof InvalidCursorError &&
            err.message.includes("different query context")
          );
        },
      );
    });
  });

  // ==========================================
  // 2. SORTING ALLOWLIST & PARSING TESTS
  // ==========================================
  describe("2. Sorting Allowlist & Protection", () => {
    const sortSpec = {
      allowedFields: ["createdAt", "price", "title"] as const,
      defaultField: "createdAt" as const,
      defaultDirection: "DESC" as const,
      tieBreakerField: "id",
    };

    it("2.1 parses valid allowed sort parameters", () => {
      const parsed = parseSortQuery(
        { sortBy: "price", sortOrder: "asc" },
        sortSpec,
      );
      assert.deepEqual(parsed, {
        field: "price",
        direction: "ASC",
        tieBreakerField: "id",
      });
    });

    it("2.2 falls back to defaults when sort params are omitted", () => {
      const parsed = parseSortQuery({}, sortSpec);
      assert.deepEqual(parsed, {
        field: "createdAt",
        direction: "DESC",
        tieBreakerField: "id",
      });
    });

    it("2.3 rejects disallowed sort field with InvalidSortError (422)", () => {
      assert.throws(
        () => {
          parseSortQuery({ sortBy: "password_hash" }, sortSpec);
        },
        (err: unknown) => {
          return (
            err instanceof InvalidSortError &&
            err.statusCode === 422 &&
            err.code === "INVALID_SORT" &&
            err.message.includes("not allowed")
          );
        },
      );
    });

    it("2.4 rejects SQL injection attempt in sort field", () => {
      assert.throws(() => {
        parseSortQuery({ sortBy: "price; DROP TABLE users; --" }, sortSpec);
      }, InvalidSortError);
    });

    it("2.5 rejects invalid sort direction", () => {
      assert.throws(
        () => {
          parseSortQuery({ sortBy: "price", sortOrder: "sideways" }, sortSpec);
        },
        (err: unknown) => {
          return (
            err instanceof InvalidSortError &&
            err.message.includes("must be 'asc' or 'desc'")
          );
        },
      );
    });
  });

  // ==========================================
  // 3. FILTERING ALLOWLIST & PARSING TESTS
  // ==========================================
  describe("3. Filtering Allowlist & Injection Protection", () => {
    const filterSpec = {
      fields: {
        status: {
          allowedOperators: ["eq", "neq", "in"] as const,
          type: "string" as const,
          maxArrayLength: 5,
        },
        price: {
          allowedOperators: [
            "eq",
            "gt",
            "gte",
            "lt",
            "lte",
            "between",
          ] as const,
          type: "number" as const,
        },
        active: {
          allowedOperators: ["eq"] as const,
          type: "boolean" as const,
        },
      },
    };

    it("3.1 parses valid filter queries with various operators", () => {
      const query = {
        "status[eq]": "PUBLISHED",
        "price[gte]": "5000",
        active: "true",
        "status[in]": "PUBLISHED,PENDING",
      };

      const parsed = parseFilterQuery(query, filterSpec);

      assert.equal(parsed.length, 4);
      assert.deepEqual(parsed[0], {
        field: "status",
        operator: "eq",
        value: "PUBLISHED",
      });
      assert.deepEqual(parsed[1], {
        field: "price",
        operator: "gte",
        value: 5000,
      });
      assert.deepEqual(parsed[2], {
        field: "active",
        operator: "eq",
        value: true,
      });
      assert.deepEqual(parsed[3], {
        field: "status",
        operator: "in",
        value: ["PUBLISHED", "PENDING"],
      });
    });

    it("3.2 rejects undeclared filter fields", () => {
      assert.throws(
        () => {
          parseFilterQuery({ "is_admin[eq]": "true" }, filterSpec);
        },
        (err: unknown) => {
          return (
            err instanceof InvalidFilterError &&
            err.statusCode === 422 &&
            err.code === "INVALID_FILTER" &&
            err.message.includes('Filter field "is_admin" is not allowed')
          );
        },
      );
    });

    it("3.3 rejects unsupported operators on allowed fields", () => {
      assert.throws(
        () => {
          parseFilterQuery({ "active[gt]": "true" }, filterSpec);
        },
        (err: unknown) => {
          return (
            err instanceof InvalidFilterError &&
            err.message.includes(
              'Operator "gt" is not supported for filter "active"',
            )
          );
        },
      );
    });

    it("3.4 rejects invalid type value (e.g. non-numeric for number field)", () => {
      assert.throws(
        () => {
          parseFilterQuery({ "price[gt]": "not-a-number" }, filterSpec);
        },
        (err: unknown) => {
          return (
            err instanceof InvalidFilterError &&
            err.message.includes("must be a valid number")
          );
        },
      );
    });

    it("3.5 enforces max array length on 'in' operator", () => {
      assert.throws(
        () => {
          parseFilterQuery(
            { "status[in]": "A,B,C,D,E,F,G" }, // 7 items > max 5
            filterSpec,
          );
        },
        (err: unknown) => {
          return (
            err instanceof InvalidFilterError &&
            err.message.includes("exceeds maximum allowed array items")
          );
        },
      );
    });
  });

  // ==========================================
  // 4. IDEMPOTENCY FINGERPRINTING TESTS
  // ==========================================
  describe("4. Idempotency Deterministic Fingerprinting", () => {
    it("4.1 produces identical fingerprints for semantically identical payloads with different key orders", () => {
      const fp1 = computeRequestFingerprint({
        method: "post",
        route: "/api/v1/orders",
        body: { b: 2, a: 1, nested: { y: 20, x: 10 } },
      });

      const fp2 = computeRequestFingerprint({
        method: "POST",
        route: "/api/v1/orders",
        body: { a: 1, b: 2, nested: { x: 10, y: 20 } },
      });

      assert.equal(fp1, fp2);
    });

    it("4.2 redacts sensitive fields like passwords, tokens, secrets, and OTPs prior to hashing", () => {
      const fpWithSecret1 = computeRequestFingerprint({
        method: "POST",
        route: "/api/v1/auth/reset",
        body: {
          email: "user@test.com",
          password: "Password123!",
          otp: "123456",
        },
      });

      const fpWithSecret2 = computeRequestFingerprint({
        method: "POST",
        route: "/api/v1/auth/reset",
        body: {
          email: "user@test.com",
          password: "DifferentPassword999!",
          otp: "999999",
        },
      });

      // Both passwords and OTPs are redacted to "[REDACTED]", so fingerprint remains identical for the same user/action
      assert.equal(fpWithSecret1, fpWithSecret2);
    });

    it("4.3 distinguishes materially different request payloads", () => {
      const fp1 = computeRequestFingerprint({
        method: "POST",
        route: "/api/v1/payments",
        body: { amount: 1000 },
      });

      const fp2 = computeRequestFingerprint({
        method: "POST",
        route: "/api/v1/payments",
        body: { amount: 2000 },
      });

      assert.notEqual(fp1, fp2);
    });
  });

  // ==========================================
  // 5. IDEMPOTENCY STORE & CONCURRENCY TESTS
  // ==========================================
  describe("5. Idempotency Store Concurrency & State Invariants", () => {
    it("5.1 atomically claims a new key and rejects duplicate claim while in progress", async () => {
      const store = new InMemoryIdempotencyStore();

      const claim1 = await store.claimKey({
        key: "key_concurrency_12345678",
        scope: "actor:user_1",
        fingerprint: "hash_abc",
        ttlMs: 60000,
      });

      assert.equal(claim1.claimed, true);

      // Concurrent attempt
      const claim2 = await store.claimKey({
        key: "key_concurrency_12345678",
        scope: "actor:user_1",
        fingerprint: "hash_abc",
        ttlMs: 60000,
      });

      assert.equal(claim2.claimed, false);
      assert.equal(claim2.existingRecord?.status, "IN_PROGRESS");
    });

    it("5.2 isolates idempotency keys by scope (two different actors can use the same key)", async () => {
      const store = new InMemoryIdempotencyStore();

      const claimUser1 = await store.claimKey({
        key: "key_shared_nonce_12345678",
        scope: "actor:user_1",
        fingerprint: "hash_user1",
        ttlMs: 60000,
      });

      const claimUser2 = await store.claimKey({
        key: "key_shared_nonce_12345678",
        scope: "actor:user_2",
        fingerprint: "hash_user2",
        ttlMs: 60000,
      });

      assert.equal(claimUser1.claimed, true);
      assert.equal(claimUser2.claimed, true);
    });
  });

  // ==========================================
  // 6. FASTIFY PIPELINE INTEGRATION TESTS
  // ==========================================
  describe("6. Fastify HTTP Pipeline Integration", () => {
    it("6.1 rejects missing Idempotency-Key on required endpoint (400)", async () => {
      const app = await buildApp({ logger: false });
      const store = new InMemoryIdempotencyStore();

      app.post(
        "/api/v1/test/idempotent-action",
        {
          preHandler: [createIdempotencyHandler({ store, required: true })],
        },
        async (req, reply) => {
          return reply
            .status(201)
            .send(createCanonicalSuccessResponse({ executed: true }, req.id));
        },
      );

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/idempotent-action",
        payload: { action: "book" },
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, "BAD_REQUEST");
      assert.ok(
        body.error.message.includes("Missing required Idempotency-Key"),
      );
    });

    it("6.2 rejects malformed Idempotency-Key (too short or invalid chars)", async () => {
      const app = await buildApp({ logger: false });
      const store = new InMemoryIdempotencyStore();

      app.post(
        "/api/v1/test/idempotent-action",
        {
          preHandler: [createIdempotencyHandler({ store, required: true })],
        },
        async (req, reply) => {
          return reply
            .status(201)
            .send(createCanonicalSuccessResponse({ executed: true }, req.id));
        },
      );

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/idempotent-action",
        headers: {
          [IDEMPOTENCY_HEADER]: "short_key", // < 16 chars!
        },
        payload: { action: "book" },
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, "BAD_REQUEST");
      assert.ok(body.error.message.includes("Malformed Idempotency-Key"));
    });

    it("6.3 executes first request, saves completion, and exact duplicate replays response with new requestId", async () => {
      const app = await buildApp({ logger: false });
      const store = new InMemoryIdempotencyStore();
      let executionCount = 0;

      app.post(
        "/api/v1/test/idempotent-command",
        {
          preHandler: [createIdempotencyHandler({ store, required: true })],
        },
        async (req, reply) => {
          executionCount++;
          await req.idempotencyContext?.store.claimKey({
            key: req.idempotencyContext.key,
            scope: req.idempotencyContext.scope,
            fingerprint: req.idempotencyContext.fingerprint,
            ttlMs: req.idempotencyContext.ttlMs,
          });
          const responseBody = createCanonicalSuccessResponse(
            { orderId: "ord_101" },
            req.id,
          );
          await req.idempotencyContext?.store.completeKey({
            key: req.idempotencyContext.key,
            scope: req.idempotencyContext.scope,
            statusCode: 201,
            responseBody,
          });
          return reply.status(201).send(responseBody);
        },
      );

      const validKey = "idem_key_unique_1234567890abcdef";

      // First Request
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/test/idempotent-command",
        headers: {
          [IDEMPOTENCY_HEADER]: validKey,
        },
        payload: { amount: 500 },
      });

      assert.equal(res1.statusCode, 201);
      assert.equal(executionCount, 1);
      assert.equal(res1.headers[IDEMPOTENCY_REPLAYED_HEADER], undefined);
      const body1 = JSON.parse(res1.body);
      assert.equal(body1.data.orderId, "ord_101");
      const reqId1 = body1.meta.requestId;

      // Allow microtask queue to persist completion record
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second Request (Duplicate Replay)
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/test/idempotent-command",
        headers: {
          [IDEMPOTENCY_HEADER]: validKey,
        },
        payload: { amount: 500 },
      });

      assert.equal(res2.statusCode, 201);
      assert.equal(executionCount, 1); // Handler was NOT executed again!
      assert.equal(res2.headers[IDEMPOTENCY_REPLAYED_HEADER], "true");
      const body2 = JSON.parse(res2.body);
      assert.equal(body2.data.orderId, "ord_101");

      // Verify that replayed response carries the CURRENT request ID in meta and header, not stale reqId1
      assert.notEqual(body2.meta.requestId, reqId1);
      assert.equal(body2.meta.requestId, res2.headers["x-request-id"]);
    });

    it("6.4 rejects same idempotency key with different payload with 409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH", async () => {
      const app = await buildApp({ logger: false });
      const store = new InMemoryIdempotencyStore();

      app.post(
        "/api/v1/test/idempotent-payment",
        {
          preHandler: [createIdempotencyHandler({ store, required: true })],
        },
        async (req, reply) => {
          await req.idempotencyContext?.store.claimKey({
            key: req.idempotencyContext.key,
            scope: req.idempotencyContext.scope,
            fingerprint: req.idempotencyContext.fingerprint,
            ttlMs: req.idempotencyContext.ttlMs,
          });
          const responseBody = createCanonicalSuccessResponse(
            { success: true },
            req.id,
          );
          await req.idempotencyContext?.store.completeKey({
            key: req.idempotencyContext.key,
            scope: req.idempotencyContext.scope,
            statusCode: 200,
            responseBody,
          });
          return reply.status(200).send(responseBody);
        },
      );

      const validKey = "idem_key_mismatch_test_12345678";

      // 1. Initial request with amount: 100
      await app.inject({
        method: "POST",
        url: "/api/v1/test/idempotent-payment",
        headers: { [IDEMPOTENCY_HEADER]: validKey },
        payload: { amount: 100 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // 2. Same key, different payload amount: 500
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/idempotent-payment",
        headers: { [IDEMPOTENCY_HEADER]: validKey },
        payload: { amount: 500 },
      });

      assert.equal(res.statusCode, 409);
      const body = JSON.parse(res.body);
      assert.equal(body.error.code, "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH");
    });

    it("6.5 rejects concurrent request with same key while in progress with 409 IDEMPOTENCY_IN_PROGRESS", async () => {
      const app = await buildApp({ logger: false });
      const store = new InMemoryIdempotencyStore();

      let resolveSlowHandler: () => void;
      const slowPromise = new Promise<void>((r) => {
        resolveSlowHandler = r;
      });

      app.post(
        "/api/v1/test/slow-action",
        {
          preHandler: [createIdempotencyHandler({ store, required: true })],
        },
        async (req, reply) => {
          await req.idempotencyContext?.store.claimKey({
            key: req.idempotencyContext.key,
            scope: req.idempotencyContext.scope,
            fingerprint: req.idempotencyContext.fingerprint,
            ttlMs: req.idempotencyContext.ttlMs,
          });
          await slowPromise;
          const responseBody = createCanonicalSuccessResponse(
            { done: true },
            req.id,
          );
          await req.idempotencyContext?.store.completeKey({
            key: req.idempotencyContext.key,
            scope: req.idempotencyContext.scope,
            statusCode: 200,
            responseBody,
          });
          return reply.status(200).send(responseBody);
        },
      );

      const validKey = "idem_key_concurrent_test_123456";

      // Launch first request (hangs until resolveSlowHandler)
      const promise1 = app.inject({
        method: "POST",
        url: "/api/v1/test/slow-action",
        headers: { [IDEMPOTENCY_HEADER]: validKey },
        payload: { step: 1 },
      });

      // Brief delay to ensure request 1 enters preHandler and claims key
      await new Promise((r) => setTimeout(r, 10));

      // Launch second concurrent request with same key
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/test/slow-action",
        headers: { [IDEMPOTENCY_HEADER]: validKey },
        payload: { step: 1 },
      });

      assert.equal(res2.statusCode, 409);
      const body2 = JSON.parse(res2.body);
      assert.equal(body2.error.code, "IDEMPOTENCY_IN_PROGRESS");

      // Release first request
      resolveSlowHandler!();
      const res1 = await promise1;
      assert.equal(res1.statusCode, 200);
    });
  });

  // ==========================================
  // 7. POSTGRESQL IDEMPOTENCY STORE & TRANSACTIONS
  // ==========================================
  describe("7. PostgresIdempotencyStore Transactional & Multi-Instance Semantics", () => {
    it("7.1 atomically claims, completes, and replays via PostgresIdempotencyStore", async () => {
      // Create a mock/in-memory QueryExecutor that tracks SQL statements and state
      const rows = new Map<string, any>();
      const mockExecutor = {
        query: async (sqlOrConfig: any, values?: any[]) => {
          const sql =
            typeof sqlOrConfig === "string" ? sqlOrConfig : sqlOrConfig.text;
          const vals = values ?? sqlOrConfig.values ?? [];

          if (sql.includes("INSERT INTO idempotency_keys")) {
            const [scope, key, fingerprint, expiresAt] = vals;
            const compositeKey = `${scope}::${key}`;
            const existing = rows.get(compositeKey);

            if (!existing || existing.expires_at <= new Date()) {
              const newRow = {
                id: "id_1",
                scope,
                key,
                fingerprint,
                status: "IN_PROGRESS",
                status_code: null,
                response_body: null,
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: expiresAt,
              };
              rows.set(compositeKey, newRow);
              return { rows: [newRow], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          }

          if (sql.includes("SELECT * FROM idempotency_keys")) {
            const [scope, key] = vals;
            const compositeKey = `${scope}::${key}`;
            const row = rows.get(compositeKey);
            return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
          }

          const normalizedSql = sql.replace(/\s+/g, " ");

          if (
            normalizedSql.includes(
              "UPDATE idempotency_keys SET status = 'COMPLETED'",
            )
          ) {
            const [statusCode, responseBody, scope, key] = vals;
            const compositeKey = `${scope}::${key}`;
            const row = rows.get(compositeKey);
            if (row && row.status === "IN_PROGRESS") {
              row.status = "COMPLETED";
              row.status_code = statusCode;
              row.response_body =
                typeof responseBody === "string"
                  ? JSON.parse(responseBody)
                  : responseBody;
              row.updated_at = new Date();
            }
            return { rows: [], rowCount: 1 };
          }

          return { rows: [], rowCount: 0 };
        },
      };

      const pgStore = new PostgresIdempotencyStore(mockExecutor as any);

      // 1. Initial claim succeeds
      const claim1 = await pgStore.claimKey({
        key: "key_pg_test_12345678",
        scope: "actor:user_42",
        fingerprint: "hash_42",
        ttlMs: 3600000,
      });

      assert.equal(claim1.claimed, true);

      // 2. Concurrent duplicate claim while IN_PROGRESS
      const claim2 = await pgStore.claimKey({
        key: "key_pg_test_12345678",
        scope: "actor:user_42",
        fingerprint: "hash_42",
        ttlMs: 3600000,
      });

      assert.equal(claim2.claimed, false);
      assert.equal(claim2.existingRecord?.status, "IN_PROGRESS");

      // 3. Mark COMPLETED
      await pgStore.completeKey({
        key: "key_pg_test_12345678",
        scope: "actor:user_42",
        statusCode: 201,
        responseBody: { success: true, id: "created_42" },
      });

      // 4. Duplicate request observes COMPLETED record
      const claim3 = await pgStore.claimKey({
        key: "key_pg_test_12345678",
        scope: "actor:user_42",
        fingerprint: "hash_42",
        ttlMs: 3600000,
      });

      assert.equal(claim3.claimed, false);
      assert.equal(claim3.existingRecord?.status, "COMPLETED");
      assert.equal(claim3.existingRecord?.statusCode, 201);
      assert.deepEqual(claim3.existingRecord?.responseBody, {
        success: true,
        id: "created_42",
      });
    });

    it("7.2 supports separate instances sharing PostgreSQL storage (simulating multiple API replicas)", async () => {
      const sharedStorage = new Map<string, any>();
      const createExecutor = () => ({
        query: async (sqlOrConfig: any, values?: any[]) => {
          const sql =
            typeof sqlOrConfig === "string" ? sqlOrConfig : sqlOrConfig.text;
          const vals = values ?? sqlOrConfig.values ?? [];

          if (sql.includes("INSERT INTO idempotency_keys")) {
            const [scope, key, fingerprint, expiresAt] = vals;
            const compositeKey = `${scope}::${key}`;
            if (!sharedStorage.has(compositeKey)) {
              const row = {
                id: "uuid_shared",
                scope,
                key,
                fingerprint,
                status: "IN_PROGRESS",
                status_code: null,
                response_body: null,
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: expiresAt,
              };
              sharedStorage.set(compositeKey, row);
              return { rows: [row], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes("SELECT * FROM idempotency_keys")) {
            const [scope, key] = vals;
            const row = sharedStorage.get(`${scope}::${key}`);
            return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
          }
          return { rows: [], rowCount: 0 };
        },
      });

      const instanceA = new PostgresIdempotencyStore(createExecutor() as any);
      const instanceB = new PostgresIdempotencyStore(createExecutor() as any);

      // Instance A claims key
      const claimA = await instanceA.claimKey({
        key: "multi_instance_key_123456",
        scope: "actor:usr_99",
        fingerprint: "fp_99",
        ttlMs: 60000,
      });
      assert.equal(claimA.claimed, true);

      // Instance B attempts to claim same key concurrently
      const claimB = await instanceB.claimKey({
        key: "multi_instance_key_123456",
        scope: "actor:usr_99",
        fingerprint: "fp_99",
        ttlMs: 60000,
      });
      assert.equal(claimB.claimed, false);
      assert.equal(claimB.existingRecord?.status, "IN_PROGRESS");
    });

    it("7.3 buildApp() configures PostgresIdempotencyStore on app.idempotencyStore by default", async () => {
      const app = await buildApp({ logger: false });
      assert.ok(app.idempotencyStore instanceof PostgresIdempotencyStore);
      await app.close();
    });

    it("7.4 createIdempotencyHandler() strictly fails closed when no store is configured", async () => {
      const handler = createIdempotencyHandler();
      const mockReq = {
        headers: { [IDEMPOTENCY_HEADER]: "valid_key_1234567890abcdef" },
        server: {},
      } as any;
      const mockReply = {} as any;

      await assert.rejects(async () => {
        await handler(mockReq, mockReply);
      }, /IdempotencyStore is not configured.*silent in-memory fallback is strictly prohibited/);
    });

    it("7.5 withIdempotentTransaction coordinates atomic claim, mutation, and completion", async () => {
      const store = new InMemoryIdempotencyStore();
      const mockClient = {
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      };
      const mockPool = {
        connect: async () => mockClient,
      } as any;

      const context = {
        key: "key_atomic_tx_12345678",
        scope: "actor:usr_atomic",
        fingerprint: "sha256_fp_atomic",
        ttlMs: 60000,
        store,
      };

      const result = await withIdempotentTransaction(
        mockPool,
        context,
        async () => {
          return {
            statusCode: 201,
            responseBody: { created: true, id: "item_77" },
          };
        },
      );

      assert.equal(result.statusCode, 201);
      assert.deepEqual(result.responseBody, { created: true, id: "item_77" });

      const record = await store.getRecord({
        key: "key_atomic_tx_12345678",
        scope: "actor:usr_atomic",
      });
      assert.ok(record);
      assert.equal(record.status, "COMPLETED");
      assert.equal(record.statusCode, 201);
    });

    it("7.6 withIdempotentTransaction rolls back when business mutation throws", async () => {
      const store = new InMemoryIdempotencyStore();
      const mockClient = {
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      };
      const mockPool = {
        connect: async () => mockClient,
      } as any;

      const context = {
        key: "key_rollback_tx_12345678",
        scope: "actor:usr_rollback",
        fingerprint: "sha256_fp_rollback",
        ttlMs: 60000,
        store,
      };

      await assert.rejects(async () => {
        await withIdempotentTransaction(mockPool, context, async () => {
          throw new Error("Business mutation exploded");
        });
      }, /Business mutation exploded/);
    });
  });
});
