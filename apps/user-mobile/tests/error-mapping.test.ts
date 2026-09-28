import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiError,
  mapApiErrorToUserMessage,
  parseApiErrorEnvelope,
} from "../src/services/api/errors";

test("error-mapping: maps RATE_LIMITED / 429 to user-friendly message", () => {
  const err = new ApiError("RATE_LIMITED", "Rate limit exceeded", {
    status: 429,
  });
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /too many attempts/i);
});

test("error-mapping: maps UNAUTHORIZED / 401 to verification code error", () => {
  const err = new ApiError("UNAUTHORIZED", "Invalid code", { status: 401 });
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /invalid verification code/i);
});

test("error-mapping: maps NETWORK_ERROR to connection message", () => {
  const err = new ApiError("NETWORK_ERROR", "Failed to fetch");
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /internet connection/i);
});

test("error-mapping: maps TIMEOUT to timeout message", () => {
  const err = new ApiError("TIMEOUT", "Request timed out");
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /timed out/i);
});

test("error-mapping: maps VALIDATION_FAILED with field details", () => {
  const err = new ApiError("VALIDATION_FAILED", "Validation failed", {
    status: 422,
    errorDetails: [{ field: "phone", message: "Phone number is required." }],
  });
  const msg = mapApiErrorToUserMessage(err);
  assert.equal(msg, "Phone number is required.");
});

test("error-mapping: suppresses raw stack traces and internal errors", () => {
  const err = new ApiError(
    "INTERNAL_SERVER_ERROR",
    "relation 'users' does not exist at postgres.ts:42",
    {
      status: 500,
    },
  );
  const msg = mapApiErrorToUserMessage(err);
  assert.equal(
    msg,
    "Our service is temporarily unavailable. Please try again shortly.",
  );
  assert.doesNotMatch(msg, /postgres/i);
  assert.doesNotMatch(msg, /relation/i);
});

test("error-parsing: parses standard backend error envelope", () => {
  const payload = {
    success: false,
    error: {
      code: "VALIDATION_FAILED",
      message: "Invalid phone number format",
      details: [{ field: "phone", message: "Invalid format" }],
      timestamp: "2026-09-28T12:00:00.000Z",
      requestId: "req-123",
    },
  };

  const parsed = parseApiErrorEnvelope(422, payload);
  assert.equal(parsed.code, "VALIDATION_FAILED");
  assert.equal(parsed.message, "Invalid phone number format");
  assert.equal(parsed.details?.[0].field, "phone");
});
