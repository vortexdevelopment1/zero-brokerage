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

test("error-mapping: maps SLOT_EXPIRED to user-friendly retry message", () => {
  const err = new ApiError("SLOT_EXPIRED", "The slot has expired");
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /timeslot has expired/i);
});

test("error-mapping: maps SLOT_UNAVAILABLE and SLOT_TAKEN to safe message", () => {
  const err = new ApiError("SLOT_TAKEN", "The slot is taken");
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /no longer available/i);
});

test("error-mapping: maps SESSION_EXPIRED to re-authentication prompt", () => {
  const err = new ApiError("SESSION_EXPIRED", "Session expired");
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /session has expired/i);
});

test("error-mapping: maps SERVICE_UNAVAILABLE (503) to temporary outage message", () => {
  const err = new ApiError("SERVICE_UNAVAILABLE", "Down for maintenance", {
    status: 503,
  });
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /temporarily unavailable/i);
});

test("error-mapping: maps LISTING_UNAVAILABLE to clear property status message", () => {
  const err = new ApiError("LISTING_UNAVAILABLE", "Listing unavailable");
  const msg = mapApiErrorToUserMessage(err);
  assert.match(msg, /not available for visits or inquiries/i);
});

test("error-mapping: maps VISIT_CONFLICT and DUPLICATE_ACTIVE_INQUIRY correctly", () => {
  const visitErr = new ApiError("VISIT_CONFLICT", "Conflict");
  assert.match(mapApiErrorToUserMessage(visitErr), /active visit request/i);

  const inqErr = new ApiError("DUPLICATE_ACTIVE_INQUIRY", "Duplicate inquiry");
  assert.match(mapApiErrorToUserMessage(inqErr), /active inquiry/i);
});
