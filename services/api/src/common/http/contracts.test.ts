import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";

import requestContextPlugin from "../../plugins/request-context.js";
import {
  API_VERSION_PREFIX,
  REQUEST_ID_HEADER,
  createCanonicalCollectionResponse,
  createCanonicalErrorResponse,
  createCanonicalSuccessResponse,
  createRequestId,
  isStableErrorCode,
} from "./contracts.js";

describe("shared HTTP API contract", () => {
  const requestId = "550e8400-e29b-41d4-a716-446655440000";

  it("creates the standard single-resource success envelope", () => {
    assert.deepEqual(
      createCanonicalSuccessResponse(
        { id: "listing-id", status: "active" },
        requestId,
      ),
      {
        data: { id: "listing-id", status: "active" },
        meta: { requestId },
      },
    );
  });

  it("creates the standard collection envelope with its only pagination shape", () => {
    assert.deepEqual(
      createCanonicalCollectionResponse([], requestId, {
        hasMore: false,
        nextCursor: null,
      }),
      {
        data: [],
        meta: {
          requestId,
          pagination: { hasMore: false, nextCursor: null },
        },
      },
    );
  });

  it("creates stable error codes and public validation details", () => {
    const response = createCanonicalErrorResponse({
      code: "VALIDATION_FAILED",
      message: "The request contains invalid values.",
      requestId,
      details: {
        fields: [
          {
            field: "email",
            code: "INVALID_FORMAT",
            message: "Enter a valid email address.",
          },
        ],
      },
      retryable: false,
    });

    assert.equal(response.error.code, "VALIDATION_FAILED");
    assert.equal(
      response.error.message,
      "The request contains invalid values.",
    );
    assert.equal(response.error.requestId, requestId);
    assert.deepEqual(response.error.details, {
      fields: [
        {
          field: "email",
          code: "INVALID_FORMAT",
          message: "Enter a valid email address.",
        },
      ],
    });
    assert.equal(response.error.retryable, false);
    assert.equal(isStableErrorCode("VALIDATION_FAILED"), true);
    assert.equal(isStableErrorCode("validation-failed"), false);
    assert.throws(
      () =>
        createCanonicalErrorResponse({
          code: "validation-failed",
          message: "Invalid.",
          requestId,
        }),
      /upper snake case/,
    );

    const withoutRetryable = createCanonicalErrorResponse({
      code: "BAD_REQUEST",
      message: "The request is invalid.",
      requestId,
    });
    assert.equal("retryable" in withoutRetryable.error, false);
  });

  it("uses the /api/v1 prefix and accepts or generates normalized UUID request IDs", async () => {
    const app = Fastify({
      requestIdHeader: false,
      genReqId: (request) =>
        createRequestId(request.headers[REQUEST_ID_HEADER]),
    });
    await app.register(requestContextPlugin);
    app.get(`${API_VERSION_PREFIX}/contract-test`, async (request) =>
      createCanonicalSuccessResponse({ status: "ok" }, request.id),
    );

    const upperCaseRequestId = requestId.toUpperCase();
    const accepted = await app.inject({
      method: "GET",
      url: `${API_VERSION_PREFIX}/contract-test`,
      headers: { [REQUEST_ID_HEADER]: upperCaseRequestId },
    });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.headers[REQUEST_ID_HEADER], requestId);
    assert.equal(accepted.json().meta.requestId, requestId);

    const missing = await app.inject({
      method: "GET",
      url: `${API_VERSION_PREFIX}/contract-test`,
    });
    assert.match(
      String(missing.headers[REQUEST_ID_HEADER]),
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    for (const malformedRequestId of [
      "not-a-uuid",
      "../../secret",
      "random-value",
    ]) {
      const generated = await app.inject({
        method: "GET",
        url: `${API_VERSION_PREFIX}/contract-test`,
        headers: { [REQUEST_ID_HEADER]: malformedRequestId },
      });
      assert.equal(generated.statusCode, 200);
      const generatedRequestId = generated.headers[REQUEST_ID_HEADER];
      assert.equal(typeof generatedRequestId, "string");
      if (typeof generatedRequestId !== "string") {
        throw new TypeError(
          "The response must include an X-Request-Id header.",
        );
      }
      assert.notEqual(generatedRequestId, malformedRequestId);
      assert.match(
        generatedRequestId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }

    await app.close();
  });
});
