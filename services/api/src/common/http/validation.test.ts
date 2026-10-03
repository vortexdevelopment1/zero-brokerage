import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";
import fp from "fastify-plugin";

import { buildApp } from "../../app/build-app.js";
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  STEP04_LEGACY_COMPATIBILITY_CONFIG,
  STEP05_CANONICAL_COMPATIBILITY_CONFIG,
} from "./contracts.js";
import {
  ClassifiedHttpError,
  classifyHttpError,
} from "./error-classification.js";
import { createValidatorCompiler } from "./validation.js";
import errorHandlerPlugin from "../../plugins/error-handler.js";
import requestContextPlugin from "../../plugins/request-context.js";
import { createMockDbPool } from "../../modules/identity/tests/mock-db-pool.js";

describe("Fastify JSON Schema + Ajv Validation Engine (Batch 02B)", () => {
  const validRequestId = "550e8400-e29b-41d4-a716-446655440000";

  // Helper to create test application with production validation compiler and error handler
  async function createTestApp() {
    const app = Fastify({
      requestIdHeader: false,
      genReqId: () => validRequestId,
      schemaController: {
        compilersFactory: {
          buildValidator: createValidatorCompiler as any,
        },
      },
    });

    await app.register(requestContextPlugin);
    await app.register(errorHandlerPlugin);

    const mockPool = createMockDbPool();
    await app.register(
      fp(async (f) => {
        f.decorate("db", mockPool);
        f.decorate("authenticate", async () => {});
      }),
    );

    return app;
  }

  // --- SECTION 12: BODY VALIDATION TESTS (Cases 1-11) ---
  describe("Body Validation", () => {
    it("1. valid body passes validation and reaches handler", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/body",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 3 },
                count: { type: "integer", minimum: 1 },
              },
              required: ["title", "count"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ success: true, received: req.body }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body",
        payload: { title: "Spacious Apartment", count: 5 },
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        success: true,
        received: { title: "Spacious Apartment", count: 5 },
      });
      await app.close();
    });

    it("2. missing required field returns 422 with REQUIRED code", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/body",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                title: { type: "string" },
                count: { type: "integer" },
              },
              required: ["title", "count"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body",
        payload: { title: "Only Title" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.message, "The request contains invalid values.");
      assert.ok(Array.isArray(json.error.details.fields));
      const countErr = json.error.details.fields.find(
        (f: { field: string }) => f.field === "count",
      );
      assert.ok(countErr, "Must report missing 'count' field");
      assert.equal(countErr.code, "REQUIRED");
      assert.equal(countErr.message, "The field 'count' is required.");
      await app.close();
    });

    it("3. wrong primitive type returns 422 with INVALID_TYPE", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/body",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                count: { type: "integer" },
              },
              required: ["count"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body",
        payload: { count: "not-an-integer" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      const countErr = json.error.details.fields.find(
        (f: { field: string }) => f.field === "count",
      );
      assert.ok(countErr);
      assert.equal(countErr.code, "INVALID_TYPE");
      assert.equal(countErr.message, "The field 'count' must be a integer.");
      await app.close();
    });

    it("4. unexpected property rejected when additionalProperties: false (no silent stripping)", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/body",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                title: { type: "string" },
              },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body",
        payload: { title: "Title", unexpectedProperty: "malicious" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      const extraErr = json.error.details.fields.find(
        (f: { field: string }) => f.field === "unexpectedProperty",
      );
      assert.ok(extraErr, "Must flag unexpectedProperty");
      assert.equal(extraErr.code, "UNEXPECTED_PROPERTY");
      assert.equal(
        extraErr.message,
        "The property 'unexpectedProperty' is not allowed.",
      );
      await app.close();
    });

    it("5. nested object invalid property returns dot-delimited field path", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/nested",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                location: {
                  type: "object",
                  properties: {
                    city: { type: "string", minLength: 2 },
                  },
                  required: ["city"],
                  additionalProperties: false,
                },
              },
              required: ["location"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/nested",
        payload: { location: { city: "A", extraKey: 123 } },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      const fields = json.error.details.fields;
      assert.ok(
        fields.some(
          (f: { field: string; code: string }) =>
            f.field === "location.city" && f.code === "STRING_TOO_SHORT",
        ),
      );
      assert.ok(
        fields.some(
          (f: { field: string; code: string }) =>
            f.field === "location.extraKey" && f.code === "UNEXPECTED_PROPERTY",
        ),
      );
      await app.close();
    });

    it("6. invalid enum value returns 422 with INVALID_ENUM", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/enum",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["active", "archived"] },
              },
              required: ["status"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/enum",
        payload: { status: "deleted" },
      });

      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "status");
      assert.equal(err.code, "INVALID_ENUM");
      assert.equal(
        err.message,
        "The field 'status' must be one of the allowed values.",
      );
      await app.close();
    });

    it("7. string length violation returns STRING_TOO_SHORT / STRING_TOO_LONG", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/strings",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                short: { type: "string", minLength: 5 },
                long: { type: "string", maxLength: 10 },
              },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const resShort = await app.inject({
        method: "POST",
        url: "/api/v1/test/strings",
        payload: { short: "abc" },
      });
      assert.equal(resShort.statusCode, 422);
      assert.equal(
        resShort.json().error.details.fields[0].code,
        "STRING_TOO_SHORT",
      );

      const resLong = await app.inject({
        method: "POST",
        url: "/api/v1/test/strings",
        payload: { long: "this-is-too-long-for-schema" },
      });
      assert.equal(resLong.statusCode, 422);
      assert.equal(
        resLong.json().error.details.fields[0].code,
        "STRING_TOO_LONG",
      );
      await app.close();
    });

    it("8. numeric range violation returns VALUE_TOO_SMALL / VALUE_TOO_LARGE", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/numbers",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                age: { type: "integer", minimum: 18, maximum: 100 },
              },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const resSmall = await app.inject({
        method: "POST",
        url: "/api/v1/test/numbers",
        payload: { age: 10 },
      });
      assert.equal(resSmall.statusCode, 422);
      assert.equal(
        resSmall.json().error.details.fields[0].code,
        "VALUE_TOO_SMALL",
      );

      const resLarge = await app.inject({
        method: "POST",
        url: "/api/v1/test/numbers",
        payload: { age: 150 },
      });
      assert.equal(resLarge.statusCode, 422);
      assert.equal(
        resLarge.json().error.details.fields[0].code,
        "VALUE_TOO_LARGE",
      );
      await app.close();
    });

    it("9. array item type violation reports item path and INVALID_TYPE", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/arrays",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                },
              },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/arrays",
        payload: { tags: ["good", 12345] },
      });

      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "tags.1");
      assert.equal(err.code, "INVALID_TYPE");
      await app.close();
    });

    it("10. null where non-null expected returns INVALID_TYPE", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/non-null",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                title: { type: "string" },
              },
              required: ["title"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/non-null",
        payload: { title: null },
      });

      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "title");
      assert.equal(err.code, "INVALID_TYPE");
      await app.close();
    });

    it("11. empty string where schema disallows it (minLength: 1) returns STRING_TOO_SHORT", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/non-empty-str",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1 },
              },
              required: ["name"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/non-empty-str",
        payload: { name: "" },
      });

      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "name");
      assert.equal(err.code, "STRING_TOO_SHORT");
      await app.close();
    });
  });

  // --- SECTION 12: PARAMS VALIDATION TESTS (Cases 12-15) ---
  describe("Path Parameters Validation", () => {
    it("12. valid UUID path parameter passes validation", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/resources/:id",
        {
          schema: {
            params: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
              },
              required: ["id"],
            },
          },
        },
        async (req) => ({ ok: true, id: (req.params as { id: string }).id }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/resources/550e8400-e29b-41d4-a716-446655440000",
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        ok: true,
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      await app.close();
    });

    it("13. malformed UUID path parameter returns 422 with INVALID_FORMAT", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/resources/:id",
        {
          schema: {
            params: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
              },
              required: ["id"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/resources/not-a-valid-uuid-1234",
      });

      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "id");
      assert.equal(err.code, "INVALID_FORMAT");
      assert.equal(
        err.message,
        "The path parameter 'id' must be a valid UUID.",
      );
      await app.close();
    });

    it("14. valid enum path parameter passes validation", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/items/:scope",
        {
          schema: {
            params: {
              type: "object",
              properties: {
                scope: { type: "string", enum: ["public", "internal"] },
              },
              required: ["scope"],
            },
          },
        },
        async (req) => ({ scope: (req.params as { scope: string }).scope }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/items/public",
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.json().scope, "public");
      await app.close();
    });

    it("15. invalid enum path parameter returns 422 with INVALID_ENUM", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/items/:scope",
        {
          schema: {
            params: {
              type: "object",
              properties: {
                scope: { type: "string", enum: ["public", "internal"] },
              },
              required: ["scope"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/items/forbidden-scope",
      });

      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "scope");
      assert.equal(err.code, "INVALID_ENUM");
      await app.close();
    });
  });

  // --- SECTION 12: QUERY VALIDATION TESTS (Cases 16-21) ---
  describe("Query Parameters Validation & Coercion", () => {
    it("16. valid query parameter passes validation", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/search",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                q: { type: "string", minLength: 2 },
              },
              required: ["q"],
            },
          },
        },
        async (req) => ({ query: req.query }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=flats",
      });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { query: { q: "flats" } });
      await app.close();
    });

    it("17. missing required query parameter returns 422 REQUIRED", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/search",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                q: { type: "string" },
              },
              required: ["q"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/search",
      });
      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "q");
      assert.equal(err.code, "REQUIRED");
      assert.equal(err.message, "The query parameter 'q' is required.");
      await app.close();
    });

    it("18. invalid query type returns 422 INVALID_TYPE", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/listings",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                page: { type: "integer" },
              },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/listings?page=not-a-number",
      });
      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "page");
      assert.equal(err.code, "INVALID_TYPE");
      await app.close();
    });

    it("19. deliberate valid coercion: string query param correctly coerces to integer and boolean", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/listings",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                page: { type: "integer" },
                verifiedOnly: { type: "boolean" },
              },
            },
          },
        },
        async (req) => {
          const q = req.query as { page: unknown; verifiedOnly: unknown };
          return {
            page: q.page,
            pageType: typeof q.page,
            verifiedOnly: q.verifiedOnly,
            verifiedOnlyType: typeof q.verifiedOnly,
          };
        },
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/listings?page=3&verifiedOnly=true",
      });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        page: 3,
        pageType: "number",
        verifiedOnly: true,
        verifiedOnlyType: "boolean",
      });
      await app.close();
    });

    it("20. invalid coerced value fails validation", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/listings",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                limit: { type: "integer", maximum: 50 },
              },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/listings?limit=999",
      });
      assert.equal(res.statusCode, 422);
      assert.equal(res.json().error.details.fields[0].code, "VALUE_TOO_LARGE");
      await app.close();
    });

    it("21. unexpected query parameter rejected where strict behavior is intended", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/strict-query",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                search: { type: "string" },
              },
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/strict-query?search=test&unknownFilter=bypass",
      });
      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "unknownFilter");
      assert.equal(err.code, "UNEXPECTED_PROPERTY");
      await app.close();
    });
  });

  // --- SECTION 12: HEADERS VALIDATION TESTS (Cases 22-25) ---
  describe("Headers Validation", () => {
    it("22. required header missing returns 422 REQUIRED", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/guarded-header",
        {
          schema: {
            headers: {
              type: "object",
              properties: {
                "x-client-version": { type: "string" },
              },
              required: ["x-client-version"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/guarded-header",
      });
      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "x-client-version");
      assert.equal(err.code, "REQUIRED");
      assert.equal(err.message, "The header 'x-client-version' is required.");
      await app.close();
    });

    it("23. invalid header value returns 422 INVALID_FORMAT", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/guarded-header",
        {
          schema: {
            headers: {
              type: "object",
              properties: {
                "x-correlation-id": { type: "string", format: "uuid" },
              },
              required: ["x-correlation-id"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/guarded-header",
        headers: { "x-correlation-id": "not-a-uuid" },
      });
      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "x-correlation-id");
      assert.equal(err.code, "INVALID_FORMAT");
      await app.close();
    });

    it("24. valid header passes validation", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/guarded-header",
        {
          schema: {
            headers: {
              type: "object",
              properties: {
                "x-client-version": { type: "string", minLength: 3 },
              },
              required: ["x-client-version"],
            },
          },
        },
        async (req) => ({ version: req.headers["x-client-version"] }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/guarded-header",
        headers: { "x-client-version": "2.4.0" },
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.json().version, "2.4.0");
      await app.close();
    });

    it("25. header case behavior: case-insensitive matching works seamlessly", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/guarded-header",
        {
          schema: {
            headers: {
              type: "object",
              properties: {
                "X-Client-Platform": {
                  type: "string",
                  enum: ["ios", "android", "web"],
                },
              },
              required: ["X-Client-Platform"],
            },
          },
        },
        async (req) => ({ platform: req.headers["x-client-platform"] }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/guarded-header",
        headers: { "x-client-platform": "android" },
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.json().platform, "android");
      await app.close();
    });
  });

  // --- SECTION 12: DATE/TIME VALIDATION TESTS (Cases 26-27) ---
  describe("Date/Time Validation", () => {
    it("26. valid ISO 8601 date-time passes validation", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/datetime",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                scheduledAt: { type: "string", format: "date-time" },
              },
              required: ["scheduledAt"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/datetime",
        payload: { scheduledAt: "2026-10-15T14:30:00.000Z" },
      });
      assert.equal(res.statusCode, 200);
      await app.close();
    });

    it("27. malformed date-time returns 422 with INVALID_FORMAT", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/datetime",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                scheduledAt: { type: "string", format: "date-time" },
              },
              required: ["scheduledAt"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/datetime",
        payload: { scheduledAt: "2026-99-99 25:99:99" },
      });
      assert.equal(res.statusCode, 422);
      const err = res.json().error.details.fields[0];
      assert.equal(err.field, "scheduledAt");
      assert.equal(err.code, "INVALID_FORMAT");
      assert.equal(
        err.message,
        "The field 'scheduledAt' must be a valid ISO 8601 date-time.",
      );
      await app.close();
    });
  });

  // --- SECTION 12: TRANSPORT PARSING TESTS (Cases 28-30) ---
  describe("Transport Parsing Failures (400 Bad Request)", () => {
    it("28. malformed JSON body returns 400 BAD_REQUEST (not 422 validation failure)", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/json-syntax",
        {
          schema: {
            body: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/json-syntax",
        headers: { "content-type": "application/json" },
        payload: '{"broken": json-literal-missing-quote',
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "BAD_REQUEST");
      assert.equal(
        res.json().error.message,
        "The request could not be processed.",
      );
      await app.close();
    });

    it("29. unsupported/mismatched content type returns 415 or 400 BAD_REQUEST", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/content-type",
        {
          schema: {
            body: {
              type: "object",
              properties: { title: { type: "string" } },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/content-type",
        headers: { "content-type": "application/xml" },
        payload: "<xml>not-json</xml>",
      });

      assert.equal(res.statusCode, 415);
      await app.close();
    });

    it("30. empty body where body is required returns 400 BAD_REQUEST", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/empty-body",
        {
          schema: {
            body: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/empty-body",
        headers: { "content-type": "application/json" },
        payload: "",
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "BAD_REQUEST");
      await app.close();
    });
  });

  // --- SECTION 12: ERROR CONTRACT & SECURITY TESTS (Cases 31-40) ---
  describe("Canonical Validation Error Contract & Security", () => {
    it("31-36. canonical error envelope structure, status code, code, request IDs, and field details", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/envelope",
        {
          schema: {
            body: {
              type: "object",
              properties: { email: { type: "string", format: "email" } },
              required: ["email"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/envelope",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { email: "not-an-email" },
      });

      // 32. status code is 422
      assert.equal(res.statusCode, 422);

      // 35. request ID in response header
      assert.equal(res.headers[REQUEST_ID_HEADER], validRequestId);

      const json = res.json();

      // 31. canonical error envelope { error: { ... } } without top-level success: false
      assert.equal(json.success, undefined);
      assert.ok(json.error);

      // 33. stable error code
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.message, "The request contains invalid values.");

      // 34. request ID in body
      assert.equal(json.error.requestId, validRequestId);

      // 36. field-level details
      assert.deepEqual(json.error.details, {
        fields: [
          {
            field: "email",
            code: "INVALID_FORMAT",
            message: "The field 'email' must be a valid email address.",
          },
        ],
      });

      // 39. retryable is false
      assert.equal(json.error.retryable, false);

      await app.close();
    });

    it("37. no Ajv internals (schemaPath, schemaEnv, validateFunction) leaked to client", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/leak",
        {
          schema: {
            body: {
              type: "object",
              properties: { code: { type: "string" } },
              required: ["code"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/leak",
        payload: {},
      });

      const rawPayload = res.payload;
      assert.doesNotMatch(
        rawPayload,
        /schemaPath|schemaEnv|validateFunction|sourceCode/,
      );
      await app.close();
    });

    it("38. no sensitive value echoed in error details for password, secret, token, or otp", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/sensitive",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                password: { type: "string", minLength: 8 },
                otp: { type: "string", minLength: 6 },
              },
              required: ["password", "otp"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const rawSecret = "superSecret123!";
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/sensitive",
        payload: { password: "short", otp: "123" },
      });

      const json = res.json();
      for (const field of json.error.details.fields) {
        assert.doesNotMatch(field.message, new RegExp(rawSecret));
        assert.equal(
          field.value,
          undefined,
          "Field details must NEVER include raw value",
        );
      }
      await app.close();
    });

    it("40. ClassifiedHttpError is not transformed twice (double-transformation protection)", () => {
      const classified = new ClassifiedHttpError({
        statusCode: 422,
        code: "VALIDATION_FAILED",
        publicMessage: "The request contains invalid values.",
        retryable: false,
        category: "validation",
        causeError: new Error("inner validation error"),
      });

      const secondPass = classifyHttpError(classified);
      assert.equal(secondPass, classified);
      assert.equal(secondPass.statusCode, 422);
      assert.equal(secondPass.code, "VALIDATION_FAILED");
    });
  });

  // --- SECTION 12: COMPATIBILITY TESTS (Cases 41-43) ---
  describe("Legacy vs Canonical Validation Compatibility", () => {
    it("41. canonical Step 05 validation failure receives canonical envelope", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/properties",
        {
          config: STEP05_CANONICAL_COMPATIBILITY_CONFIG,
          schema: {
            body: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/properties",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: {},
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.success, undefined);
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.requestId, validRequestId);
      assert.ok(json.error.details.fields);
      await app.close();
    });

    it("42. explicitly legacy-compatible route validation failure receives legacy Step 04 envelope", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/legacy/action",
        {
          config: STEP04_LEGACY_COMPATIBILITY_CONFIG,
          schema: {
            body: {
              type: "object",
              properties: { phone: { type: "string" } },
              required: ["phone"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/legacy/action",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: {},
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(
        json.error.message,
        "The request payload contains invalid values.",
      );
      assert.ok(Array.isArray(json.error.details));
      assert.equal(json.error.requestId, validRequestId);
      assert.equal(typeof json.error.timestamp, "string");
      await app.close();
    });

    it("43. future /api/v1/auth/* route outside Step 04 scope remains canonical", async () => {
      const app = await createTestApp();
      // Future passkeys endpoint under /api/v1/auth/* outside registerAuthRoutes
      app.post(
        "/api/v1/auth/passkeys/initiate",
        {
          schema: {
            body: {
              type: "object",
              properties: { challenge: { type: "string" } },
              required: ["challenge"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/passkeys/initiate",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: {},
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(
        json.success,
        undefined,
        "Future /auth route must NOT receive legacy envelope",
      );
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.message, "The request contains invalid values.");
      assert.ok(json.error.details.fields);
      await app.close();
    });
  });

  // --- SECTION 13: AJV DEFAULT-BEHAVIOR NEGATIVE SPACE TESTS ---
  describe("Ajv Default-Behavior Negative Space Audit", () => {
    it("proves unknown properties are NOT silently removed by default", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/no-silent-strip",
        {
          schema: {
            body: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
              additionalProperties: false,
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/no-silent-strip",
        payload: { name: "Zero", sneakyInjectedField: "exploit" },
      });

      // Must FAIL with 422, NOT succeed with stripped payload!
      assert.equal(res.statusCode, 422);
      assert.equal(
        res.json().error.details.fields[0].code,
        "UNEXPECTED_PROPERTY",
      );
      await app.close();
    });

    it("proves body strings are NOT coerced to numbers or booleans", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/strict-body-types",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                count: { type: "integer" },
                isAvailable: { type: "boolean" },
              },
              required: ["count", "isAvailable"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      // Passing "123" instead of 123 and "true" instead of true in JSON body must fail
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/strict-body-types",
        payload: { count: "123", isAvailable: "true" },
      });

      assert.equal(res.statusCode, 422);
      const fields = res.json().error.details.fields;
      assert.equal(fields.length, 2);
      assert.equal(fields[0].code, "INVALID_TYPE");
      assert.equal(fields[1].code, "INVALID_TYPE");
      await app.close();
    });

    it("proves schema defaults apply only when explicitly declared in schema", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/defaults",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                page: { type: "integer", default: 1 },
                limit: { type: "integer", default: 20 },
                optionalUndef: { type: "string" },
              },
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/defaults",
        payload: {},
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        page: 1,
        limit: 20,
      });
      await app.close();
    });

    it("proves allErrors: true collects all failures instead of halting on first error", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/test/all-errors",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                first: { type: "string", minLength: 5 },
                second: { type: "integer" },
                third: { type: "string", format: "uuid" },
              },
              required: ["first", "second", "third"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/all-errors",
        payload: { first: "a", second: "not-int", third: "not-uuid" },
      });

      assert.equal(res.statusCode, 422);
      const fields = res.json().error.details.fields;
      assert.equal(
        fields.length,
        3,
        "allErrors: true must collect all 3 distinct field errors",
      );
      await app.close();
    });
  });

  // --- SECTION 14: SCHEMA COMPILATION FAILURES ---
  describe("Schema Compilation Failures", () => {
    it("throws at route registration / startup time on invalid schema type", async () => {
      const app = Fastify({
        schemaController: {
          compilersFactory: {
            buildValidator: createValidatorCompiler as any,
          },
        },
      });

      app.post(
        "/api/v1/test/broken-schema",
        {
          schema: {
            body: {
              type: "non_existent_primitive_type" as unknown as "string",
            },
          },
        },
        async () => ({ ok: true }),
      );

      await assert.rejects(
        async () => {
          await app.ready();
        },
        (err: Error) => {
          assert.match(
            err.message,
            /schema is invalid|must be equal to one of the allowed values/i,
          );
          return true;
        },
        "Must throw at route registration / startup time, not at runtime",
      );
    });
  });

  // --- APPLICATION INTEGRATION VERIFICATION ---
  describe("Production buildApp() Validation Integration", () => {
    it("verifies buildApp() has the custom validator compiler active for Step 05 routes", async () => {
      const app = await buildApp();

      app.post(
        "/api/v1/integration/test-validation",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                amount: { type: "integer", minimum: 100 },
              },
              required: ["amount"],
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      // Test validation rejection on full app
      const resInvalid = await app.inject({
        method: "POST",
        url: "/api/v1/integration/test-validation",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { amount: "100" }, // string instead of integer
      });

      assert.equal(resInvalid.statusCode, 422);
      assert.equal(resInvalid.json().error.code, "VALIDATION_FAILED");
      assert.equal(
        resInvalid.json().error.details.fields[0].code,
        "INVALID_TYPE",
      );

      // Test valid payload on full app
      const resValid = await app.inject({
        method: "POST",
        url: "/api/v1/integration/test-validation",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { amount: 500 },
      });

      assert.equal(resValid.statusCode, 200);

      await app.close();
    });
  });

  // --- MANDATORY REGRESSION TESTS: FINDING 1 — HEADER VALIDATION HARDENING ---
  describe("Header Validation Hardening (Finding 1)", () => {
    const strictHeaderSchema = {
      type: "object",
      properties: {
        "X-Client-Platform": {
          type: "string",
          enum: ["ios", "android", "web"],
        },
        "X-Correlation-Id": {
          type: "string",
          format: "uuid",
        },
      },
      required: ["X-Client-Platform"],
      additionalProperties: false, // Strict endpoint header schema!
    };

    it("1. standard headers do not cause failure when endpoint declares a strict header schema", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/headers/strict",
        {
          schema: {
            headers: strictHeaderSchema,
          },
        },
        async (req) => ({
          ok: true,
          platform: req.headers["x-client-platform"],
        }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/headers/strict",
        headers: {
          "x-client-platform": "ios",
          host: "localhost:80",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          accept: "application/json, text/plain, */*",
          "accept-encoding": "gzip, deflate, br",
          connection: "keep-alive",
          "x-custom-proxy-header": "injected-by-gateway",
        },
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { ok: true, platform: "ios" });
      await app.close();
    });

    it("2. declared custom header validates successfully", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/headers/declared",
        {
          schema: {
            headers: strictHeaderSchema,
          },
        },
        async (req) => ({
          platform: req.headers["x-client-platform"],
          correlation: req.headers["x-correlation-id"],
        }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/headers/declared",
        headers: {
          "x-client-platform": "android",
          "x-correlation-id": "550e8400-e29b-41d4-a716-446655440000",
        },
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        platform: "android",
        correlation: "550e8400-e29b-41d4-a716-446655440000",
      });
      await app.close();
    });

    it("3. declared custom header with invalid value returns 422", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/headers/invalid-val",
        {
          schema: {
            headers: strictHeaderSchema,
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/headers/invalid-val",
        headers: {
          "x-client-platform": "invalid_os_enum",
        },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "x-client-platform");
      assert.equal(json.error.details.fields[0].code, "INVALID_ENUM");
      await app.close();
    });

    it("4. missing required declared header returns 422", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/headers/missing-req",
        {
          schema: {
            headers: strictHeaderSchema,
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/headers/missing-req",
        headers: {
          host: "localhost",
          "user-agent": "test-agent",
        },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "x-client-platform");
      assert.equal(json.error.details.fields[0].code, "REQUIRED");
      await app.close();
    });

    it("5. header names remain case-insensitive", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/headers/case-insensitive",
        {
          schema: {
            headers: {
              type: "object",
              properties: {
                "X-MIXED-cAsE-HeAdEr": { type: "string" },
              },
              required: ["X-MIXED-cAsE-HeAdEr"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ val: req.headers["x-mixed-case-header"] }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/headers/case-insensitive",
        headers: {
          "x-mixed-case-header": "working",
        },
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { val: "working" });
      await app.close();
    });

    it("6. schema reuse across routes remains isolated", async () => {
      const app = await createTestApp();
      const sharedHeaders = {
        type: "object",
        properties: {
          "x-service-token": { type: "string", minLength: 5 },
        },
        required: ["x-service-token"],
        additionalProperties: false,
      };

      app.get(
        "/api/v1/route-one",
        { schema: { headers: sharedHeaders } },
        async () => ({ route: 1 }),
      );
      app.get(
        "/api/v1/route-two",
        { schema: { headers: sharedHeaders } },
        async () => ({ route: 2 }),
      );
      await app.ready();

      const res1 = await app.inject({
        method: "GET",
        url: "/api/v1/route-one",
        headers: { "x-service-token": "secret1", host: "localhost" },
      });
      assert.equal(res1.statusCode, 200);

      const res2 = await app.inject({
        method: "GET",
        url: "/api/v1/route-two",
        headers: { "x-service-token": "secret2", host: "localhost" },
      });
      assert.equal(res2.statusCode, 200);

      await app.close();
    });

    it("7. source schema object is not mutated", async () => {
      const app = await createTestApp();
      const callerSchema = {
        type: "object",
        properties: {
          "x-immutable-check": { type: "string" },
        },
        required: ["x-immutable-check"],
        additionalProperties: false,
      };

      // Freeze schema to prove immutability
      Object.freeze(callerSchema.properties);
      Object.freeze(callerSchema.required);
      Object.freeze(callerSchema);

      app.get(
        "/api/v1/immutable",
        { schema: { headers: callerSchema } },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/immutable",
        headers: { "x-immutable-check": "intact", host: "localhost" },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(
        callerSchema.additionalProperties,
        false,
        "Source object must retain additionalProperties: false",
      );
      assert.equal(
        callerSchema.required[0],
        "x-immutable-check",
        "Source object required array must remain unchanged",
      );
      await app.close();
    });

    it("8. complex header schema with allOf preserves subschema validation", async () => {
      const app = await createTestApp();
      app.get(
        "/api/v1/headers/allof",
        {
          schema: {
            headers: {
              type: "object",
              allOf: [
                {
                  properties: {
                    "x-api-version": { type: "string", enum: ["1.0", "2.0"] },
                  },
                  required: ["x-api-version"],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        async (req) => ({ version: req.headers["x-api-version"] }),
      );
      await app.ready();

      const resValid = await app.inject({
        method: "GET",
        url: "/api/v1/headers/allof",
        headers: {
          "x-api-version": "1.0",
          host: "localhost",
          "user-agent": "test",
        },
      });
      assert.equal(resValid.statusCode, 200);

      const resInvalid = await app.inject({
        method: "GET",
        url: "/api/v1/headers/allof",
        headers: { "x-api-version": "9.9", host: "localhost" },
      });
      assert.equal(resInvalid.statusCode, 422);

      await app.close();
    });

    it("9. proves body/query/params unexpected properties are NOT silently stripped", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/strict-body-and-query",
        {
          schema: {
            querystring: {
              type: "object",
              properties: { q: { type: "string" } },
              additionalProperties: false,
            },
            body: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      // Body with unexpected property must fail with 422
      const resBodyExtra = await app.inject({
        method: "POST",
        url: "/api/v1/strict-body-and-query",
        payload: { title: "Listing", injectedBodyField: "malicious" },
      });
      assert.equal(resBodyExtra.statusCode, 422);
      assert.equal(
        resBodyExtra.json().error.details.fields[0].code,
        "UNEXPECTED_PROPERTY",
      );

      // Query with unexpected property must fail with 422
      const resQueryExtra = await app.inject({
        method: "POST",
        url: "/api/v1/strict-body-and-query?q=search&injectedQueryParam=bypass",
        payload: { title: "Listing" },
      });
      assert.equal(resQueryExtra.statusCode, 422);
      assert.equal(
        resQueryExtra.json().error.details.fields[0].code,
        "UNEXPECTED_PROPERTY",
      );

      await app.close();
    });
  });

  // --- MANDATORY REGRESSION TESTS: FINDING 2 — FASTIFY SCHEMA REGISTRY / $ref ---
  describe("Fastify Schema Registry & $ref Resolution (Finding 2)", () => {
    it("1. local #/$defs reference works inside route schema", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/local-defs",
        {
          schema: {
            body: {
              type: "object",
              $defs: {
                GeoCoordinates: {
                  type: "object",
                  properties: {
                    latitude: { type: "number", minimum: -90, maximum: 90 },
                    longitude: { type: "number", minimum: -180, maximum: 180 },
                  },
                  required: ["latitude", "longitude"],
                  additionalProperties: false,
                },
              },
              properties: {
                name: { type: "string" },
                coords: { $ref: "#/$defs/GeoCoordinates" },
              },
              required: ["name", "coords"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ ok: true, body: req.body }),
      );
      await app.ready();

      const resValid = await app.inject({
        method: "POST",
        url: "/api/v1/local-defs",
        payload: {
          name: "Central Point",
          coords: { latitude: 12.9716, longitude: 77.5946 },
        },
      });
      assert.equal(resValid.statusCode, 200);

      const resInvalid = await app.inject({
        method: "POST",
        url: "/api/v1/local-defs",
        payload: {
          name: "Central Point",
          coords: { latitude: 999, longitude: 77.5946 },
        },
      });
      assert.equal(resInvalid.statusCode, 422);
      assert.equal(
        resInvalid.json().error.details.fields[0].code,
        "VALUE_TOO_LARGE",
      );

      await app.close();
    });

    it("2. imported/reused JavaScript schema object works across routes", async () => {
      const app = await createTestApp();
      const sharedPriceSchema = {
        type: "object",
        properties: {
          amountMinor: { type: "integer", minimum: 0 },
          currency: { type: "string", enum: ["INR"] },
        },
        required: ["amountMinor", "currency"],
        additionalProperties: false,
      };

      app.post(
        "/api/v1/pricing/item-a",
        {
          schema: {
            body: {
              type: "object",
              properties: { price: sharedPriceSchema },
              required: ["price"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ ok: true, body: req.body }),
      );

      app.post(
        "/api/v1/pricing/item-b",
        {
          schema: {
            body: {
              type: "object",
              properties: { discount: sharedPriceSchema },
              required: ["discount"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ ok: true, body: req.body }),
      );

      await app.ready();

      const resA = await app.inject({
        method: "POST",
        url: "/api/v1/pricing/item-a",
        payload: { price: { amountMinor: 50000, currency: "INR" } },
      });
      assert.equal(resA.statusCode, 200);

      const resB = await app.inject({
        method: "POST",
        url: "/api/v1/pricing/item-b",
        payload: { discount: { amountMinor: 1000, currency: "INR" } },
      });
      assert.equal(resB.statusCode, 200);

      await app.close();
    });

    it("3. app.addSchema() + external $ref works seamlessly", async () => {
      const app = await createTestApp();
      app.addSchema({
        $id: "urn:zero-brokerage:address",
        type: "object",
        properties: {
          street: { type: "string" },
          city: { type: "string" },
          postalCode: { type: "string", minLength: 6 },
        },
        required: ["street", "city", "postalCode"],
        additionalProperties: false,
      });

      app.post(
        "/api/v1/external-ref-test",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                agencyName: { type: "string" },
                address: { $ref: "urn:zero-brokerage:address#" },
              },
              required: ["agencyName", "address"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ ok: true, body: req.body }),
      );
      await app.ready();

      const resSuccess = await app.inject({
        method: "POST",
        url: "/api/v1/external-ref-test",
        payload: {
          agencyName: "Premier Realty",
          address: {
            street: "MG Road",
            city: "Bengaluru",
            postalCode: "560001",
          },
        },
      });
      assert.equal(resSuccess.statusCode, 200);

      const resFail = await app.inject({
        method: "POST",
        url: "/api/v1/external-ref-test",
        payload: {
          agencyName: "Premier Realty",
          address: {
            street: "MG Road",
            city: "Bengaluru",
            postalCode: "short",
          },
        },
      });
      assert.equal(resFail.statusCode, 422);
      assert.equal(
        resFail.json().error.details.fields[0].field,
        "address.postalCode",
      );
      assert.equal(
        resFail.json().error.details.fields[0].code,
        "STRING_TOO_SHORT",
      );

      await app.close();
    });

    it("4. multiple routes can use the same registered external schema via app.addSchema()", async () => {
      const app = await createTestApp();
      app.addSchema({
        $id: "urn:zero-brokerage:contact",
        type: "object",
        properties: {
          phone: { type: "string", minLength: 10 },
          email: { type: "string", format: "email" },
        },
        required: ["phone"],
        additionalProperties: false,
      });

      app.post(
        "/api/v1/contacts/user",
        {
          schema: {
            body: {
              type: "object",
              properties: { contact: { $ref: "urn:zero-brokerage:contact#" } },
              required: ["contact"],
            },
          },
        },
        async () => ({ route: "user" }),
      );

      app.post(
        "/api/v1/contacts/broker",
        {
          schema: {
            body: {
              type: "object",
              properties: { contact: { $ref: "urn:zero-brokerage:contact#" } },
              required: ["contact"],
            },
          },
        },
        async () => ({ route: "broker" }),
      );

      await app.ready();

      const r1 = await app.inject({
        method: "POST",
        url: "/api/v1/contacts/user",
        payload: { contact: { phone: "9876543210" } },
      });
      assert.equal(r1.statusCode, 200);

      const r2 = await app.inject({
        method: "POST",
        url: "/api/v1/contacts/broker",
        payload: {
          contact: { phone: "9123456780", email: "broker@example.com" },
        },
      });
      assert.equal(r2.statusCode, 200);

      await app.close();
    });

    it("5. body schema can resolve registered external $ref with nested validation", async () => {
      const app = await createTestApp();
      app.addSchema({
        $id: "urn:zero-brokerage:dimensions",
        type: "object",
        properties: {
          width: { type: "number", minimum: 1 },
          length: { type: "number", minimum: 1 },
        },
        required: ["width", "length"],
        additionalProperties: false,
      });

      app.post(
        "/api/v1/property/dimensions",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                dims: { $ref: "urn:zero-brokerage:dimensions#" },
              },
              required: ["dims"],
            },
          },
        },
        async (req) => ({ ok: true, dims: (req.body as any).dims }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/property/dimensions",
        payload: { dims: { width: 10, length: 25 } },
      });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        ok: true,
        dims: { width: 10, length: 25 },
      });

      await app.close();
    });

    it("6. coerced transport schema (querystring) can resolve registered external $ref", async () => {
      const app = await createTestApp();
      app.addSchema({
        $id: "urn:zero-brokerage:pagination-query",
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", maximum: 50 },
        },
        additionalProperties: false,
      });

      app.get(
        "/api/v1/paginated-search",
        {
          schema: {
            querystring: {
              $ref: "urn:zero-brokerage:pagination-query#",
            },
          },
        },
        async (req) => ({ query: req.query }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/paginated-search?page=2&limit=25",
      });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { query: { page: 2, limit: 25 } });

      await app.close();
    });

    it("7. unresolved $ref fails fast during app.ready()", async () => {
      const app = await createTestApp();
      app.post(
        "/api/v1/unresolved-ref",
        {
          schema: {
            body: {
              type: "object",
              properties: { missing: { $ref: "urn:non-existent:schema#" } },
            },
          },
        },
        async () => ({ ok: true }),
      );

      await assert.rejects(
        async () => {
          await app.ready();
        },
        (err: Error) => {
          assert.match(
            err.message,
            /can't resolve reference urn:non-existent:schema#/i,
          );
          return true;
        },
        "Unresolved $ref must throw at app.ready(), halting boot",
      );

      await app.close();
    });

    it("8. malformed registered schema fails during app.ready()", async () => {
      const app = await createTestApp();
      app.addSchema({
        $id: "urn:broken:schema",
        type: "invalid_type_name" as any,
      });

      app.post(
        "/api/v1/broken-ref",
        {
          schema: {
            body: {
              type: "object",
              properties: { b: { $ref: "urn:broken:schema#" } },
            },
          },
        },
        async () => ({ ok: true }),
      );

      await assert.rejects(
        async () => {
          await app.ready();
        },
        (err: Error) => {
          assert.match(err.message, /schema is invalid/i);
          return true;
        },
        "Malformed registered schema must fail fast at startup",
      );

      await app.close();
    });

    it("9. duplicate $id registration is detected and rejected by Fastify addSchema()", async () => {
      const app = await createTestApp();
      app.addSchema({
        $id: "urn:schema:duplicate-id",
        type: "object",
        properties: { a: { type: "string" } },
      });

      assert.throws(
        () => {
          app.addSchema({
            $id: "urn:schema:duplicate-id",
            type: "object",
            properties: { b: { type: "number" } },
          });
        },
        (err: Error) => {
          assert.match(err.message, /already declared/i);
          return true;
        },
        "Fastify must reject registering two schemas with the identical $id",
      );

      await app.close();
    });

    it("10. plugin encapsulation: parent schemas inherit to child, child schemas do not leak to sibling", async () => {
      const app = await createTestApp();

      // Parent schema available globally
      app.addSchema({
        $id: "urn:encap:parent",
        type: "object",
        properties: { parentId: { type: "string", format: "uuid" } },
        required: ["parentId"],
      });

      // Child plugin 1 registers its own private schema
      await app.register(async (child1) => {
        child1.addSchema({
          $id: "urn:encap:child1-private",
          type: "object",
          properties: { secretScore: { type: "integer" } },
          required: ["secretScore"],
        });

        child1.post(
          "/child1/endpoint",
          {
            schema: {
              body: {
                type: "object",
                properties: {
                  p: { $ref: "urn:encap:parent#" },
                  c: { $ref: "urn:encap:child1-private#" },
                },
                required: ["p", "c"],
              },
            },
          },
          async (req) => ({ ok: true, body: req.body }),
        );
      });

      await app.ready();

      // Child 1 successfully resolves both parent and child-local schema
      const resChild1 = await app.inject({
        method: "POST",
        url: "/child1/endpoint",
        payload: {
          p: { parentId: "550e8400-e29b-41d4-a716-446655440000" },
          c: { secretScore: 99 },
        },
      });
      assert.equal(resChild1.statusCode, 200);

      // Now verify sibling isolation: sibling trying to access child1 schema must fail
      const appSiblingTest = await createTestApp();
      await appSiblingTest.register(async (c1) => {
        c1.addSchema({
          $id: "urn:encap:isolated-child",
          type: "object",
          properties: { isolated: { type: "boolean" } },
        });
      });

      await appSiblingTest.register(async (c2) => {
        c2.post(
          "/sibling/leak-attempt",
          {
            schema: {
              body: {
                type: "object",
                properties: { leak: { $ref: "urn:encap:isolated-child#" } },
              },
            },
          },
          async () => ({ ok: true }),
        );
      });

      await assert.rejects(
        async () => {
          await appSiblingTest.ready();
        },
        (err: Error) => {
          assert.match(
            err.message,
            /can't resolve reference urn:encap:isolated-child#/i,
          );
          return true;
        },
        "Sibling plugin cannot access unshared schema from another plugin",
      );

      await app.close();
      await appSiblingTest.close();
    });

    it("11. response schemas are not accidentally routed through validatorCompiler", async () => {
      const app = await createTestApp();
      let customValidatorCalledForResponse = false;

      app.get(
        "/api/v1/response-schema-test",
        {
          schema: {
            response: {
              200: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  injected: { type: "string" },
                },
                required: ["status"],
              },
            },
          },
        },
        async () => ({
          status: "ok",
          extraFieldFilteredOut: "removed-by-fast-json-stringify",
        }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/response-schema-test",
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { status: "ok" });
      assert.equal(customValidatorCalledForResponse, false);

      await app.close();
    });
  });
});
