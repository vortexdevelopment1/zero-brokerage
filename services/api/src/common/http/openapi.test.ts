import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildApp } from "../../app/build-app.js";
import { createMockDbPool } from "../../modules/identity/tests/mock-db-pool.js";
import { InMemoryIdempotencyStore } from "./idempotency/store.js";
import { InMemoryRateLimiter } from "../../modules/identity/rate-limiting/rate-limiter.js";
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshSessionSchema,
  changePhoneRequestSchema,
  changePhoneConfirmSchema,
  deleteAccountSchema,
  stepUpVerifySchema,
} from "../../modules/identity/schemas/auth-schemas.js";
import { createRateLimitHandler } from "./rate-limit/handler.js";

describe("Step 05 Batch 05: OpenAPI Documentation Infrastructure", () => {
  let app: FastifyInstance;
  let mockDbPool: any;
  let spec: any;

  before(async () => {
    mockDbPool = createMockDbPool();
    app = await buildApp({
      logger: false,
      idempotencyStore: new InMemoryIdempotencyStore(),
      rateLimiter: new InMemoryRateLimiter(),
    });
    // Force app to be ready and generate swagger spec
    await app.ready();
    spec = app.swagger();
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it("1. Generates a valid OpenAPI 3.0.3 root document structure", () => {
    assert.ok(spec, "OpenAPI spec must be generated");
    assert.equal(spec.openapi, "3.0.3");
    assert.ok(spec.info, "Info block must be defined");
    assert.equal(spec.info.title, "Zero Brokerage API");
    assert.equal(spec.info.version, "1.0.0");
    assert.ok(spec.info.description);
    assert.ok(Array.isArray(spec.servers));
    assert.ok(spec.paths, "Paths object must be defined");
  });

  it("2. Validates all $ref references within components and paths", () => {
    const schemas = spec.components?.schemas || {};
    const securitySchemes = spec.components?.securitySchemes || {};

    assert.ok(
      schemas.CanonicalError,
      "CanonicalError component must be defined",
    );
    assert.ok(
      schemas.CanonicalSuccessMeta,
      "CanonicalSuccessMeta must be defined",
    );
    assert.ok(
      schemas.CanonicalPaginationMeta,
      "CanonicalPaginationMeta must be defined",
    );
    assert.ok(
      schemas.RateLimitExceededError,
      "RateLimitExceededError must be defined",
    );
    assert.ok(schemas.Step04LegacyError, "Step04LegacyError must be defined");
    assert.ok(
      schemas.Step04LegacyRateLimitError,
      "Step04LegacyRateLimitError must be defined",
    );
    assert.ok(
      securitySchemes.bearerAuth,
      "bearerAuth securityScheme must be defined",
    );

    // Recursively collect all $ref occurrences in the entire spec
    const collectedRefs: string[] = [];
    function collectRefs(obj: any) {
      if (!obj || typeof obj !== "object") return;
      if (typeof obj.$ref === "string") {
        collectedRefs.push(obj.$ref);
      }
      for (const key of Object.keys(obj)) {
        collectRefs(obj[key]);
      }
    }
    collectRefs(spec);

    assert.ok(
      collectedRefs.length > 0,
      "Expected multiple $ref usages in document",
    );

    for (const ref of collectedRefs) {
      assert.ok(
        ref.startsWith("#/components/schemas/"),
        `Expected schema ref, got: ${ref}`,
      );
      const schemaName = ref.replace("#/components/schemas/", "");
      assert.ok(
        schemas[schemaName],
        `Unresolved $ref: "${ref}" not found in components.schemas`,
      );
    }
  });

  it("3. Accurately documents ALL implemented external API routes", () => {
    const paths = spec.paths;

    // Health
    assert.ok(paths["/health"]?.get, "GET /health must be documented");

    // Auth & Identity
    assert.ok(
      paths["/api/v1/auth/request-otp"]?.post,
      "POST /api/v1/auth/request-otp must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/verify-otp"]?.post,
      "POST /api/v1/auth/verify-otp must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/refresh"]?.post,
      "POST /api/v1/auth/refresh must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/refresh-session"]?.post,
      "POST /api/v1/auth/refresh-session must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/logout"]?.post,
      "POST /api/v1/auth/logout must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/logout-all"]?.post,
      "POST /api/v1/auth/logout-all must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/me"]?.get,
      "GET /api/v1/auth/me must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/sessions"]?.get,
      "GET /api/v1/auth/sessions must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/sessions/{sessionId}"]?.delete,
      "DELETE /api/v1/auth/sessions/{sessionId} must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/change-phone/request"]?.post,
      "POST /api/v1/auth/change-phone/request must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/change-phone/confirm"]?.post,
      "POST /api/v1/auth/change-phone/confirm must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/delete-account"]?.post,
      "POST /api/v1/auth/delete-account must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/step-up/request"]?.post,
      "POST /api/v1/auth/step-up/request must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/step-up/verify"]?.post,
      "POST /api/v1/auth/step-up/verify must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/delete-account/cancel"]?.post,
      "POST /api/v1/auth/delete-account/cancel must be documented",
    );
    assert.ok(
      paths["/api/v1/auth/delete-account/finalize"]?.post,
      "POST /api/v1/auth/delete-account/finalize must be documented",
    );
  });

  it("4. Strictly does NOT document fake or un-implemented future domain endpoints", () => {
    const paths = spec.paths;

    assert.equal(
      paths["/api/v1/listings"],
      undefined,
      "Fake /listings route must not exist",
    );
    assert.equal(
      paths["/api/v1/leads"],
      undefined,
      "Fake /leads route must not exist",
    );
    assert.equal(
      paths["/api/v1/visits"],
      undefined,
      "Fake /visits route must not exist",
    );
    assert.equal(
      paths["/api/v1/payments"],
      undefined,
      "Fake /payments route must not exist",
    );
    assert.equal(
      paths["/api/v1/furniture"],
      undefined,
      "Fake /furniture route must not exist",
    );
    assert.equal(
      paths["/api/v1/reviews"],
      undefined,
      "Fake /reviews route must not exist",
    );
    assert.equal(
      paths["/api/v1/notifications"],
      undefined,
      "Fake /notifications route must not exist",
    );
  });

  it("5. Documents HTTP Bearer authentication security schemes on protected endpoints", () => {
    const meRoute = spec.paths["/api/v1/auth/me"]?.get;
    assert.ok(meRoute);
    assert.deepEqual(meRoute.security, [{ bearerAuth: [] }]);
    assert.ok(meRoute.responses["401"]);

    const deleteAccountRoute = spec.paths["/api/v1/auth/delete-account"]?.post;
    assert.ok(deleteAccountRoute);
    assert.deepEqual(deleteAccountRoute.security, [{ bearerAuth: [] }]);

    // Health check must be public
    const healthRoute = spec.paths["/health"]?.get;
    assert.equal(healthRoute.security, undefined);
  });

  it("6. Documents 429 rate limit responses and enforces accurate error schemas", () => {
    // 1. Canonical RateLimitExceededError schema must have retryable=false
    const rateLimitExceeded = spec.components?.schemas?.RateLimitExceededError;
    assert.ok(rateLimitExceeded);
    assert.equal(
      rateLimitExceeded.properties.error.properties.retryable.example,
      false,
      "RateLimitExceededError retryable example must be false",
    );

    // 2. Step 04 Legacy Rate Limit Error schema must represent legacy structure
    const legacyRateLimit =
      spec.components?.schemas?.Step04LegacyRateLimitError;
    assert.ok(legacyRateLimit);
    assert.equal(legacyRateLimit.properties.success.example, false);
    assert.equal(
      legacyRateLimit.properties.error.properties.code.example,
      "RATE_LIMITED",
    );

    // 3. Step 04 legacy routes must reference Step04LegacyRateLimitError, NOT Canonical RateLimitExceededError
    const requestOtp = spec.paths["/api/v1/auth/request-otp"]?.post;
    assert.ok(requestOtp.responses["429"]);
    assert.ok(requestOtp.responses["429"].headers?.["Retry-After"]);
    assert.equal(
      requestOtp.responses["429"].content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/Step04LegacyRateLimitError",
      "Step 04 request-otp 429 response must reference Step04LegacyRateLimitError",
    );
    assert.equal(
      requestOtp.responses["400"].content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/Step04LegacyError",
      "Step 04 request-otp 400 response must reference Step04LegacyError",
    );

    const verifyOtp = spec.paths["/api/v1/auth/verify-otp"]?.post;
    assert.ok(verifyOtp.responses["429"]);
    assert.equal(
      verifyOtp.responses["429"].content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/Step04LegacyRateLimitError",
    );

    const refresh = spec.paths["/api/v1/auth/refresh"]?.post;
    assert.ok(refresh.responses["429"]);
    assert.equal(
      refresh.responses["429"].content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/Step04LegacyRateLimitError",
    );
  });

  it("7. Serves the generated OpenAPI document over HTTP at /api/v1/openapi.json", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/openapi.json",
    });

    assert.equal(res.statusCode, 200);
    assert.ok(String(res.headers["content-type"]).includes("application/json"));
    const body = res.json();
    assert.equal(body.openapi, "3.0.3");
    assert.equal(body.info.title, "Zero Brokerage API");
    assert.ok(body.paths["/health"]);
    assert.ok(body.paths["/api/v1/auth/request-otp"]);
  });

  it("8. Distinguishes Step 04 legacy error envelopes from canonical error envelopes at runtime", async () => {
    // 1. Step 04 legacy route runtime error format (Validation failure -> 422)
    const legacyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: {},
    });
    assert.equal(legacyRes.statusCode, 422);
    const legacyBody = legacyRes.json();
    assert.equal(
      legacyBody.success,
      false,
      "Legacy response must include success: false",
    );
    assert.ok(legacyBody.error, "Legacy response must include error object");
    assert.equal(legacyBody.error.code, "VALIDATION_FAILED");
    assert.ok(legacyBody.error.message);
    assert.ok(legacyBody.error.timestamp);
    assert.ok(legacyBody.error.requestId);
    assert.equal(
      legacyBody.error.retryable,
      undefined,
      "Legacy response must not include retryable",
    );

    // Also verify malformed JSON syntax on Step 04 route returns 400 with legacy format
    const legacy400Res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      headers: { "content-type": "application/json" },
      payload: "invalid-json{",
    });
    assert.equal(legacy400Res.statusCode, 400);
    const legacy400Body = legacy400Res.json();
    assert.equal(legacy400Body.success, false);
    assert.ok(legacy400Body.error);
    assert.ok(legacy400Body.error.requestId);

    // 2. Canonical route runtime error format (using Step 05 rate-limit handler)
    const canonicalApp = await buildApp({
      logger: false,
      idempotencyStore: new InMemoryIdempotencyStore(),
      rateLimiter: new InMemoryRateLimiter(),
    });
    canonicalApp.get(
      "/api/v1/test-canonical-rate-limit",
      {
        preHandler: [
          createRateLimitHandler({
            id: "test:canonical-error-shape",
            maxRequests: 1,
            windowSeconds: 60,
            scopeStrategy: "ip",
          }),
        ],
      },
      async () => ({ data: { ok: true } }),
    );
    await canonicalApp.ready();

    // First request consumes quota
    await canonicalApp.inject({
      method: "GET",
      url: "/api/v1/test-canonical-rate-limit",
    });
    // Second request triggers 429
    const canonicalRes = await canonicalApp.inject({
      method: "GET",
      url: "/api/v1/test-canonical-rate-limit",
    });
    assert.equal(canonicalRes.statusCode, 429);
    const canonicalBody = canonicalRes.json();
    assert.equal(
      canonicalBody.success,
      undefined,
      "Canonical response must not have root success field",
    );
    assert.ok(
      canonicalBody.error,
      "Canonical response must contain root error object",
    );
    assert.equal(canonicalBody.error.code, "RATE_LIMITED");
    assert.ok(canonicalBody.error.message);
    assert.ok(canonicalBody.error.requestId);
    assert.equal(
      canonicalBody.error.retryable,
      false,
      "Canonical RATE_LIMITED error must have retryable: false",
    );

    await canonicalApp.close();
  });

  it("9. Automated Schema Parity & Drift Protection (Step 04 Zod vs OpenAPI)", () => {
    function assertSchemaParity(
      zodSchema: z.ZodObject<any>,
      openApiSchema: any,
      schemaName: string,
    ) {
      assert.ok(openApiSchema, `OpenAPI schema "${schemaName}" must exist`);
      assert.equal(
        openApiSchema.type,
        "object",
        `OpenAPI schema "${schemaName}" type must be object`,
      );

      const shape = zodSchema.shape;
      const zodKeys = Object.keys(shape).sort();
      const openApiKeys = Object.keys(openApiSchema.properties || {}).sort();

      // Strict property key parity
      assert.deepEqual(
        openApiKeys,
        zodKeys,
        `Property mismatch in "${schemaName}": expected [${zodKeys.join(", ")}], got [${openApiKeys.join(", ")}]`,
      );

      const openApiRequired = new Set(openApiSchema.required || []);

      for (const [key, fieldSchema] of Object.entries(shape)) {
        let current: any = fieldSchema;
        let isOptional = false;

        if (
          current instanceof z.ZodOptional ||
          current._def.typeName === "ZodOptional"
        ) {
          isOptional = true;
          current = current.unwrap();
        }
        if (
          current instanceof z.ZodDefault ||
          current._def.typeName === "ZodDefault"
        ) {
          isOptional = true;
          current = current._def.innerType;
        }

        // Required check
        if (isOptional) {
          assert.equal(
            openApiRequired.has(key),
            false,
            `Field "${key}" in "${schemaName}" is optional in Zod but marked required in OpenAPI`,
          );
        } else {
          assert.equal(
            openApiRequired.has(key),
            true,
            `Field "${key}" in "${schemaName}" is required in Zod but missing from OpenAPI required list`,
          );
        }

        const openApiProp = openApiSchema.properties[key];
        const typeName = current._def.typeName;

        if (typeName === "ZodString") {
          assert.equal(
            openApiProp.type,
            "string",
            `Field "${key}" in "${schemaName}" expected type string`,
          );
          for (const check of current._def.checks || []) {
            if (check.kind === "min") {
              if (check.value > 1) {
                assert.equal(
                  openApiProp.minLength,
                  check.value,
                  `Field "${key}" minLength mismatch`,
                );
              }
            }
            if (check.kind === "max") {
              assert.equal(
                openApiProp.maxLength,
                check.value,
                `Field "${key}" maxLength mismatch`,
              );
            }
            if (check.kind === "length") {
              assert.equal(
                openApiProp.minLength,
                check.value,
                `Field "${key}" minLength mismatch`,
              );
              assert.equal(
                openApiProp.maxLength,
                check.value,
                `Field "${key}" maxLength mismatch`,
              );
            }
            if (check.kind === "uuid") {
              assert.equal(
                openApiProp.format,
                "uuid",
                `Field "${key}" format mismatch (expected uuid)`,
              );
            }
          }
        } else if (typeName === "ZodEnum") {
          assert.equal(
            openApiProp.type,
            "string",
            `Field "${key}" expected type string for enum`,
          );
          assert.deepEqual(
            openApiProp.enum,
            current._def.values,
            `Field "${key}" enum mismatch`,
          );
        } else if (typeName === "ZodNumber") {
          assert.ok(
            ["number", "integer"].includes(openApiProp.type),
            `Field "${key}" expected number`,
          );
        } else if (typeName === "ZodBoolean") {
          assert.equal(
            openApiProp.type,
            "boolean",
            `Field "${key}" expected boolean`,
          );
        }
      }
    }

    const schemas = spec.components.schemas;
    assertSchemaParity(
      requestOtpSchema,
      schemas.RequestOtpRequest,
      "RequestOtpRequest",
    );
    assertSchemaParity(
      verifyOtpSchema,
      schemas.VerifyOtpRequest,
      "VerifyOtpRequest",
    );
    assertSchemaParity(
      refreshSessionSchema,
      schemas.RefreshSessionRequest,
      "RefreshSessionRequest",
    );
    assertSchemaParity(
      changePhoneRequestSchema,
      schemas.ChangePhoneRequest,
      "ChangePhoneRequest",
    );
    assertSchemaParity(
      changePhoneConfirmSchema,
      schemas.ChangePhoneConfirmRequest,
      "ChangePhoneConfirmRequest",
    );
    assertSchemaParity(
      deleteAccountSchema,
      schemas.DeleteAccountRequest,
      "DeleteAccountRequest",
    );
    assertSchemaParity(
      stepUpVerifySchema,
      schemas.StepUpVerifyRequest,
      "StepUpVerifyRequest",
    );
  });
});
