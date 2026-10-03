import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { buildApp } from "../../app/build-app.js";
import {
  API_VERSION_PREFIX,
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  STEP04_LEGACY_COMPATIBILITY_CONFIG,
  STEP05_CANONICAL_COMPATIBILITY_CONFIG,
  createCanonicalCollectionResponse,
  createCanonicalErrorResponse,
  createCanonicalSuccessResponse,
  createRequestId,
  createValidatorCompiler,
} from "./contracts.js";
import {
  ClassifiedHttpError,
  classifyHttpError,
  formatCanonicalHttpError,
  formatLegacyStep04Error,
} from "./error-classification.js";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
} from "../errors/index.js";
import {
  CheckConstraintViolationError,
  DatabaseError,
  DeadlockDetectedError,
  ForeignKeyViolationError,
  NotNullConstraintViolationError,
  SerializationFailureError,
  UniqueConstraintViolationError,
} from "@zero-brokerage/database";
import errorHandlerPlugin from "../../plugins/error-handler.js";
import requestContextPlugin from "../../plugins/request-context.js";
import { registerAuthRoutes } from "../../modules/identity/routes/auth-routes.js";
import { createMockDbPool } from "../../modules/identity/tests/mock-db-pool.js";

describe("Step 05 Batch 02D — Adversarial & Security Testing", () => {
  const canonicalRequestId = "550e8400-e29b-41d4-a716-446655440000";

  // ===========================================================================
  // SUITE 1 — TRANSPORT PARSING
  // ===========================================================================
  describe("Suite 1: Transport Parsing & Framework Protocol Boundaries", () => {
    it("1.1 rejects malformed JSON with 400 BAD_REQUEST", async () => {
      const app = await buildApp();
      app.post("/api/v1/test/transport/json", async () => ({ ok: true }));
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/json",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: '{"broken": [1, 2, ',
      });

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.json(), {
        error: {
          code: "BAD_REQUEST",
          message: "The request could not be processed.",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      await app.close();
    });

    it("1.2 rejects trailing malformed JSON with 400 BAD_REQUEST", async () => {
      const app = await buildApp();
      app.post("/api/v1/test/transport/trailing-json", async () => ({
        ok: true,
      }));
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/trailing-json",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: '{"valid": true} trailing_garbage_content',
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "BAD_REQUEST");
      assert.equal(res.json().error.requestId, canonicalRequestId);
      await app.close();
    });

    it("1.3 rejects empty body when application/json header is declared with 400 BAD_REQUEST", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/transport/empty-body",
        {
          schema: {
            body: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/empty-body",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: "",
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "BAD_REQUEST");
      await app.close();
    });

    it("1.4 rejects primitive root where object is expected with 422 VALIDATION_FAILED", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/transport/primitive-root",
        {
          schema: {
            body: {
              type: "object",
              properties: { id: { type: "string" } },
              required: ["id"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/primitive-root",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: '"just-a-plain-string"',
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("1.5 rejects array root where object is expected with 422 VALIDATION_FAILED", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/transport/array-root",
        {
          schema: {
            body: {
              type: "object",
              properties: { id: { type: "string" } },
              required: ["id"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/array-root",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: '[{"id": "1"}, {"id": "2"}]',
      });

      assert.equal(res.statusCode, 422);
      assert.equal(res.json().error.code, "VALIDATION_FAILED");
      assert.equal(res.json().error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("1.6 rejects unsupported content-type with 415 UNSUPPORTED_MEDIA_TYPE", async () => {
      const app = await buildApp();
      app.post("/api/v1/test/transport/content-type", async () => ({
        ok: true,
      }));
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/content-type",
        headers: {
          "content-type": "application/xml",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: "<xml><name>Attack</name></xml>",
      });

      assert.equal(res.statusCode, 415);
      assert.deepEqual(res.json(), {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "The request payload media type is not supported.",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      await app.close();
    });

    it("1.7 rejects oversized payload exceeding route bodyLimit with 413 PAYLOAD_TOO_LARGE", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/transport/oversized",
        {
          bodyLimit: 128, // strict 128 byte limit
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const largePayload = JSON.stringify({
        data: "X".repeat(500),
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/transport/oversized",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: largePayload,
      });

      assert.equal(res.statusCode, 413);
      assert.deepEqual(res.json(), {
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "The request payload is too large.",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      await app.close();
    });

    it("1.8 handles malformed URI encoding in path with 400 BAD_REQUEST", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/transport/uri-test/:param", async () => ({
        ok: true,
      }));
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/transport/uri-test/%E0%A4%A", // malformed incomplete UTF-8 in path segment
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 400);
      const json = res.json();
      assert.equal(
        json.statusCode ?? json.error?.code,
        json.statusCode ? 400 : "BAD_REQUEST",
      );
      await app.close();
    });

    it("1.9 rejects invalid query value types with 422 VALIDATION_FAILED", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/transport/query-validation",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                page: { type: "integer", minimum: 1 },
              },
              required: ["page"],
            },
          },
        },
        async (req) => req.query,
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/transport/query-validation?page=not-a-number",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "page");
      assert.equal(json.error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("1.10 rejects invalid path parameter format with 422 VALIDATION_FAILED", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/transport/items/:itemId",
        {
          schema: {
            params: {
              type: "object",
              properties: {
                itemId: { type: "string", format: "uuid" },
              },
              required: ["itemId"],
            },
          },
        },
        async (req) => req.params,
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/transport/items/not-a-uuid-12345",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "itemId");
      assert.equal(json.error.details.fields[0].code, "INVALID_FORMAT");
      await app.close();
    });

    it("1.11 rejects repeated query parameters when schema expects scalar integer", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/transport/repeated-query",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                limit: { type: "integer" },
              },
              required: ["limit"],
            },
          },
        },
        async (req) => req.query,
      );
      await app.ready();

      // ?limit=10&limit=20 parses as array ['10', '20'] in Fastify
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/transport/repeated-query?limit=10&limit=20",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 422);
      assert.equal(res.json().error.code, "VALIDATION_FAILED");
      assert.equal(res.json().error.details.fields[0].field, "limit");
      assert.equal(res.json().error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("1.12 rejects unexpected query parameter when schema sets additionalProperties: false", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/transport/strict-query",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                search: { type: "string" },
              },
              required: ["search"],
              additionalProperties: false,
            },
          },
        },
        async (req) => req.query,
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/transport/strict-query?search=home&injectedFilter=bypass",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "injectedFilter");
      assert.equal(json.error.details.fields[0].code, "UNEXPECTED_PROPERTY");
      await app.close();
    });

    it("1.13 method mismatch returns canonical 404 contract as established in Fastify repository", async () => {
      const app = await buildApp();
      app.post("/api/v1/test/transport/post-only", async () => ({ ok: true }));
      await app.ready();

      const res = await app.inject({
        method: "GET", // Route only declared as POST
        url: "/api/v1/test/transport/post-only",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      // In Fastify, unmatched method routes fall through to setNotFoundHandler -> 404
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.json(), {
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 2 — BODY TYPE / MASS-ASSIGNMENT DEFENSE
  // ===========================================================================
  describe("Suite 2: Body Type Strictness & Mass-Assignment Defense", () => {
    it("2.1 strictly rejects numeric string '123' when integer is expected (coerceTypes: false)", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/body/no-coerce-num",
        {
          schema: {
            body: {
              type: "object",
              properties: { count: { type: "integer" } },
              required: ["count"],
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body/no-coerce-num",
        payload: { count: "123" },
      });

      assert.equal(res.statusCode, 422);
      assert.equal(res.json().error.code, "VALIDATION_FAILED");
      assert.equal(res.json().error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("2.2 strictly rejects boolean string 'true' when boolean is expected (coerceTypes: false)", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/body/no-coerce-bool",
        {
          schema: {
            body: {
              type: "object",
              properties: { isPublished: { type: "boolean" } },
              required: ["isPublished"],
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body/no-coerce-bool",
        payload: { isPublished: "true" },
      });

      assert.equal(res.statusCode, 422);
      assert.equal(res.json().error.code, "VALIDATION_FAILED");
      assert.equal(res.json().error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("2.3 rejects unexpected property when schema declares additionalProperties: false (no silent strip)", async () => {
      const app = await buildApp();
      let capturedBody: unknown = null;
      app.post(
        "/api/v1/test/body/mass-assignment",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                username: { type: "string" },
              },
              required: ["username"],
              additionalProperties: false,
            },
          },
        },
        async (req) => {
          capturedBody = req.body;
          return { ok: true };
        },
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body/mass-assignment",
        payload: {
          username: "alice",
          injectedAdminRole: "SUPER_ADMIN",
        },
      });

      assert.equal(res.statusCode, 422);
      assert.equal(
        capturedBody,
        null,
        "Handler must NEVER execute with unexpected properties",
      );
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "injectedAdminRole");
      assert.equal(json.error.details.fields[0].code, "UNEXPECTED_PROPERTY");
      await app.close();
    });

    it("2.4 rejects deeply nested unexpected property with normalized dot-notation path", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/body/nested-mass-assignment",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                address: {
                  type: "object",
                  properties: {
                    city: { type: "string" },
                  },
                  required: ["city"],
                  additionalProperties: false,
                },
              },
              required: ["address"],
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/body/nested-mass-assignment",
        payload: {
          address: {
            city: "Mumbai",
            internalRoutingScore: 999,
          },
        },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(
        json.error.details.fields[0].field,
        "address.internalRoutingScore",
      );
      assert.equal(json.error.details.fields[0].code, "UNEXPECTED_PROPERTY");
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 3 — PROTOTYPE / OBJECT MANIPULATION
  // ===========================================================================
  describe("Suite 3: Prototype Pollution & Object Manipulation Attacks", () => {
    it("3.1 rejects __proto__ property in body payload at transport boundary with 400 BAD_REQUEST", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/security/proto-body",
        {
          schema: {
            body: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/security/proto-body",
        payload: JSON.parse(
          '{"title": "Apartment", "__proto__": {"polluted": true}}',
        ),
      });

      // Fastify's default secure-json-parse blocks __proto__ at the parser boundary with 400
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "BAD_REQUEST");
      // Verify Object.prototype purity
      assert.equal((Object.prototype as any).polluted, undefined);
      assert.equal(({} as any).polluted, undefined);
      await app.close();
    });

    it("3.2 rejects constructor and prototype keys in body payload at transport boundary with 400 BAD_REQUEST", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/security/constructor-body",
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
        url: "/api/v1/test/security/constructor-body",
        payload: {
          name: "Vortex",
          constructor: { prototype: { admin: true } },
        },
      });

      // Fastify's default secure-json-parse blocks constructor keys at the parser boundary with 400
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "BAD_REQUEST");
      assert.equal((Object.prototype as any).admin, undefined);
      assert.equal(({} as any).admin, undefined);
      await app.close();
    });

    it("3.3 parses query string containing __proto__ safely without prototype pollution", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/security/proto-query",
        {
          schema: {
            querystring: {
              type: "object",
              properties: { filter: { type: "string" } },
              additionalProperties: false,
            },
          },
        },
        async (req) => req.query,
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/security/proto-query?__proto__[polluted]=true&filter=active",
      });

      assert.equal(res.statusCode, 422);
      assert.equal((Object.prototype as any).polluted, undefined);
      assert.equal(({} as any).polluted, undefined);
      await app.close();
    });

    it("3.4 safely handles headers containing prototype attack keys without polluting globals", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/security/proto-headers",
        {
          schema: {
            headers: {
              type: "object",
              properties: { "x-custom": { type: "string" } },
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/security/proto-headers",
        headers: {
          "x-custom": "ok",
          __proto__: "malicious",
          constructor: "malicious",
        },
      });

      assert.equal(res.statusCode, 200);
      assert.equal((Object.prototype as any).malicious, undefined);
      assert.equal(({} as any).malicious, undefined);
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 4 — AJV / JSON-SCHEMA SECURITY
  // ===========================================================================
  describe("Suite 4: Ajv JSON-Schema Combiners, References & Lifecycle Security", () => {
    it("4.1 validates combiner allOf strictly rejecting when any branch fails", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/schema/all-of",
        {
          schema: {
            body: {
              type: "object",
              allOf: [
                {
                  properties: { minScore: { type: "integer", minimum: 10 } },
                  required: ["minScore"],
                },
                {
                  properties: { maxScore: { type: "integer", maximum: 100 } },
                  required: ["maxScore"],
                },
              ],
              additionalProperties: false,
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/all-of",
        payload: { minScore: 5, maxScore: 50 }, // minScore too small
      });

      assert.equal(res.statusCode, 422);
      assert.equal(res.json().error.details.fields[0].code, "VALUE_TOO_SMALL");
      await app.close();
    });

    it("4.2 validates combiner anyOf correctly accepting valid match and rejecting when none match", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/schema/any-of",
        {
          schema: {
            body: {
              type: "object",
              anyOf: [
                {
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                },
                {
                  properties: { phone: { type: "string", minLength: 10 } },
                  required: ["phone"],
                },
              ],
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const validRes = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/any-of",
        payload: { email: "user@example.com" },
      });
      assert.equal(validRes.statusCode, 200);

      const invalidRes = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/any-of",
        payload: { email: "not-an-email" },
      });
      assert.equal(invalidRes.statusCode, 422);
      await app.close();
    });

    it("4.3 resolves local $defs reference correctly in request body", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/schema/local-defs",
        {
          schema: {
            body: {
              type: "object",
              $defs: {
                Money: {
                  type: "object",
                  properties: {
                    amount: { type: "integer", minimum: 0 },
                    currency: { type: "string", enum: ["INR"] },
                  },
                  required: ["amount", "currency"],
                  additionalProperties: false,
                },
              },
              properties: {
                price: { $ref: "#/$defs/Money" },
              },
              required: ["price"],
              additionalProperties: false,
            },
          },
        },
        async (req) => req.body,
      );
      await app.ready();

      const validRes = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/local-defs",
        payload: { price: { amount: 2500000, currency: "INR" } },
      });
      assert.equal(validRes.statusCode, 200);

      const invalidRes = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/local-defs",
        payload: { price: { amount: -50, currency: "INR" } },
      });
      assert.equal(invalidRes.statusCode, 422);
      assert.equal(
        invalidRes.json().error.details.fields[0].code,
        "VALUE_TOO_SMALL",
      );
      await app.close();
    });

    it("4.4 cross-route app.addSchema() external $ref resolves across distinct endpoints", async () => {
      const app = await buildApp();
      app.addSchema({
        $id: "urn:adversarial:lead-meta",
        type: "object",
        properties: {
          source: { type: "string", enum: ["web", "mobile", "referral"] },
        },
        required: ["source"],
        additionalProperties: false,
      });

      app.post(
        "/api/v1/test/schema/route-a",
        {
          schema: {
            body: {
              type: "object",
              properties: { meta: { $ref: "urn:adversarial:lead-meta#" } },
              required: ["meta"],
            },
          },
        },
        async (req) => req.body,
      );

      app.post(
        "/api/v1/test/schema/route-b",
        {
          schema: {
            body: {
              type: "object",
              properties: { meta: { $ref: "urn:adversarial:lead-meta#" } },
              required: ["meta"],
            },
          },
        },
        async (req) => req.body,
      );

      await app.ready();

      const resA = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/route-a",
        payload: { meta: { source: "mobile" } },
      });
      assert.equal(resA.statusCode, 200);

      const resB = await app.inject({
        method: "POST",
        url: "/api/v1/test/schema/route-b",
        payload: { meta: { source: "invalid_source" } },
      });
      assert.equal(resB.statusCode, 422);
      assert.equal(resB.json().error.details.fields[0].code, "INVALID_ENUM");

      await app.close();
    });

    it("4.5 unresolved external $ref halts boot and throws during app.ready()", async () => {
      const app = Fastify({
        schemaController: {
          compilersFactory: {
            buildValidator: createValidatorCompiler as any,
          },
        },
      });

      app.post(
        "/api/v1/test/schema/missing-ref",
        {
          schema: {
            body: {
              type: "object",
              properties: { item: { $ref: "urn:non-existent:schema#" } },
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
      );
      await app.close();
    });

    it("4.6 malformed schema syntax fails startup during app.ready()", async () => {
      const app = Fastify({
        schemaController: {
          compilersFactory: {
            buildValidator: createValidatorCompiler as any,
          },
        },
      });

      app.post(
        "/api/v1/test/schema/syntax-error",
        {
          schema: {
            body: {
              type: "not_a_valid_json_schema_type" as any,
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
      );
      await app.close();
    });

    it("4.7 duplicate $id registration throws error at registration time", async () => {
      const app = Fastify();
      app.addSchema({
        $id: "urn:duplicate:id",
        type: "object",
        properties: { a: { type: "string" } },
      });

      assert.throws(
        () => {
          app.addSchema({
            $id: "urn:duplicate:id",
            type: "object",
            properties: { b: { type: "number" } },
          });
        },
        (err: Error) => {
          assert.match(err.message, /already declared/i);
          return true;
        },
      );
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 5 — REQUEST-ID ATTACKS
  // ===========================================================================
  describe("Suite 5: Request Correlation & Request-ID Adversarial Defense", () => {
    it("5.1 generates valid UUIDv4 when inbound x-request-id is missing", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/req-id/missing", async (req) => ({ id: req.id }));
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/req-id/missing",
      });

      assert.equal(res.statusCode, 200);
      const headerId = res.headers[REQUEST_ID_HEADER];
      assert.ok(REQUEST_ID_PATTERN.test(String(headerId)));
      assert.equal(res.json().id, headerId);
      await app.close();
    });

    it("5.2 normalizes uppercase UUIDv4 to lowercase", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/req-id/uppercase", async (req) => ({ id: req.id }));
      await app.ready();

      const upperId = "550E8400-E29B-41D4-A716-446655440000";
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/req-id/uppercase",
        headers: { [REQUEST_ID_HEADER]: upperId },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers[REQUEST_ID_HEADER], upperId.toLowerCase());
      assert.equal(res.json().id, upperId.toLowerCase());
      await app.close();
    });

    it("5.3 discards malformed string and generates fresh UUIDv4 without reflecting input", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/req-id/malformed", async (req) => ({ id: req.id }));
      await app.ready();

      const malicious = "not-a-uuid-random-injection";
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/req-id/malformed",
        headers: { [REQUEST_ID_HEADER]: malicious },
      });

      assert.equal(res.statusCode, 200);
      const generated = res.headers[REQUEST_ID_HEADER];
      assert.ok(REQUEST_ID_PATTERN.test(String(generated)));
      assert.notEqual(generated, malicious);
      assert.equal(res.json().id, generated);
      await app.close();
    });

    it("5.4 discards CRLF injection attempt in x-request-id", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/req-id/crlf", async (req) => ({ id: req.id }));
      await app.ready();

      const crlfPayload =
        "550e8400-e29b-41d4-a716-446655440000\r\nInjected-Header: evil";
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/req-id/crlf",
        headers: { [REQUEST_ID_HEADER]: crlfPayload },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["injected-header"], undefined);
      assert.ok(
        REQUEST_ID_PATTERN.test(String(res.headers[REQUEST_ID_HEADER])),
      );
      assert.notEqual(res.headers[REQUEST_ID_HEADER], crlfPayload);
      await app.close();
    });

    it("5.5 discards XSS and SQL injection payloads in x-request-id", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/req-id/injection", async () => {
        throw new NotFoundError("Not found");
      });
      await app.ready();

      const injections = [
        "<script>alert('xss')</script>",
        "123e4567-e89b-12d3-a456-426614174000'; DROP TABLE users;--",
        "A".repeat(5000),
      ];

      for (const injection of injections) {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/test/req-id/injection",
          headers: { [REQUEST_ID_HEADER]: injection },
        });

        assert.equal(res.statusCode, 404);
        const headerId = res.headers[REQUEST_ID_HEADER];
        const bodyId = res.json().error.requestId;
        assert.ok(REQUEST_ID_PATTERN.test(String(headerId)));
        assert.equal(headerId, bodyId);
        assert.doesNotMatch(res.payload, /<script>|DROP TABLE|AAAA/);
      }
      await app.close();
    });

    it("5.6 handles duplicate x-request-id headers discarding array and minting single UUIDv4", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/req-id/duplicate", async (req) => ({ id: req.id }));
      await app.ready();

      // Node/Fastify parses duplicate headers as array or comma-separated string
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/req-id/duplicate",
        headers: {
          [REQUEST_ID_HEADER]: [
            canonicalRequestId,
            "660e8400-e29b-41d4-a716-446655440000",
          ] as any,
        },
      });

      assert.equal(res.statusCode, 200);
      const generated = res.headers[REQUEST_ID_HEADER];
      assert.ok(typeof generated === "string");
      assert.ok(REQUEST_ID_PATTERN.test(generated));
      assert.equal(res.json().id, generated);
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 6 — SENSITIVE DATA SHIELDING
  // ===========================================================================
  describe("Suite 6: Sensitive Credential & Database Shielding", () => {
    it("6.1 redacts password, OTP, tokens, API keys, and CVVs in validation errors without echoing values", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/shielding/sensitive-fields",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                password: { type: "string", minLength: 8 },
                otp: { type: "string", minLength: 6 },
                accessToken: { type: "string", minLength: 32 },
                apiKey: { type: "string", minLength: 16 },
                cvv: { type: "string", minLength: 3 },
              },
              required: ["password", "otp", "accessToken", "apiKey", "cvv"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const rawSecret = "superSecretPassword123!";
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/shielding/sensitive-fields",
        payload: {
          password: "short",
          otp: "123",
          accessToken: "tok",
          apiKey: "key",
          cvv: "1",
        },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      const fields = json.error.details.fields;
      assert.equal(fields.length, 5);

      for (const field of fields) {
        assert.equal(field.message, `The field '${field.field}' is invalid.`);
        assert.doesNotMatch(field.message, new RegExp(rawSecret));
        assert.equal((field as any).value, undefined);
      }
      await app.close();
    });

    it("6.2 canonical database error responses never expose table, column, or constraint names", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/shielding/db-error", async () => {
        throw new UniqueConstraintViolationError({
          sqlState: "23505",
          constraint: "uq_identities_private_phone_key",
          table: "core_identities_table",
          column: "user_phone_column",
        });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/shielding/db-error",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 409);
      assert.deepEqual(res.json(), {
        error: {
          code: "CONFLICT",
          message:
            "A record with this identifier or unique value already exists.",
          requestId: canonicalRequestId,
        },
      });
      assert.doesNotMatch(
        res.payload,
        /uq_identities_private_phone_key|core_identities_table|user_phone_column/,
      );
      await app.close();
    });

    it("6.3 native unexpected error completely masks database credentials and connection strings", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/shielding/leak-attempt", async () => {
        throw new Error(
          "Connection failed: postgresql://admin:p@ssword123@internal-db.cloud:5432/zero_prod",
        );
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/shielding/leak-attempt",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 500);
      assert.deepEqual(res.json(), {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An internal server error occurred.",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      assert.doesNotMatch(
        res.payload,
        /admin|p@ssword123|internal-db|postgresql/,
      );
      await app.close();
    });

    it("6.4 legacy Step 04 surface retains compatibility details without canonical contamination", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/test/shielding/legacy-db",
        { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
        async () => {
          throw new UniqueConstraintViolationError({
            sqlState: "23505",
            constraint: "uq_users_phone",
            table: "users",
            column: "phone",
          });
        },
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/shielding/legacy-db",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 409);
      const json = res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "CONFLICT");
      assert.ok(Array.isArray(json.error.details));
      // Pre-existing Step 04 legacy behavior preserves constraint field in legacyDetails
      assert.equal(json.error.details[0].field, "uq_users_phone");
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 7 — DATABASE ERROR BOUNDARY
  // ===========================================================================
  describe("Suite 7: Database Error Boundary & Persistence Exception Mapping", () => {
    const dbTestCases = [
      {
        name: "UniqueConstraintViolationError -> 409 CONFLICT (retryable: false)",
        error: new UniqueConstraintViolationError({
          sqlState: "23505",
          constraint: "uq_test",
          table: "t",
          column: "c",
        }),
        expectedStatus: 409,
        expectedCode: "CONFLICT",
        expectedMessage:
          "A record with this identifier or unique value already exists.",
        expectedRetryable: undefined,
      },
      {
        name: "ForeignKeyViolationError -> 400 BAD_REQUEST (retryable: false)",
        error: new ForeignKeyViolationError({
          sqlState: "23503",
          constraint: "fk_test",
          table: "t",
        }),
        expectedStatus: 400,
        expectedCode: "BAD_REQUEST",
        expectedMessage:
          "Referenced related record does not exist or cannot be modified.",
        expectedRetryable: undefined,
      },
      {
        name: "NotNullConstraintViolationError -> 422 VALIDATION_FAILED (retryable: false)",
        error: new NotNullConstraintViolationError({
          sqlState: "23502",
          column: "c",
          table: "t",
        }),
        expectedStatus: 422,
        expectedCode: "VALIDATION_FAILED",
        expectedMessage: "A required field was missing or null.",
        expectedRetryable: undefined,
      },
      {
        name: "CheckConstraintViolationError -> 422 VALIDATION_FAILED (retryable: false)",
        error: new CheckConstraintViolationError({
          sqlState: "23514",
          constraint: "chk_test",
          table: "t",
        }),
        expectedStatus: 422,
        expectedCode: "VALIDATION_FAILED",
        expectedMessage: "Provided value violated a data check constraint.",
        expectedRetryable: undefined,
      },
      {
        name: "SerializationFailureError -> 503 CONCURRENCY_CONFLICT (retryable: true)",
        error: new SerializationFailureError({ sqlState: "40001" }),
        expectedStatus: 503,
        expectedCode: "CONCURRENCY_CONFLICT",
        expectedMessage:
          "A database concurrency conflict occurred. Please retry your request.",
        expectedRetryable: true,
      },
      {
        name: "DeadlockDetectedError -> 503 CONCURRENCY_CONFLICT (retryable: true)",
        error: new DeadlockDetectedError({ sqlState: "40P01" }),
        expectedStatus: 503,
        expectedCode: "CONCURRENCY_CONFLICT",
        expectedMessage:
          "A database concurrency conflict occurred. Please retry your request.",
        expectedRetryable: true,
      },
      {
        name: "Generic DatabaseError -> 500 INTERNAL_SERVER_ERROR (retryable: false)",
        error: new DatabaseError("Raw unexpected database driver exception", {
          code: "GENERIC",
        }),
        expectedStatus: 500,
        expectedCode: "INTERNAL_SERVER_ERROR",
        expectedMessage: "An unexpected database error occurred.",
        expectedRetryable: undefined,
      },
    ];

    for (const tc of dbTestCases) {
      it(`7.x verifies mapping for ${tc.name}`, () => {
        const classified = classifyHttpError(tc.error);
        assert.equal(classified.statusCode, tc.expectedStatus);
        assert.equal(classified.code, tc.expectedCode);
        assert.equal(classified.publicMessage, tc.expectedMessage);
        assert.equal(classified.retryable, tc.expectedRetryable);

        const canonical = formatCanonicalHttpError(
          classified,
          canonicalRequestId,
        );
        assert.equal(canonical.error.code, tc.expectedCode);
        assert.equal(canonical.error.message, tc.expectedMessage);
        assert.equal(canonical.error.retryable, tc.expectedRetryable);
        assert.equal(canonical.error.requestId, canonicalRequestId);
      });
    }
  });

  // ===========================================================================
  // SUITE 8 — ERROR CLASSIFICATION IDEMPOTENCY
  // ===========================================================================
  describe("Suite 8: Error Classification Idempotency & Anti-Double-Formatting", () => {
    it("8.1 classifyHttpError() returns identical reference when passed ClassifiedHttpError", () => {
      const initial = new ClassifiedHttpError({
        statusCode: 409,
        code: "CONFLICT",
        publicMessage: "Resource conflict",
        category: "application",
        causeError: new Error("inner cause"),
      });

      const pass1 = classifyHttpError(initial);
      const pass2 = classifyHttpError(pass1);

      assert.equal(pass1, initial);
      assert.equal(pass2, initial);
    });

    it("8.2 throwing ClassifiedHttpError directly from route produces single canonical envelope", async () => {
      const app = await buildApp();
      app.get("/api/v1/test/idempotency/pre-classified", async () => {
        throw new ClassifiedHttpError({
          statusCode: 409,
          code: "CONFLICT",
          publicMessage: "Custom domain conflict",
          retryable: false,
          category: "application",
          causeError: new Error("root"),
        });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/idempotency/pre-classified",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 409);
      assert.deepEqual(res.json(), {
        error: {
          code: "CONFLICT",
          message: "Custom domain conflict",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      // Confirm no nested error envelope
      assert.equal((res.json().error as any).error, undefined);
      await app.close();
    });

    it("8.3 prevents legacy envelope from nesting inside canonical envelope and vice versa", () => {
      const classified = new ClassifiedHttpError({
        statusCode: 422,
        code: "VALIDATION_FAILED",
        publicMessage: "Invalid input",
        category: "validation",
        causeError: new Error("validation error"),
      });

      const canonical = formatCanonicalHttpError(
        classified,
        canonicalRequestId,
      );
      assert.equal((canonical as any).success, undefined);
      assert.ok(canonical.error);

      const legacy = formatLegacyStep04Error(classified, canonicalRequestId);
      assert.equal(legacy.success, false);
      assert.equal((legacy.error as any).retryable, undefined);
      assert.equal((legacy.error as any).error, undefined);
    });
  });

  // ===========================================================================
  // SUITE 9 — RETRYABILITY
  // ===========================================================================
  describe("Suite 9: Retryability Semantics & Non-Retryable Fallthrough", () => {
    it("9.1 CONCURRENCY_CONFLICT is retryable across application and database categories", () => {
      const appConflict = new AppError(
        503,
        "CONCURRENCY_CONFLICT",
        "Conflict retry",
      );
      const dbSerialization = new SerializationFailureError({
        sqlState: "40001",
      });

      assert.equal(classifyHttpError(appConflict).retryable, true);
      assert.equal(classifyHttpError(dbSerialization).retryable, true);
    });

    it("9.2 non-concurrency errors are strictly NOT retryable", () => {
      const nonRetryableErrors = [
        new BadRequestError("Bad syntax"),
        new UnauthorizedError("No token"),
        new ForbiddenError("Forbidden"),
        new NotFoundError("Not found"),
        new ConflictError("State conflict"),
        new ValidationError("Invalid input"),
        new InternalServerError("Internal error"),
        new Error("Unexpected native error"),
      ];

      for (const err of nonRetryableErrors) {
        const classified = classifyHttpError(err);
        assert.notEqual(
          classified.retryable,
          true,
          `Error ${classified.code} must NOT be retryable`,
        );
      }
    });

    it("9.3 framework 429 status code maps to RATE_LIMITED with retryable: false", () => {
      const fastify429 = Object.assign(new Error("Rate limit exceeded"), {
        statusCode: 429,
      });

      const classified = classifyHttpError(fastify429);
      assert.equal(classified.statusCode, 429);
      assert.equal(classified.code, "RATE_LIMITED");
      assert.equal(
        classified.publicMessage,
        "Too many requests. Please try again later.",
      );
      assert.equal(classified.retryable, false);
      assert.equal(classified.category, "framework");
    });
  });

  // ===========================================================================
  // SUITE 10 — STEP 04 COMPATIBILITY
  // ===========================================================================
  describe("Suite 10: Step 04 Compatibility Boundary & Route Metadata Isolation", () => {
    it("10.1 existing Step 04 auth route returns legacy error envelope", async () => {
      const app = await buildApp();
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
        payload: { phone: "invalid-phone", role: "USER" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.requestId, canonicalRequestId);
      assert.ok("timestamp" in json.error);
      assert.ok("details" in json.error);
      await app.close();
    });

    it("10.2 route registered with explicit step04-legacy config returns legacy envelope", async () => {
      const app = await buildApp();
      app.get(
        "/api/v1/custom/explicit-legacy",
        { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
        async () => {
          throw new ConflictError("Legacy conflict");
        },
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/custom/explicit-legacy",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 409);
      const json = res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "CONFLICT");
      assert.equal(json.error.message, "Legacy conflict");
      assert.equal(json.error.requestId, canonicalRequestId);
      await app.close();
    });

    it("10.3 future unmarked route under /api/v1/auth/* returns canonical envelope (no prefix bleed)", async () => {
      const app = await buildApp();
      app.post("/api/v1/auth/passkeys/create", async () => {
        throw new ConflictError("Passkey conflict");
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/passkeys/create",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
        payload: {},
      });

      assert.equal(res.statusCode, 409);
      const json = res.json();
      assert.equal(json.success, undefined);
      assert.deepEqual(json, {
        error: {
          code: "CONFLICT",
          message: "Passkey conflict",
          requestId: canonicalRequestId,
        },
      });
      await app.close();
    });

    it("10.4 unmatched route under /api/v1/auth/non-existent returns canonical 404 envelope", async () => {
      const app = await buildApp();
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/non-existent-subpath",
        headers: { [REQUEST_ID_HEADER]: canonicalRequestId },
      });

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.json(), {
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          requestId: canonicalRequestId,
          retryable: false,
        },
      });
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 11 — /health
  // ===========================================================================
  describe("Suite 11: /health Operational Endpoint Invariance", () => {
    it("11.1 /health continues returning operational health status outside business envelopes", async () => {
      const app = await buildApp();
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      assert.equal(res.statusCode, 200);
      const json = res.json();
      assert.equal(json.status, "ok");
      assert.equal(json.service, "zero-brokerage-api");
      assert.ok("timestamp" in json);
      assert.equal(
        json.data,
        undefined,
        "Must NOT be wrapped in canonical data envelope",
      );
      assert.equal(
        json.success,
        undefined,
        "Must NOT be wrapped in legacy success envelope",
      );
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 12 — ALREADY-SENT RESPONSE
  // ===========================================================================
  describe("Suite 12: Already-Sent Response Guard & Non-Crash Resilience", () => {
    it("12.1 does not attempt duplicate reply or crash when error occurs after reply is sent", async () => {
      const app = await buildApp();
      let handlerReached = false;

      app.get("/api/v1/test/already-sent-guard", async (req, reply) => {
        handlerReached = true;
        // Explicitly send response and flush
        reply.raw.writeHead(200, { "content-type": "application/json" });
        reply.raw.write(JSON.stringify({ flushed: true }));
        reply.raw.end();

        // Throw error after response is sent
        throw new Error("Mid-stream connection error after flush");
      });

      await app.ready();

      // Injection must receive the 200 OK without unhandled exception crashing the test runner
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test/already-sent-guard",
      });

      assert.equal(handlerReached, true);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { flushed: true });
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 13 — REAL buildApp() INTEGRATION
  // ===========================================================================
  describe("Suite 13: Real buildApp() Production End-to-End Adversarial Injections", () => {
    it("13.1 exercises production buildApp() with simultaneous invalid body, query, and path parameters", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/production/combined/:resourceId",
        {
          schema: {
            params: {
              type: "object",
              properties: { resourceId: { type: "string", format: "uuid" } },
              required: ["resourceId"],
            },
            querystring: {
              type: "object",
              properties: { page: { type: "integer", minimum: 1 } },
              required: ["page"],
            },
            body: {
              type: "object",
              properties: { name: { type: "string", minLength: 3 } },
              required: ["name"],
              additionalProperties: false,
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      // Fastify schema validation checks params/query/body
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/production/combined/not-uuid?page=bad",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: canonicalRequestId,
        },
        payload: { name: "X", extraField: "exploit" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.requestId, canonicalRequestId);
      assert.ok(json.error.details.fields.length >= 1);
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE 14 — CROSS-BATCH REGRESSION
  // ===========================================================================
  describe("Suite 14: Cross-Batch Architectural Regression Verification", () => {
    it("14.1 verifies Batch 01 canonical success, collection, and error envelope constructors", () => {
      const single = createCanonicalSuccessResponse(
        { id: 1 },
        canonicalRequestId,
      );
      assert.deepEqual(single, {
        data: { id: 1 },
        meta: { requestId: canonicalRequestId },
      });

      const collection = createCanonicalCollectionResponse(
        [{ id: 1 }],
        canonicalRequestId,
        { hasMore: false, nextCursor: null },
      );
      assert.deepEqual(collection, {
        data: [{ id: 1 }],
        meta: {
          requestId: canonicalRequestId,
          pagination: { hasMore: false, nextCursor: null },
        },
      });

      const error = createCanonicalErrorResponse({
        code: "VALIDATION_FAILED",
        message: "Invalid",
        requestId: canonicalRequestId,
      });
      assert.deepEqual(error, {
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid",
          requestId: canonicalRequestId,
        },
      });
    });

    it("14.2 verifies ADR 0006 locked decision: strict 400 vs 422 boundary", async () => {
      const app = await buildApp();
      app.post(
        "/api/v1/test/adr0006/boundary",
        {
          schema: {
            body: {
              type: "object",
              properties: { active: { type: "boolean" } },
              required: ["active"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      // Transport parse failure: 400
      const res400 = await app.inject({
        method: "POST",
        url: "/api/v1/test/adr0006/boundary",
        headers: { "content-type": "application/json" },
        payload: "{unparseable",
      });
      assert.equal(res400.statusCode, 400);
      assert.equal(res400.json().error.code, "BAD_REQUEST");

      // Declared schema failure on parseable JSON: 422
      const res422 = await app.inject({
        method: "POST",
        url: "/api/v1/test/adr0006/boundary",
        headers: { "content-type": "application/json" },
        payload: { active: "not-a-boolean" },
      });
      assert.equal(res422.statusCode, 422);
      assert.equal(res422.json().error.code, "VALIDATION_FAILED");

      await app.close();
    });

    it("14.3 verifies Batch 02A metadata-based compatibility across all 16 Step 04 auth routes", async () => {
      const app = Fastify();
      const registeredRoutes: any[] = [];
      app.addHook("onRoute", (ro) => {
        if (ro.method !== "HEAD") registeredRoutes.push(ro);
      });

      const mockPool = createMockDbPool();
      await app.register(
        fp(async (f) => {
          f.decorate("db", mockPool);
          f.decorate("authenticate", async () => {});
        }),
      );
      await registerAuthRoutes(app);
      await app.ready();

      assert.ok(registeredRoutes.length >= 16);
      for (const r of registeredRoutes) {
        assert.equal(
          r.config?.compatibilitySurface,
          "step04-legacy",
          `Route ${r.method} ${r.url} must declare step04-legacy compatibility surface`,
        );
      }
      await app.close();
    });
  });
});
