import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { randomUUID } from "node:crypto";

import { buildApp } from "../../app/build-app.js";
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  STEP04_LEGACY_COMPATIBILITY_CONFIG,
  STEP05_CANONICAL_COMPATIBILITY_CONFIG,
  createCanonicalSuccessResponse,
} from "./contracts.js";
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors/index.js";
import { type RequestCompletionLog } from "../../plugins/request-context.js";

/**
 * Creates a stream that captures structured JSON log entries emitted by Pino.
 */
function createLogCaptureStream() {
  const records: any[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const lines = chunk.toString().trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          records.push(JSON.parse(line));
        } catch {
          // ignore any non-JSON chunk
        }
      }
      callback();
    },
  });
  return { stream, records };
}

function findCompletionLogs(records: any[]): RequestCompletionLog[] {
  return records.filter((r) => r.msg === "request completed");
}

function getFirstCompletionLog(records: any[]): RequestCompletionLog {
  const logs = findCompletionLogs(records);
  assert.ok(logs.length > 0, "Expected at least one request completion log");
  return logs[0]!;
}

describe("Batch 03 — HTTP Infrastructure & Request Context", () => {
  // ===========================================================================
  // SUITE A: REQUEST CONTEXT
  // ===========================================================================
  describe("Suite A: Request Context Preservation and Extraction", () => {
    it("A.1 preserves inbound valid UUID X-Request-Id header", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const inboundId = randomUUID().toLowerCase();

      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { [REQUEST_ID_HEADER]: inboundId },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers[REQUEST_ID_HEADER], inboundId);

      const log = getFirstCompletionLog(records);
      assert.equal(log.requestId, inboundId);
      await app.close();
    });

    it("A.2 generates a fresh UUIDv4 request ID when inbound header is missing", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      assert.equal(res.statusCode, 200);
      const generatedId = res.headers[REQUEST_ID_HEADER] as string;
      assert.ok(REQUEST_ID_PATTERN.test(generatedId));

      const log = getFirstCompletionLog(records);
      assert.equal(log.requestId, generatedId);
      await app.close();
    });

    it("A.3 normalizes uppercase inbound UUID to canonical lowercase", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const upperId = randomUUID().toUpperCase();

      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { [REQUEST_ID_HEADER]: upperId },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers[REQUEST_ID_HEADER], upperId.toLowerCase());

      const log = getFirstCompletionLog(records);
      assert.equal(log.requestId, upperId.toLowerCase());
      await app.close();
    });

    it("A.4 canonical response envelope reflects request ID", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const inboundId = randomUUID();

      app.get(
        "/api/v1/test-canonical-ctx",
        { config: STEP05_CANONICAL_COMPATIBILITY_CONFIG },
        async (req) => {
          return createCanonicalSuccessResponse({ item: "value" }, req.id);
        },
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test-canonical-ctx",
        headers: { [REQUEST_ID_HEADER]: inboundId },
      });

      assert.equal(res.statusCode, 200);
      const json = res.json();
      assert.equal(json.meta.requestId, inboundId);
      assert.equal(res.headers[REQUEST_ID_HEADER], inboundId);

      const log = getFirstCompletionLog(records);
      assert.equal(log.requestId, inboundId);
      await app.close();
    });

    it("A.5 legacy response envelope reflects request ID", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const inboundId = randomUUID();

      app.get(
        "/api/v1/test-legacy-ctx",
        { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
        async () => {
          throw new BadRequestError("Legacy error message");
        },
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test-legacy-ctx",
        headers: { [REQUEST_ID_HEADER]: inboundId },
      });

      assert.equal(res.statusCode, 400);
      const json = res.json();
      assert.equal(json.error.requestId, inboundId);
      assert.equal(res.headers[REQUEST_ID_HEADER], inboundId);

      const log = getFirstCompletionLog(records);
      assert.equal(log.requestId, inboundId);
      await app.close();
    });

    it("A.6 req.getContext() returns isolated and accurate snapshot", async () => {
      const { stream } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const inboundId = randomUUID();

      let contextSnapshot: any = null;

      app.get("/api/v1/test-get-context/:id", async (req) => {
        contextSnapshot = req.getContext();
        return { ok: true };
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test-get-context/sample-123",
        headers: { [REQUEST_ID_HEADER]: inboundId },
      });

      assert.equal(res.statusCode, 200);
      assert.ok(contextSnapshot);
      assert.equal(contextSnapshot.requestId, inboundId);
      assert.equal(contextSnapshot.method, "GET");
      assert.equal(contextSnapshot.route, "/api/v1/test-get-context/:id");
      assert.equal(typeof contextSnapshot.durationMs, "number");
      assert.ok(contextSnapshot.durationMs >= 0);
      assert.equal(contextSnapshot.actorId, null);
      assert.equal(contextSnapshot.agencyId, null);
      assert.equal(contextSnapshot.errorCode, null);
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE B: STRUCTURED COMPLETION LOGGING
  // ===========================================================================
  describe("Suite B: Structured Request Completion Logging", () => {
    it("B.1 logs single structured completion for 200 OK request", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      assert.equal(res.statusCode, 200);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.ok(REQUEST_ID_PATTERN.test(log.requestId));
      assert.equal(log.method, "GET");
      assert.equal(log.route, "/health");
      assert.equal(log.statusCode, 200);
      assert.equal(typeof log.durationMs, "number");
      assert.ok(log.durationMs >= 0);
      assert.equal(log.errorCode, undefined);
      await app.close();
    });

    it("B.2 logs single structured completion for 4xx client error with error code", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      app.get("/api/v1/items/:id", async () => {
        throw new NotFoundError("Item not found");
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/items/item-999",
      });

      assert.equal(res.statusCode, 404);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.method, "GET");
      assert.equal(log.route, "/api/v1/items/:id");
      assert.equal(log.statusCode, 404);
      assert.equal(log.errorCode, "NOT_FOUND");
      assert.equal(typeof log.durationMs, "number");
      await app.close();
    });

    it("B.3 logs single structured completion for 422 validation failure", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      app.post(
        "/api/v1/users",
        {
          schema: {
            body: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string" },
              },
            },
          },
        },
        async () => ({ ok: true }),
      );

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/users",
        payload: {}, // Missing required email
      });

      assert.equal(res.statusCode, 422);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.method, "POST");
      assert.equal(log.route, "/api/v1/users");
      assert.equal(log.statusCode, 422);
      assert.equal(log.errorCode, "VALIDATION_FAILED");
      assert.equal(typeof log.durationMs, "number");
      await app.close();
    });

    it("B.4 logs single structured completion for 500 internal server error", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      app.get("/api/v1/unhandled-crash", async () => {
        throw new Error("Simulated unhandled internal crash");
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/unhandled-crash",
      });

      assert.equal(res.statusCode, 500);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.method, "GET");
      assert.equal(log.route, "/api/v1/unhandled-crash");
      assert.equal(log.statusCode, 500);
      assert.equal(log.errorCode, "INTERNAL_SERVER_ERROR");
      assert.equal(typeof log.durationMs, "number");
      await app.close();
    });

    it("B.5 logs single structured completion for 404 unmatched route", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/completely-unknown-route",
      });

      assert.equal(res.statusCode, 404);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.method, "GET");
      assert.equal(log.route, "unmatched");
      assert.equal(log.statusCode, 404);
      assert.equal(log.errorCode, "NOT_FOUND");
      await app.close();
    });

    it("B.6 captures safe actor reference when authenticated actor is present", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const mockUserId = randomUUID();
      app.get(
        "/api/v1/profile",
        {
          preHandler: async (req) => {
            req.user = {
              id: mockUserId,
              phone: "+919876543210",
              role: "USER" as any,
              status: "ACTIVE" as any,
              sessionId: randomUUID(),
            };
          },
        },
        async () => ({ profile: "active" }),
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/profile",
      });

      assert.equal(res.statusCode, 200);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.actorId, mockUserId);
      await app.close();
    });

    it("B.7 captures safe agency reference when present", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const mockAgencyId = randomUUID();
      app.get(
        "/api/v1/agency-resource",
        {
          preHandler: async (req) => {
            req.agencyId = mockAgencyId;
          },
        },
        async () => ({ agency: "active" }),
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/agency-resource",
      });

      assert.equal(res.statusCode, 200);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.agencyId, mockAgencyId);
      await app.close();
    });

    it("B.8 captures upstream timing only when actual upstream timing is present", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      app.get(
        "/api/v1/upstream-timed",
        {
          preHandler: async (req) => {
            req.upstreamTimingMs = 42.5;
          },
        },
        async () => ({ ok: true }),
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/upstream-timed",
      });

      assert.equal(res.statusCode, 200);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.upstreamTimingMs, 42.5);
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE C: ROUTE IDENTIFICATION
  // ===========================================================================
  describe("Suite C: Route Identification Semantics", () => {
    it("C.1 logs parameterized route pattern, not raw URL with concrete resource ID", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const concreteId = "550e8400-e29b-41d4-a716-446655440000";
      app.get("/api/v1/listings/:listingId", async (req) => ({
        id: (req.params as any).listingId,
      }));

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/listings/${concreteId}`,
      });

      assert.equal(res.statusCode, 200);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.route, "/api/v1/listings/:listingId");
      assert.notEqual(log.route, `/api/v1/listings/${concreteId}`);
      await app.close();
    });

    it("C.2 unknown route falls back safely to 'unmatched' without throwing", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const res = await app.inject({
        method: "GET",
        url: "/random/unregistered/route/path?query=123",
      });

      assert.equal(res.statusCode, 404);
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);

      const log = completionLogs[0]!;
      assert.equal(log.route, "unmatched");
      assert.equal(log.method, "GET");
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE D: SECURITY & SENSITIVE DATA REDACTION
  // ===========================================================================
  describe("Suite D: Security & Sensitive Data Redaction in Logging", () => {
    it("D.1 strictly excludes tokens, passwords, OTPs, API keys, and authorization headers from logs", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const secretToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload";
      const secretPassword = "SuperSensitivePassword999#";
      const secretOtp = "847291";
      const secretApiKey = "sk_live_9876543210abcdef";
      const secretPaymentSecret = "whsec_superSecretWebhookSigningKey";
      const dbConnectionString =
        "postgres://admin:secretPass@localhost:5432/main";
      const sqlQuery = "SELECT * FROM users WHERE password = 'secret'";

      app.post("/api/v1/sensitive-action", async () => {
        // Intentionally throw validation error with classified details
        throw new ValidationError("Invalid action", [
          {
            field: "amount",
            message: "Amount must be positive",
            code: "INVALID_AMOUNT",
          },
        ]);
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/sensitive-action",
        headers: {
          authorization: `Bearer ${secretToken}`,
          "x-api-key": secretApiKey,
          cookie: `session_token=${secretToken}; other=123`,
        },
        payload: {
          password: secretPassword,
          otp: secretOtp,
          paymentSecret: secretPaymentSecret,
          dbUrl: dbConnectionString,
          sql: sqlQuery,
        },
      });

      assert.equal(res.statusCode, 422);

      // Inspect ALL emitted log records across the entire lifecycle
      for (const record of records) {
        const serialized = JSON.stringify(record);

        assert.ok(
          !serialized.includes(secretToken),
          "Must not leak bearer or session token",
        );
        assert.ok(
          !serialized.includes(secretPassword),
          "Must not leak password",
        );
        assert.ok(!serialized.includes(secretOtp), "Must not leak OTP");
        assert.ok(!serialized.includes(secretApiKey), "Must not leak API key");
        assert.ok(
          !serialized.includes(secretPaymentSecret),
          "Must not leak payment secret",
        );
        assert.ok(
          !serialized.includes(dbConnectionString),
          "Must not leak DB connection string",
        );
        assert.ok(!serialized.includes(sqlQuery), "Must not leak SQL query");
      }

      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      const comp = completionLogs[0]!;
      assert.equal(comp.statusCode, 422);
      assert.equal(comp.errorCode, "VALIDATION_FAILED");
      assert.equal((comp as any).body, undefined);
      assert.equal((comp as any).headers, undefined);
      assert.equal((comp as any).query, undefined);
      await app.close();
    });

    it("D.2 unhandled 500 error does not leak database credentials or raw database error objects", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const internalLeakText = "CRITICAL_DATABASE_VAULT_PASSWORD_XYZZY";
      app.get("/api/v1/db-crash", async () => {
        const error = new Error(
          `Connection failed: postgres://user:${internalLeakText}@db:5432`,
        );
        throw error;
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/db-crash",
      });

      assert.equal(res.statusCode, 500);

      // Verify the completion log does NOT contain the raw error string
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      const comp = completionLogs[0]!;
      assert.equal(comp.statusCode, 500);
      assert.equal(comp.errorCode, "INTERNAL_SERVER_ERROR");
      assert.ok(!JSON.stringify(comp).includes(internalLeakText));
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE E: ERROR PIPELINE INTEGRATION
  // ===========================================================================
  describe("Suite E: Error Pipeline Integration", () => {
    it("E.1 canonical errors retain standard canonical envelope while logging errorCode", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const reqId = randomUUID();

      app.get(
        "/api/v1/conflict-check",
        { config: STEP05_CANONICAL_COMPATIBILITY_CONFIG },
        async () => {
          throw new ConflictError("Entity state conflict");
        },
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/conflict-check",
        headers: { [REQUEST_ID_HEADER]: reqId },
      });

      assert.equal(res.statusCode, 409);
      assert.deepEqual(res.json(), {
        error: {
          code: "CONFLICT",
          message: "Entity state conflict",
          requestId: reqId,
        },
      });

      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      assert.equal(completionLogs[0]!.statusCode, 409);
      assert.equal(completionLogs[0]!.errorCode, "CONFLICT");
      await app.close();
    });

    it("E.2 Step 04 legacy errors retain legacy envelope while logging errorCode", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });
      const reqId = randomUUID();

      app.get(
        "/api/v1/auth/legacy-fail",
        { config: STEP04_LEGACY_COMPATIBILITY_CONFIG },
        async () => {
          throw new UnauthorizedError("Session expired");
        },
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/legacy-fail",
        headers: { [REQUEST_ID_HEADER]: reqId },
      });

      assert.equal(res.statusCode, 401);
      const json = res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "UNAUTHORIZED");
      assert.equal(json.error.message, "Session expired");
      assert.equal(json.error.requestId, reqId);
      assert.ok(json.error.timestamp);

      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      assert.equal(completionLogs[0]!.statusCode, 401);
      assert.equal(completionLogs[0]!.errorCode, "UNAUTHORIZED");
      await app.close();
    });

    it("E.3 retryable concurrency error maintains retryable: true and logs CONCURRENCY_CONFLICT", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      app.get("/api/v1/concurrency-fail", async () => {
        throw new AppError(
          503,
          "CONCURRENCY_CONFLICT",
          "A concurrency conflict occurred.",
        );
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/concurrency-fail",
      });

      assert.equal(res.statusCode, 503);
      const json = res.json();
      assert.equal(json.error.code, "CONCURRENCY_CONFLICT");
      assert.equal(json.error.retryable, true);

      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      assert.equal(completionLogs[0]!.statusCode, 503);
      assert.equal(completionLogs[0]!.errorCode, "CONCURRENCY_CONFLICT");
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE F: CONCURRENCY & REQUEST ISOLATION
  // ===========================================================================
  describe("Suite F: Concurrency and Request Isolation", () => {
    it("F.1 ensures simultaneous parallel requests maintain 100% isolated request context without bleeding", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const REQUEST_COUNT = 30;
      const requestSpecs = Array.from({ length: REQUEST_COUNT }, (_, i) => ({
        id: randomUUID().toLowerCase(),
        actorId: randomUUID(),
        delayMs: (i % 5) * 5, // Stagger processing time
        param: `item-${i}`,
      }));

      app.get("/api/v1/concurrent-test/:param", async (req) => {
        const actorId = (req.headers["x-test-actor"] as string) || undefined;
        if (actorId) {
          req.user = {
            id: actorId,
            phone: "+919999999999",
            role: "USER" as any,
            status: "ACTIVE" as any,
            sessionId: randomUUID(),
          };
        }
        const delay = Number(req.headers["x-test-delay"] || 0);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const ctx = req.getContext();
        return {
          echoReqId: req.id,
          ctxReqId: ctx.requestId,
          actorId: ctx.actorId,
        };
      });

      // Fire all requests concurrently
      const responses = await Promise.all(
        requestSpecs.map((spec) =>
          app.inject({
            method: "GET",
            url: `/api/v1/concurrent-test/${spec.param}`,
            headers: {
              [REQUEST_ID_HEADER]: spec.id,
              "x-test-actor": spec.actorId,
              "x-test-delay": String(spec.delayMs),
            },
          }),
        ),
      );

      // Verify every response received strictly its own data
      for (let i = 0; i < REQUEST_COUNT; i++) {
        const spec = requestSpecs[i]!;
        const res = responses[i]!;

        assert.equal(res.statusCode, 200);
        assert.equal(res.headers[REQUEST_ID_HEADER], spec.id);

        const body = res.json();
        assert.equal(body.echoReqId, spec.id);
        assert.equal(body.ctxReqId, spec.id);
        assert.equal(body.actorId, spec.actorId);
      }

      // Verify every completion log record has strictly isolated actorId and requestId
      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, REQUEST_COUNT);

      const logsByReqId = new Map(
        completionLogs.map((log) => [log.requestId, log]),
      );
      for (const spec of requestSpecs) {
        const log = logsByReqId.get(spec.id);
        assert.ok(log, `Log missing for requestId: ${spec.id}`);
        assert.equal(log.actorId, spec.actorId);
        assert.equal(log.route, "/api/v1/concurrent-test/:param");
        assert.equal(log.statusCode, 200);
      }

      await app.close();
    });
  });

  // ===========================================================================
  // SUITE G: HEALTH ENDPOINT INVARIANCE
  // ===========================================================================
  describe("Suite G: /health Operational Endpoint Invariance", () => {
    it("G.1 /health remains raw operational response and emits single structured completion log", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      assert.equal(res.statusCode, 200);
      const json = res.json();
      assert.equal(json.status, "ok");
      assert.equal(json.service, "zero-brokerage-api");
      assert.ok(json.timestamp);
      assert.equal(json.data, undefined); // NOT inside canonical business envelope
      assert.equal(json.meta, undefined);

      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      assert.equal(completionLogs[0]!.route, "/health");
      assert.equal(completionLogs[0]!.method, "GET");
      assert.equal(completionLogs[0]!.statusCode, 200);
      await app.close();
    });
  });

  // ===========================================================================
  // SUITE H: ALREADY-SENT RESPONSE REGRESSION
  // ===========================================================================
  describe("Suite H: Already-Sent Response Guard Resilience", () => {
    it("H.1 ensures error handler does not re-send if reply.sent is already true", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      let sendAttempted = false;
      const fakeReq: any = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        log: app.log,
      };
      const fakeReply: any = {
        sent: true,
        status() {
          sendAttempted = true;
          return this;
        },
        send() {
          sendAttempted = true;
          return this;
        },
      };

      // Directly invoke error handler when reply has already been sent
      app.errorHandler(
        new Error("Late asynchronous failure"),
        fakeReq,
        fakeReply,
      );

      assert.equal(
        sendAttempted,
        false,
        "Must not attempt reply.status().send() when reply.sent is true",
      );

      const warnLogs = records.filter(
        (r) =>
          r.msg &&
          r.msg.includes("Reply already sent; skipping error handling"),
      );
      assert.equal(warnLogs.length, 1);
      assert.equal(
        warnLogs[0].requestId,
        "550e8400-e29b-41d4-a716-446655440000",
      );

      await app.close();
    });

    it("H.2 ensures normal response with manual reply.send() emits single completion record without second-response failure", async () => {
      const { stream, records } = createLogCaptureStream();
      const app = await buildApp({ logger: { level: "info", stream } });

      app.get("/api/v1/manual-send", async (req, reply) => {
        return reply.status(200).send({ initial: "sent" });
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/manual-send",
      });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { initial: "sent" });

      const completionLogs = findCompletionLogs(records);
      assert.equal(completionLogs.length, 1);
      assert.equal(completionLogs[0]!.statusCode, 200);
      assert.equal(completionLogs[0]!.route, "/api/v1/manual-send");
      await app.close();
    });
  });
});
