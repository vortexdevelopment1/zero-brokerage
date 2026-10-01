import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildApp } from "../../app/build-app.js";
import { InMemoryIdempotencyStore } from "./idempotency/store.js";
import { InMemoryRateLimiter } from "../../modules/identity/rate-limiting/rate-limiter.js";

describe("Step 05 Batch 05: HTTP Security Baseline & Contract Hardening", () => {
  // =========================================================================
  // 1. SECURE RESPONSE HEADERS
  // =========================================================================
  describe("1. Secure HTTP Response Headers", () => {
    it("emits expected security headers on API responses", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
      });

      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      assert.equal(res.statusCode, 200);

      // Verify anti-MIME-sniffing
      assert.equal(res.headers["x-content-type-options"], "nosniff");

      // Verify clickjacking protection
      assert.equal(res.headers["x-frame-options"], "DENY");

      // Verify legacy XSS protection disabled (modern standard)
      assert.equal(res.headers["x-xss-protection"], "0");

      // Verify strict referrer policy
      assert.equal(res.headers["referrer-policy"], "no-referrer");

      // Verify no sensitive server banner leaks
      assert.equal(res.headers["server"], undefined);

      await app.close();
    });
  });

  // =========================================================================
  // 2. CORS POLICY
  // =========================================================================
  describe("2. Cross-Origin Resource Sharing (CORS) Policy", () => {
    it("permits allowed cross-origin requests and sets credentials", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        corsAllowedOrigins: [
          "https://admin.zerobrokerage.com",
          "https://zerobrokerage.com",
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: {
          origin: "https://admin.zerobrokerage.com",
        },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(
        res.headers["access-control-allow-origin"],
        "https://admin.zerobrokerage.com",
      );
      assert.equal(res.headers["access-control-allow-credentials"], "true");

      await app.close();
    });

    it("rejects unauthorized cross-origin requests by withholding CORS headers", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        corsAllowedOrigins: ["https://admin.zerobrokerage.com"],
      });

      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: {
          origin: "https://malicious-attacker.evil.com",
        },
      });

      // Browser security model: if Access-Control-Allow-Origin is not returned, the browser blocks access
      assert.equal(res.headers["access-control-allow-origin"], undefined);

      await app.close();
    });

    it("handles preflight OPTIONS requests for allowed origins", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        corsAllowedOrigins: ["https://zerobrokerage.com"],
      });

      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/v1/auth/request-otp",
        headers: {
          origin: "https://zerobrokerage.com",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,x-request-id",
        },
      });

      assert.equal(res.statusCode, 204);
      assert.equal(
        res.headers["access-control-allow-origin"],
        "https://zerobrokerage.com",
      );
      assert.equal(res.headers["access-control-allow-credentials"], "true");
      assert.ok(res.headers["access-control-allow-methods"]);

      await app.close();
    });

    it("allows non-browser requests without Origin header (mobile apps, server-to-server)", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        corsAllowedOrigins: ["https://admin.zerobrokerage.com"],
      });

      const res = await app.inject({
        method: "GET",
        url: "/health",
        // No Origin header
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["access-control-allow-origin"], undefined);

      await app.close();
    });
  });

  // =========================================================================
  // 3. REQUEST BODY LIMITS
  // =========================================================================
  describe("3. Request Body Size Bounds", () => {
    it("accepts JSON request payloads within the configured limit", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        bodyLimit: 1024 * 1024, // 1 MB
      });

      app.post("/api/v1/test-body-canonical", async () => ({ ok: true }));

      // 10 KB payload (well within 1 MB)
      const normalPayload = {
        name: "Test Normal Payload",
        note: "A".repeat(10240),
      };

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test-body-canonical",
        headers: { "content-type": "application/json" },
        payload: normalPayload,
      });

      assert.equal(res.statusCode, 200);

      await app.close();
    });

    it("rejects oversized request bodies with 413 PAYLOAD_TOO_LARGE and canonical error envelope", async () => {
      const smallLimitBytes = 1024; // 1 KB limit for testing
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        bodyLimit: smallLimitBytes,
      });

      app.post("/api/v1/test-body-canonical", async () => ({ ok: true }));

      // 5 KB payload (exceeds 1 KB limit)
      const oversizedPayload = {
        name: "Test Oversized Payload",
        data: "X".repeat(5120),
      };

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test-body-canonical",
        headers: { "content-type": "application/json" },
        payload: oversizedPayload,
      });

      assert.equal(res.statusCode, 413);
      const body = res.json();
      assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
      assert.equal(body.error.message, "The request payload is too large.");
      assert.ok(body.error.requestId);
      assert.equal(body.error.retryable, false);

      await app.close();
    });
  });

  // =========================================================================
  // 4. CONTENT-TYPE REJECTION
  // =========================================================================
  describe("4. Content-Type Media Handling", () => {
    it("rejects unsupported media types with 415 UNSUPPORTED_MEDIA_TYPE and canonical error envelope", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
      });

      app.post("/api/v1/test-body-canonical", async () => ({ ok: true }));

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/test-body-canonical",
        headers: {
          "content-type": "application/xml",
        },
        payload: "<request><test>sample xml payload</test></request>",
      });

      assert.equal(res.statusCode, 415);
      const body = res.json();
      assert.equal(body.error.code, "UNSUPPORTED_MEDIA_TYPE");
      assert.equal(
        body.error.message,
        "The request payload media type is not supported.",
      );
      assert.ok(body.error.requestId);
      assert.equal(body.error.retryable, false);

      await app.close();
    });
  });

  // =========================================================================
  // 5. PROXY TRUST & IP SECURITY
  // =========================================================================
  describe("5. Proxy Trust & IP Forwarding Protection", () => {
    it("ignores spoofed X-Forwarded-For headers when trustProxy is disabled (default)", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        trustProxy: false, // Default secure baseline
      });

      app.get("/api/v1/test-ip", async (request) => {
        return { ip: request.ip };
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test-ip",
        headers: {
          "x-forwarded-for": "203.0.113.195", // Spoofed IP header
        },
      });

      assert.equal(res.statusCode, 200);
      const body = res.json();
      // Must NOT be the spoofed 203.0.113.195
      assert.notEqual(body.ip, "203.0.113.195");
      // Fastify inject default remote address is 127.0.0.1
      assert.equal(body.ip, "127.0.0.1");

      await app.close();
    });

    it("respects X-Forwarded-For headers only when trustProxy is explicitly enabled", async () => {
      const app = await buildApp({
        logger: false,
        idempotencyStore: new InMemoryIdempotencyStore(),
        rateLimiter: new InMemoryRateLimiter(),
        trustProxy: true, // Configured behind trusted ingress / load balancer
      });

      app.get("/api/v1/test-ip", async (request) => {
        return { ip: request.ip };
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/test-ip",
        headers: {
          "x-forwarded-for": "203.0.113.195",
        },
      });

      assert.equal(res.statusCode, 200);
      const body = res.json();
      assert.equal(body.ip, "203.0.113.195");

      await app.close();
    });
  });
});
