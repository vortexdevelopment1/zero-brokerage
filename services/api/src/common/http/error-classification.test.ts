import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify, { type RouteOptions } from "fastify";
import fp from "fastify-plugin";
import { UniqueConstraintViolationError } from "@zero-brokerage/database";

import { ConflictError, NotFoundError } from "../errors/index.js";
import {
  ClassifiedHttpError,
  classifyHttpError,
  formatCanonicalHttpError,
} from "./error-classification.js";
import {
  STEP04_LEGACY_COMPATIBILITY_CONFIG,
  STEP05_CANONICAL_COMPATIBILITY_CONFIG,
} from "./compatibility.js";
import errorHandlerPlugin from "../../plugins/error-handler.js";
import requestContextPlugin from "../../plugins/request-context.js";
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  createRequestId,
} from "./contracts.js";
import { registerAuthRoutes } from "../../modules/identity/routes/auth-routes.js";
import { createMockDbPool } from "../../modules/identity/tests/mock-db-pool.js";

describe("canonical error classification and compatibility", () => {
  const validRequestId = "550e8400-e29b-41d4-a716-446655440000";

  it("preserves an already-classified error without double transformation (Matrix Case 10)", () => {
    const classified = new ClassifiedHttpError({
      statusCode: 409,
      code: "CONFLICT",
      publicMessage: "The request conflicts with the current state.",
      retryable: false,
      category: "application",
      causeError: new Error("internal cause"),
    });

    assert.equal(classifyHttpError(classified), classified);
    assert.deepEqual(formatCanonicalHttpError(classified, validRequestId), {
      error: {
        code: "CONFLICT",
        message: "The request conflicts with the current state.",
        requestId: validRequestId,
        retryable: false,
      },
    });
  });

  it("does not expose persistence identifiers through canonical database errors (Matrix Case 11)", () => {
    const classified = classifyHttpError(
      new UniqueConstraintViolationError({
        sqlState: "23505",
        constraint: "identities_phone_key",
        table: "identities",
        column: "phone",
      }),
    );

    assert.equal(classified.category, "database");
    const canonical = formatCanonicalHttpError(classified, validRequestId);
    assert.deepEqual(canonical, {
      error: {
        code: "CONFLICT",
        message:
          "A record with this identifier or unique value already exists.",
        requestId: validRequestId,
      },
    });
    assert.doesNotMatch(JSON.stringify(canonical), /identities_phone_key/i);
  });

  it("introspects all Step 04 routes to verify compatibility declaration coverage (Section 7)", async () => {
    const app = Fastify();
    const introspectedRoutes: RouteOptions[] = [];

    app.addHook("onRoute", (routeOptions) => {
      // Collect all non-HEAD routes registered in the application
      if (routeOptions.method !== "HEAD") {
        introspectedRoutes.push(routeOptions);
      }
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

    // Verify that routes were registered and ALL have the legacy compatibility declaration
    assert.ok(
      introspectedRoutes.length >= 16,
      "All 16 Step 04 routes must be registered",
    );
    for (const route of introspectedRoutes) {
      assert.equal(
        route.config?.compatibilitySurface,
        "step04-legacy",
        `Route ${route.method} ${route.url} must declare step04-legacy compatibility surface`,
      );
    }

    await app.close();
  });

  it("executes the complete compatibility boundary test matrix (Matrix Cases 1-9, 11-15)", async () => {
    const app = Fastify({
      requestIdHeader: false,
      genReqId: (request) =>
        createRequestId(request.headers[REQUEST_ID_HEADER]),
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

    // Register official Step 04 routes via the Step 04 registration mechanism
    await registerAuthRoutes(app);

    // Define all matrix test routes BEFORE injecting requests
    // 2. Existing Step 05 / Non-Step04 route (Matrix Case 2)
    app.get("/api/v1/listings/test-conflict", async () => {
      throw new ConflictError("Listing conflict.");
    });

    // 3. Future/non-Step04 route under /api/v1/auth/* registered outside Step 04 scope (Matrix Case 3)
    app.post("/api/v1/auth/passkeys/register", async () => {
      throw new ConflictError("Future auth conflict.");
    });

    // 4. Explicitly marked Step 04 route (Matrix Case 4)
    app.get(
      "/api/v1/custom/step04-route",
      { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
      async () => {
        throw new ConflictError("Explicit legacy conflict.");
      },
    );

    // 5. Unmarked route (Matrix Case 5)
    app.get("/api/v1/unmarked/test", async () => {
      throw new ConflictError("Unmarked conflict.");
    });

    // 6. Route renamed/moved retaining explicit Step 04 compatibility declaration (Matrix Case 6)
    app.post(
      "/api/v1/identity/renamed-login",
      { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
      async () => {
        throw new ConflictError("Renamed legacy conflict.");
      },
    );

    // 7. Route renamed/moved without compatibility declaration (Matrix Case 7)
    app.post("/api/v1/identity/renamed-canonical", async () => {
      throw new ConflictError("Renamed canonical conflict.");
    });

    // 8. Newly registered Step 04 route does not require updating centralized registry (Matrix Case 8)
    await app.register(async (newLegacyScope) => {
      newLegacyScope.addHook("onRoute", (ro) => {
        ro.config = ro.config || {};
        ro.config.compatibilitySurface = "step04-legacy";
      });
      newLegacyScope.post("/api/v1/auth/dynamic-new-action", async () => {
        throw new ConflictError("New route conflict without registry update.");
      });
    });

    // 11. Database constraint error routes on legacy vs canonical surfaces (Matrix Case 11)
    app.get(
      "/api/v1/test/legacy-db-error",
      { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
      async () => {
        throw new UniqueConstraintViolationError({
          sqlState: "23505",
          constraint: "uq_user_phone",
          table: "identities",
          column: "phone",
        });
      },
    );
    app.get(
      "/api/v1/test/canonical-db-error",
      { config: STEP05_CANONICAL_COMPATIBILITY_CONFIG },
      async () => {
        throw new UniqueConstraintViolationError({
          sqlState: "23505",
          constraint: "uq_user_phone",
          table: "identities",
          column: "phone",
        });
      },
    );

    // 12. Unknown errors remain safely masked in both surfaces (Matrix Case 12)
    app.get(
      "/api/v1/test/legacy-leak",
      { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
      () => {
        throw new Error("postgres://user:secret_pass@db.internal:5432/leak");
      },
    );
    app.get("/api/v1/test/canonical-leak", () => {
      throw new Error("postgres://user:secret_pass@db.internal:5432/leak");
    });

    // 13. Malformed JSON behavior for legacy Step 04 route (Matrix Case 13)
    app.post(
      "/api/v1/test/legacy-json",
      { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
      async () => ({ success: true }),
    );

    // 14. Malformed JSON behavior for unmarked future route (Matrix Case 14)
    app.post("/api/v1/test/canonical-json", async () => ({ ok: true }));

    // 15c: Error thrown in preHandler hook of a legacy route receives legacy format (Matrix Case 15)
    app.get(
      "/api/v1/test/legacy-prehandler-fail",
      {
        config: STEP04_LEGACY_COMPATIBILITY_CONFIG,
        preHandler: async () => {
          throw new ConflictError("Failed in preHandler");
        },
      },
      async () => ({ success: true }),
    );

    // 15a: Route throwing NotFoundError (Matrix Case 15)
    app.get("/api/v1/test/not-found-error", async () => {
      throw new NotFoundError("Resource not found.");
    });

    await app.ready();

    // --- ASSERTIONS ---

    // 1. Existing Step 04 route registered via official registration mechanism (Matrix Case 1)
    const existingStep04Res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh-session",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
      payload: {}, // invalid body triggers ZodError
    });
    assert.equal(existingStep04Res.statusCode, 422);
    const existingStep04Body = existingStep04Res.json();
    assert.equal(existingStep04Body.success, false);
    assert.equal(existingStep04Body.error.code, "VALIDATION_FAILED");
    assert.equal(existingStep04Body.error.requestId, validRequestId);
    assert.ok("details" in existingStep04Body.error);

    // 2. Existing Step 05 / Non-Step04 route (Matrix Case 2)
    const step05Res = await app.inject({
      method: "GET",
      url: "/api/v1/listings/test-conflict",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(step05Res.statusCode, 409);
    assert.deepEqual(step05Res.json(), {
      error: {
        code: "CONFLICT",
        message: "Listing conflict.",
        requestId: validRequestId,
      },
    });

    // 3. Future/non-Step04 route under /api/v1/auth/* registered outside Step 04 scope (Matrix Case 3)
    const futureAuthRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/passkeys/register",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
      payload: {},
    });
    assert.equal(futureAuthRes.statusCode, 409);
    assert.equal(futureAuthRes.json().success, undefined);
    assert.deepEqual(futureAuthRes.json(), {
      error: {
        code: "CONFLICT",
        message: "Future auth conflict.",
        requestId: validRequestId,
      },
    });

    // 4. Explicitly marked Step 04 route (Matrix Case 4)
    const explicitlyMarkedRes = await app.inject({
      method: "GET",
      url: "/api/v1/custom/step04-route",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(explicitlyMarkedRes.statusCode, 409);
    const explicitlyMarkedBody = explicitlyMarkedRes.json();
    assert.equal(explicitlyMarkedBody.success, false);
    assert.equal(explicitlyMarkedBody.error.code, "CONFLICT");
    assert.equal(
      explicitlyMarkedBody.error.message,
      "Explicit legacy conflict.",
    );
    assert.equal(explicitlyMarkedBody.error.requestId, validRequestId);

    // 5. Unmarked route (Matrix Case 5)
    const unmarkedRes = await app.inject({
      method: "GET",
      url: "/api/v1/unmarked/test",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(unmarkedRes.statusCode, 409);
    assert.deepEqual(unmarkedRes.json(), {
      error: {
        code: "CONFLICT",
        message: "Unmarked conflict.",
        requestId: validRequestId,
      },
    });

    // 6. Route renamed/moved retaining explicit Step 04 compatibility declaration (Matrix Case 6)
    const renamedWithCompatRes = await app.inject({
      method: "POST",
      url: "/api/v1/identity/renamed-login",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(renamedWithCompatRes.statusCode, 409);
    assert.equal(renamedWithCompatRes.json().success, false);
    assert.equal(renamedWithCompatRes.json().error.code, "CONFLICT");
    assert.equal(
      renamedWithCompatRes.json().error.message,
      "Renamed legacy conflict.",
    );

    // 7. Route renamed/moved without compatibility declaration (Matrix Case 7)
    const renamedCanonicalRes = await app.inject({
      method: "POST",
      url: "/api/v1/identity/renamed-canonical",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(renamedCanonicalRes.statusCode, 409);
    assert.deepEqual(renamedCanonicalRes.json(), {
      error: {
        code: "CONFLICT",
        message: "Renamed canonical conflict.",
        requestId: validRequestId,
      },
    });

    // 8. Newly registered Step 04 route does not require updating centralized registry (Matrix Case 8)
    const dynamicNewRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/dynamic-new-action",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(dynamicNewRes.statusCode, 409);
    assert.equal(dynamicNewRes.json().success, false);
    assert.equal(dynamicNewRes.json().error.code, "CONFLICT");
    assert.equal(
      dynamicNewRes.json().error.message,
      "New route conflict without registry update.",
    );

    // 9. Request ID preservation works for both legacy and canonical (Matrix Case 9)
    // 9a: Absent request ID -> generated UUID preserved in header and body
    const absentLegacyRes = await app.inject({
      method: "GET",
      url: "/api/v1/custom/step04-route",
    });
    const generatedLegacyId = absentLegacyRes.headers[REQUEST_ID_HEADER];
    assert.ok(REQUEST_ID_PATTERN.test(String(generatedLegacyId)));
    assert.equal(absentLegacyRes.json().error.requestId, generatedLegacyId);

    const absentCanonicalRes = await app.inject({
      method: "GET",
      url: "/api/v1/unmarked/test",
    });
    const generatedCanonicalId = absentCanonicalRes.headers[REQUEST_ID_HEADER];
    assert.ok(REQUEST_ID_PATTERN.test(String(generatedCanonicalId)));
    assert.equal(
      absentCanonicalRes.json().error.requestId,
      generatedCanonicalId,
    );

    // 9b: Malformed inbound request ID -> generates valid UUID
    const malformedLegacyRes = await app.inject({
      method: "GET",
      url: "/api/v1/custom/step04-route",
      headers: { [REQUEST_ID_HEADER]: "not-a-valid-uuid" },
    });
    assert.ok(
      REQUEST_ID_PATTERN.test(
        String(malformedLegacyRes.headers[REQUEST_ID_HEADER]),
      ),
    );
    assert.notEqual(
      malformedLegacyRes.headers[REQUEST_ID_HEADER],
      "not-a-valid-uuid",
    );

    // 11. Database constraint errors formatted according to surface (Matrix Case 11)
    const legacyDbRes = await app.inject({
      method: "GET",
      url: "/api/v1/test/legacy-db-error",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(legacyDbRes.statusCode, 409);
    assert.equal(legacyDbRes.json().success, false);
    assert.equal(legacyDbRes.json().error.code, "CONFLICT");

    const canonicalDbRes = await app.inject({
      method: "GET",
      url: "/api/v1/test/canonical-db-error",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(canonicalDbRes.statusCode, 409);
    assert.deepEqual(canonicalDbRes.json(), {
      error: {
        code: "CONFLICT",
        message:
          "A record with this identifier or unique value already exists.",
        requestId: validRequestId,
      },
    });

    // 12. Unknown errors remain safely masked in both surfaces (Matrix Case 12)
    const legacyLeakRes = await app.inject({
      method: "GET",
      url: "/api/v1/test/legacy-leak",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(legacyLeakRes.statusCode, 500);
    assert.equal(legacyLeakRes.json().success, false);
    assert.equal(legacyLeakRes.json().error.code, "INTERNAL_SERVER_ERROR");
    assert.doesNotMatch(legacyLeakRes.payload, /secret_pass|db\.internal/);

    const canonicalLeakRes = await app.inject({
      method: "GET",
      url: "/api/v1/test/canonical-leak",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(canonicalLeakRes.statusCode, 500);
    assert.deepEqual(canonicalLeakRes.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred.",
        requestId: validRequestId,
        retryable: false,
      },
    });
    assert.doesNotMatch(canonicalLeakRes.payload, /secret_pass|db\.internal/);

    // 13. Malformed JSON behavior for legacy Step 04 route (Matrix Case 13)
    const legacyJsonRes = await app.inject({
      method: "POST",
      url: "/api/v1/test/legacy-json",
      headers: {
        "content-type": "application/json",
        [REQUEST_ID_HEADER]: validRequestId,
      },
      payload: "invalid-json{missing-bracket",
    });
    assert.equal(legacyJsonRes.statusCode, 400);
    const legacyJsonBody = legacyJsonRes.json();
    assert.equal(legacyJsonBody.success, false);
    assert.equal(legacyJsonBody.error.code, "FST_ERR_CTP_INVALID_JSON_BODY");
    assert.equal(legacyJsonBody.error.requestId, validRequestId);

    // 14. Malformed JSON behavior for unmarked future route (Matrix Case 14)
    const canonicalJsonRes = await app.inject({
      method: "POST",
      url: "/api/v1/test/canonical-json",
      headers: {
        "content-type": "application/json",
        [REQUEST_ID_HEADER]: validRequestId,
      },
      payload: "invalid-json{missing-bracket",
    });
    assert.equal(canonicalJsonRes.statusCode, 400);
    assert.deepEqual(canonicalJsonRes.json(), {
      error: {
        code: "BAD_REQUEST",
        message: "The request could not be processed.",
        requestId: validRequestId,
        retryable: false,
      },
    });

    // 15. Fastify lifecycle edge cases (Matrix Case 15)
    // 15a: Route throwing NotFoundError formats canonically
    const notFoundErrorRes = await app.inject({
      method: "GET",
      url: "/api/v1/test/not-found-error",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(notFoundErrorRes.statusCode, 404);
    assert.deepEqual(notFoundErrorRes.json(), {
      error: {
        code: "NOT_FOUND",
        message: "Resource not found.",
        requestId: validRequestId,
      },
    });

    // 15b: Unmatched route (404) is outside legacy compatibility
    const notFoundRes = await app.inject({
      method: "GET",
      url: "/api/v1/completely/non-existent-path",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(notFoundRes.statusCode, 404);
    assert.equal(notFoundRes.json().success, undefined);

    // 15c: Method mismatch on legacy route is not matched to legacy handler
    const methodMismatchRes = await app.inject({
      method: "GET", // Route only exists as POST
      url: "/api/v1/test/legacy-json",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(methodMismatchRes.statusCode, 404);
    assert.equal(methodMismatchRes.json().success, undefined);

    // 15c: Error thrown in preHandler hook of a legacy route receives legacy format
    const preHandlerRes = await app.inject({
      method: "GET",
      url: "/api/v1/test/legacy-prehandler-fail",
      headers: { [REQUEST_ID_HEADER]: validRequestId },
    });
    assert.equal(preHandlerRes.statusCode, 409);
    assert.equal(preHandlerRes.json().success, false);
    assert.equal(preHandlerRes.json().error.code, "CONFLICT");
    assert.equal(preHandlerRes.json().error.message, "Failed in preHandler");

    await app.close();
  });
});
