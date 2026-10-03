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
  createCanonicalCollectionResponse,
  createCanonicalSuccessResponse,
  createValidatorCompiler,
} from "./contracts.js";
import {
  ClassifiedHttpError,
  classifyHttpError,
} from "./error-classification.js";
import {
  AppError,
  BadRequestError,
  ConflictError,
  EntitlementMissingError,
  ForbiddenError,
  InternalServerError,
  InvalidAccountStateError,
  NotFoundError,
  RateLimitedError,
  SecurityChallengeRequiredError,
  UnauthorizedError,
  ValidationError,
  VerificationRequiredError,
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
import { createMockDbPool } from "../../modules/identity/tests/mock-db-pool.js";

describe("Validation & Error Handling Integration Pipeline (Batch 02C)", () => {
  const validRequestId = "550e8400-e29b-41d4-a716-446655440000";

  async function createTestPipelineApp(): Promise<FastifyInstance> {
    const app = Fastify({
      requestIdHeader: false,
      genReqId: (req) => {
        const inbound = req.headers[REQUEST_ID_HEADER];
        return typeof inbound === "string" && REQUEST_ID_PATTERN.test(inbound)
          ? inbound.toLowerCase()
          : validRequestId;
      },
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
        f.decorate("authenticate", async (req: any) => {
          const auth = req.headers.authorization;
          if (!auth || !auth.startsWith("Bearer ")) {
            throw new UnauthorizedError(
              "Missing or malformed Authorization header.",
            );
          }
        });
        f.decorate("requireAdminRole", () => async (req: any) => {
          const role = req.headers["x-user-role"];
          if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            throw new ForbiddenError("Insufficient administrative privileges.");
          }
        });
      }),
    );

    return app;
  }

  // --- SECTION 1: CANONICAL SUCCESS PIPELINE ---
  describe("Section 1: Canonical Success Response Pipeline", () => {
    it("1.1 returns canonical single resource response with data and meta.requestId", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/items/:id",
        {
          schema: {
            params: {
              type: "object",
              properties: { id: { type: "string", format: "uuid" } },
              required: ["id"],
            },
          },
        },
        async (req) => {
          const data = { id: (req.params as any).id, name: "Sample Item" };
          return createCanonicalSuccessResponse(data, req.id);
        },
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/items/550e8400-e29b-41d4-a716-446655440000",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers[REQUEST_ID_HEADER], validRequestId);
      assert.deepEqual(res.json(), {
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "Sample Item",
        },
        meta: {
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("1.2 returns canonical collection response with data, meta.requestId, and meta.pagination", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/items",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                limit: { type: "integer", minimum: 1, maximum: 50 },
              },
            },
          },
        },
        async (req) => {
          const items = [{ id: "1" }, { id: "2" }];
          const pagination = {
            hasMore: true,
            nextCursor: "cursor_item_2",
          };
          return createCanonicalCollectionResponse(items, req.id, pagination);
        },
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/items?limit=2",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        data: [{ id: "1" }, { id: "2" }],
        meta: {
          requestId: validRequestId,
          pagination: {
            hasMore: true,
            nextCursor: "cursor_item_2",
          },
        },
      });
      await app.close();
    });
  });

  // --- SECTION 2: TRANSPORT & FRAMEWORK PARSING FAILURES ---
  describe("Section 2: Transport & Framework Parsing Failures", () => {
    it("2.1 malformed JSON returns 400 with BAD_REQUEST in canonical envelope", async () => {
      const app = await createTestPipelineApp();

      app.post("/api/v1/test/json", async () => ({ ok: true }));
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/json",
        headers: {
          "content-type": "application/json",
          [REQUEST_ID_HEADER]: validRequestId,
        },
        payload: "{ invalid-json-payload",
      });

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.json(), {
        error: {
          code: "BAD_REQUEST",
          message: "The request could not be processed.",
          requestId: validRequestId,
          retryable: false,
        },
      });
      await app.close();
    });

    it("2.2 unmatched route returns 404 NOT_FOUND in canonical error envelope via setNotFoundHandler", async () => {
      const app = await createTestPipelineApp();
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/non-existent-endpoint",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.json(), {
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          requestId: validRequestId,
          retryable: false,
        },
      });
      await app.close();
    });

    it("2.3 unsupported media type returns 415 UNSUPPORTED_MEDIA_TYPE in canonical error envelope", async () => {
      const app = await createTestPipelineApp();

      app.post(
        "/api/v1/test/xml-reject",
        {
          schema: {
            body: {
              type: "object",
              properties: { name: { type: "string" } },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test/xml-reject",
        headers: {
          "content-type": "application/xml",
          [REQUEST_ID_HEADER]: validRequestId,
        },
        payload: "<name>Zero</name>",
      });

      assert.equal(res.statusCode, 415);
      const json = res.json();
      assert.equal(json.error.code, "UNSUPPORTED_MEDIA_TYPE");
      assert.equal(json.error.requestId, validRequestId);
      assert.equal(json.error.retryable, false);
      await app.close();
    });
  });

  // --- SECTION 3: REQUEST SCHEMA VALIDATION INTEGRATION ---
  describe("Section 3: Request Schema Validation Failures (422)", () => {
    it("3.1 body missing required field returns 422 with VALIDATION_FAILED and field path", async () => {
      const app = await createTestPipelineApp();

      app.post(
        "/api/v1/properties",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 3 },
                priceMinor: { type: "integer", minimum: 1 },
              },
              required: ["title", "priceMinor"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({ ok: true, body: req.body }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/properties",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { title: "Spacious Villa" }, // missing priceMinor
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.message, "The request contains invalid values.");
      assert.equal(json.error.requestId, validRequestId);
      assert.equal(json.error.retryable, false);
      assert.deepEqual(json.error.details.fields, [
        {
          field: "priceMinor",
          code: "REQUIRED",
          message: "The field 'priceMinor' is required.",
        },
      ]);
      await app.close();
    });

    it("3.2 query parameter invalid type returns 422 with INVALID_TYPE", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/search",
        {
          schema: {
            querystring: {
              type: "object",
              properties: { page: { type: "integer", minimum: 1 } },
              required: ["page"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/search?page=not-a-number",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "page");
      assert.equal(json.error.details.fields[0].code, "INVALID_TYPE");
      await app.close();
    });

    it("3.3 path parameter invalid UUID returns 422 with INVALID_FORMAT", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/listings/:listingId",
        {
          schema: {
            params: {
              type: "object",
              properties: { listingId: { type: "string", format: "uuid" } },
              required: ["listingId"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/listings/invalid-uuid-format",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.equal(json.error.details.fields[0].field, "listingId");
      assert.equal(json.error.details.fields[0].code, "INVALID_FORMAT");
      await app.close();
    });

    it("3.4 header validation strictly checks declared custom header while tolerating normal transport headers", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/client-config",
        {
          schema: {
            headers: {
              type: "object",
              properties: {
                "x-client-platform": {
                  type: "string",
                  enum: ["ios", "android", "web"],
                },
              },
              required: ["x-client-platform"],
              additionalProperties: false,
            },
          },
        },
        async (req) => ({
          platform: req.headers["x-client-platform"],
        }),
      );
      await app.ready();

      // Passing valid custom header + ordinary transport headers succeeds
      const successRes = await app.inject({
        method: "GET",
        url: "/api/v1/client-config",
        headers: {
          "x-client-platform": "android",
          "user-agent": "Mozilla/5.0",
          host: "localhost:3000",
          accept: "application/json",
        },
      });
      assert.equal(successRes.statusCode, 200);
      assert.deepEqual(successRes.json(), { platform: "android" });

      // Passing invalid enum value fails with 422
      const failRes = await app.inject({
        method: "GET",
        url: "/api/v1/client-config",
        headers: {
          "x-client-platform": "unsupported-os",
          "user-agent": "Mozilla/5.0",
        },
      });
      assert.equal(failRes.statusCode, 422);
      assert.equal(
        failRes.json().error.details.fields[0].field,
        "x-client-platform",
      );
      assert.equal(failRes.json().error.details.fields[0].code, "INVALID_ENUM");

      await app.close();
    });

    it("3.5 sensitive values (passwords, tokens) are sanitized in validation error messages", async () => {
      const app = await createTestPipelineApp();

      app.post(
        "/api/v1/auth/reset-secret",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                password: { type: "string", minLength: 8 },
                otpCode: { type: "string", minLength: 6 },
              },
              required: ["password", "otpCode"],
            },
          },
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-secret",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { password: "short", otpCode: "12" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.error.code, "VALIDATION_FAILED");
      for (const field of json.error.details.fields) {
        // Must not expose the raw submitted secret or character counts for secrets
        assert.doesNotMatch(field.message, /short|12/);
      }
      await app.close();
    });
  });

  // --- SECTION 4: APPLICATION & DOMAIN ERROR CLASSIFICATION ---
  describe("Section 4: Application & Domain Error Classification & Formatting", () => {
    it("4.1 BadRequestError formats canonically as 400 BAD_REQUEST", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/error/bad-request", async () => {
        throw new BadRequestError("Invalid filter syntax provided.");
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/error/bad-request",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.json(), {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid filter syntax provided.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("4.2 UnauthorizedError formats canonically as 401 UNAUTHORIZED", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/error/unauth", async () => {
        throw new UnauthorizedError(
          "Session has expired. Re-authentication required.",
        );
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/error/unauth",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.json(), {
        error: {
          code: "UNAUTHORIZED",
          message: "Session has expired. Re-authentication required.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("4.3 ForbiddenError formats canonically as 403 FORBIDDEN", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/error/forbidden", async () => {
        throw new ForbiddenError("You do not have access to this resource.");
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/error/forbidden",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.json(), {
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this resource.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("4.4 NotFoundError formats canonically as 404 NOT_FOUND", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/error/not-found", async () => {
        throw new NotFoundError("Listing 42 was not found.");
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/error/not-found",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.json(), {
        error: {
          code: "NOT_FOUND",
          message: "Listing 42 was not found.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("4.5 ConflictError formats canonically as 409 CONFLICT", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/error/conflict", async () => {
        throw new ConflictError("Property is already actively listed.");
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/error/conflict",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 409);
      assert.deepEqual(res.json(), {
        error: {
          code: "CONFLICT",
          message: "Property is already actively listed.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("4.6 ValidationError with details maps to 422 VALIDATION_FAILED with details.fields", async () => {
      const app = await createTestPipelineApp();
      app.post("/api/v1/error/validation", async () => {
        throw new ValidationError("Domain validation failed", [
          {
            field: "rentAmount",
            message: "Rent amount must be greater than zero",
            code: "VALUE_TOO_SMALL",
          },
        ]);
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/error/validation",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 422);
      assert.deepEqual(res.json(), {
        error: {
          code: "VALIDATION_FAILED",
          message: "Domain validation failed",
          details: {
            fields: [
              {
                field: "rentAmount",
                code: "VALUE_TOO_SMALL",
                message: "Rent amount must be greater than zero",
              },
            ],
          },
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("4.7 Domain-specific authorization errors format as 403 with stable codes", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/domain/verification", async () => {
        throw new VerificationRequiredError();
      });
      app.get("/api/v1/domain/entitlement", async () => {
        throw new EntitlementMissingError();
      });
      app.get("/api/v1/domain/step-up", async () => {
        throw new SecurityChallengeRequiredError();
      });
      app.get("/api/v1/domain/account-state", async () => {
        throw new InvalidAccountStateError();
      });
      await app.ready();

      const r1 = await app.inject({
        method: "GET",
        url: "/api/v1/domain/verification",
      });
      assert.equal(r1.statusCode, 403);
      assert.equal(r1.json().error.code, "VERIFICATION_REQUIRED");

      const r2 = await app.inject({
        method: "GET",
        url: "/api/v1/domain/entitlement",
      });
      assert.equal(r2.statusCode, 403);
      assert.equal(r2.json().error.code, "ENTITLEMENT_MISSING");

      const r3 = await app.inject({
        method: "GET",
        url: "/api/v1/domain/step-up",
      });
      assert.equal(r3.statusCode, 403);
      assert.equal(r3.json().error.code, "SECURITY_CHALLENGE_REQUIRED");

      const r4 = await app.inject({
        method: "GET",
        url: "/api/v1/domain/account-state",
      });
      assert.equal(r4.statusCode, 403);
      assert.equal(r4.json().error.code, "INVALID_ACCOUNT_STATE");

      await app.close();
    });
  });

  // --- SECTION 5: DATABASE ERROR CLASSIFICATION & SHIELDING ---
  describe("Section 5: Database Error Classification & Information Shielding", () => {
    it("5.1 UniqueConstraintViolationError maps to 409 CONFLICT with zero constraint leaked", async () => {
      const app = await createTestPipelineApp();
      app.post("/api/v1/db/unique", async () => {
        throw new UniqueConstraintViolationError({
          sqlState: "23505",
          constraint: "listings_broker_id_property_id_unique_idx",
          table: "listings",
          column: "property_id",
        });
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/db/unique",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 409);
      assert.deepEqual(res.json(), {
        error: {
          code: "CONFLICT",
          message:
            "A record with this identifier or unique value already exists.",
          requestId: validRequestId,
        },
      });
      // Verify no constraint or column leaked anywhere in JSON string
      assert.doesNotMatch(res.body, /listings_broker_id|property_id/);
      await app.close();
    });

    it("5.2 ForeignKeyViolationError maps to 400 BAD_REQUEST with zero constraint leaked", async () => {
      const app = await createTestPipelineApp();
      app.post("/api/v1/db/foreign-key", async () => {
        throw new ForeignKeyViolationError({
          sqlState: "23503",
          constraint: "fk_listings_agency_id",
          table: "listings",
        });
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/db/foreign-key",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.json(), {
        error: {
          code: "BAD_REQUEST",
          message:
            "Referenced related record does not exist or cannot be modified.",
          requestId: validRequestId,
        },
      });
      assert.doesNotMatch(res.body, /fk_listings_agency_id/);
      await app.close();
    });

    it("5.3 NotNullConstraintViolationError maps to 422 VALIDATION_FAILED with zero column leaked", async () => {
      const app = await createTestPipelineApp();
      app.post("/api/v1/db/not-null", async () => {
        throw new NotNullConstraintViolationError({
          sqlState: "23502",
          column: "secret_billing_id",
          table: "users",
        });
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/db/not-null",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 422);
      assert.deepEqual(res.json(), {
        error: {
          code: "VALIDATION_FAILED",
          message: "A required field was missing or null.",
          requestId: validRequestId,
        },
      });
      assert.doesNotMatch(res.body, /secret_billing_id/);
      await app.close();
    });

    it("5.4 SerializationFailureError / DeadlockDetectedError maps to 503 CONCURRENCY_CONFLICT with retryable: true", async () => {
      const app = await createTestPipelineApp();
      app.post("/api/v1/db/serialization", async () => {
        throw new SerializationFailureError({ sqlState: "40001" });
      });
      app.post("/api/v1/db/deadlock", async () => {
        throw new DeadlockDetectedError({ sqlState: "40P01" });
      });
      await app.ready();

      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/db/serialization",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });
      assert.equal(res1.statusCode, 503);
      assert.deepEqual(res1.json(), {
        error: {
          code: "CONCURRENCY_CONFLICT",
          message:
            "A database concurrency conflict occurred. Please retry your request.",
          requestId: validRequestId,
          retryable: true,
        },
      });

      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/db/deadlock",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });
      assert.equal(res2.statusCode, 503);
      assert.equal(res2.json().error.retryable, true);

      await app.close();
    });

    it("5.5 Generic DatabaseError maps to 500 INTERNAL_SERVER_ERROR without leaking SQL query", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/db/raw-fail", async () => {
        throw new DatabaseError(
          "SELECT * FROM sensitive_vault WHERE pass = 'hunter2'",
          {
            code: "QUERY_FAILED",
            sqlState: "50000",
          },
        );
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/db/raw-fail",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 500);
      assert.deepEqual(res.json(), {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected database error occurred.",
          requestId: validRequestId,
        },
      });
      assert.doesNotMatch(res.body, /sensitive_vault|hunter2/);
      await app.close();
    });
  });

  // --- SECTION 6: UNEXPECTED NATIVE ERROR MASKING ---
  describe("Section 6: Unexpected Native Error Masking", () => {
    it("6.1 unhandled Error with secrets in message is completely masked and safe message returned", async () => {
      const app = await createTestPipelineApp();
      app.get("/api/v1/unexpected/leak-attempt", async () => {
        throw new Error(
          "DATABASE_URL=postgres://superuser:supersecret@10.0.0.1/production",
        );
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/unexpected/leak-attempt",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });

      assert.equal(res.statusCode, 500);
      assert.deepEqual(res.json(), {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An internal server error occurred.",
          requestId: validRequestId,
          retryable: false,
        },
      });
      assert.doesNotMatch(res.body, /superuser|supersecret|10\.0\.0\.1/);
      await app.close();
    });
  });

  // --- SECTION 7: AUTH & GUARD INTEGRATION ---
  describe("Section 7: Plugin Hooks & Guard Pipeline Integration", () => {
    it("7.1 preHandler authentication failure throws UnauthorizedError flowing through error pipeline", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/guarded-resource",
        {
          preHandler: [app.authenticate],
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/guarded-resource",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        // missing Authorization header
      });

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.json(), {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or malformed Authorization header.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });

    it("7.2 preHandler authorization failure throws ForbiddenError flowing through error pipeline", async () => {
      const app = await createTestPipelineApp();

      app.get(
        "/api/v1/admin-only-resource",
        {
          preHandler: [app.authenticate, (app as any).requireAdminRole()],
        },
        async () => ({ ok: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin-only-resource",
        headers: {
          authorization: "Bearer valid_mock_token",
          "x-user-role": "USER",
          [REQUEST_ID_HEADER]: validRequestId,
        },
      });

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.json(), {
        error: {
          code: "FORBIDDEN",
          message: "Insufficient administrative privileges.",
          requestId: validRequestId,
        },
      });
      await app.close();
    });
  });

  // --- SECTION 8: STEP 04 COMPATIBILITY PRESERVATION ---
  describe("Section 8: Step 04 Compatibility Preservation", () => {
    it("8.1 Step 04 configured route receives legacy error format with success: false", async () => {
      const app = await createTestPipelineApp();

      app.post(
        "/api/v1/auth/legacy-endpoint",
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
        async () => ({ success: true }),
      );
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/legacy-endpoint",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: {},
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.ok(Array.isArray(json.error.details));
      assert.equal(typeof json.error.timestamp, "string");
      assert.equal(json.error.requestId, validRequestId);
      await app.close();
    });

    it("8.2 New canonical Step 05 route outside Step 04 receives canonical format without success property", async () => {
      const app = await createTestPipelineApp();

      app.post(
        "/api/v1/auth/canonical-endpoint",
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
        url: "/api/v1/auth/canonical-endpoint",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { email: "not-an-email" },
      });

      assert.equal(res.statusCode, 422);
      const json = res.json();
      assert.equal(
        json.success,
        undefined,
        "Canonical route must NOT have success property",
      );
      assert.equal(json.error.code, "VALIDATION_FAILED");
      assert.ok(json.error.details.fields);
      await app.close();
    });
  });

  // --- SECTION 9: IDEMPOTENCY OF CLASSIFICATION ---
  describe("Section 9: Idempotency of Classification", () => {
    it("9.1 already classified error is not double-wrapped or double-transformed", async () => {
      const existing = new ClassifiedHttpError({
        statusCode: 403,
        code: "FORBIDDEN",
        publicMessage: "Already classified message",
        category: "application",
        causeError: new Error("original cause"),
        retryable: false,
      });

      const reclassified = classifyHttpError(existing);
      assert.equal(
        reclassified,
        existing,
        "Must return identical instance without wrapping",
      );
      assert.equal(reclassified.statusCode, 403);
      assert.equal(reclassified.code, "FORBIDDEN");
    });
  });

  // --- SECTION 10: REAL BUILD-APP INTEGRATION ---
  describe("Section 10: Real buildApp() Production End-to-End Verification", () => {
    it("10.1 executes entire pipeline on production buildApp() instance", async () => {
      const app = await buildApp();

      // Register a Step 05 canonical route on buildApp instance before listening
      app.post(
        "/api/v1/integration/agencies",
        {
          schema: {
            body: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 3 },
                city: { type: "string" },
              },
              required: ["name", "city"],
              additionalProperties: false,
            },
          },
        },
        async (req) => {
          const body = req.body as { name: string; city: string };
          return createCanonicalSuccessResponse(
            { id: "550e8400-e29b-41d4-a716-446655440000", ...body },
            req.id,
          );
        },
      );

      await app.ready();

      // Health operational check (exception to canonical envelope)
      const healthRes = await app.inject({ method: "GET", url: "/health" });
      assert.equal(healthRes.statusCode, 200);
      assert.equal(healthRes.json().status, "ok");
      assert.equal(healthRes.json().service, "zero-brokerage-api");

      // Test 1: Valid canonical submission
      const validRes = await app.inject({
        method: "POST",
        url: "/api/v1/integration/agencies",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { name: "Apex Realty", city: "Bengaluru" },
      });
      assert.equal(validRes.statusCode, 200);
      assert.deepEqual(validRes.json(), {
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "Apex Realty",
          city: "Bengaluru",
        },
        meta: {
          requestId: validRequestId,
        },
      });

      // Test 2: Validation failure on canonical route
      const invalidRes = await app.inject({
        method: "POST",
        url: "/api/v1/integration/agencies",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
        payload: { name: "Ap" }, // too short & missing city
      });
      assert.equal(invalidRes.statusCode, 422);
      const invalidJson = invalidRes.json();
      assert.equal(invalidJson.error.code, "VALIDATION_FAILED");
      assert.equal(invalidJson.error.requestId, validRequestId);
      assert.equal(invalidJson.error.retryable, false);
      assert.ok(invalidJson.error.details.fields.length >= 2);

      // Test 3: Unmatched 404 route on real app returns canonical error
      const notFoundRes = await app.inject({
        method: "GET",
        url: "/api/v1/integration/does-not-exist",
        headers: { [REQUEST_ID_HEADER]: validRequestId },
      });
      assert.equal(notFoundRes.statusCode, 404);
      assert.deepEqual(notFoundRes.json(), {
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          requestId: validRequestId,
          retryable: false,
        },
      });

      // Test 4: Existing Step 04 route returns legacy envelope
      const step04Res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/request-otp",
        payload: { phone: "invalid", role: "USER" },
      });
      assert.equal(step04Res.statusCode, 422);
      const step04Body = step04Res.json();
      assert.equal(step04Body.success, false);
      assert.equal(step04Body.error.code, "VALIDATION_FAILED");
      assert.ok(Array.isArray(step04Body.error.details));

      await app.close();
    });
  });
});
