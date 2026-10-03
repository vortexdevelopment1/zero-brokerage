# ADR 0007 — OpenAPI Documentation, Security Baseline, and Distributed Rate Limiting

## Status

Accepted

## Context

Step 05 Batches 01–04 established the HTTP canonical envelopes, Ajv validation compilers, request context with correlation tracking, keyset pagination, filtering, sorting, and PostgreSQL transactional idempotency.

Batch 05 completes the external HTTP interface hardening by addressing three foundational concerns:

1. **OpenAPI Documentation**: Programmatic OpenAPI 3.0 specification generation that accurately documents implemented endpoints without claiming un-implemented domain endpoints (e.g. `/listings`, `/leads`, `/payments`).
2. **HTTP Security Baseline**: Explicit HTTP transport constraints (CORS policies, security response headers, bounded body limits, content-type verification, proxy trust).
3. **Distributed Rate Limiting**: Multi-instance safe rate limiting for abuse prevention with policy-driven quotas, standard response headers, `Retry-After` calculation, and canonical error envelope integration.

## Decision 1: OpenAPI Generation and Accurate Route Representation

The OpenAPI specification is generated dynamically using `@fastify/swagger` and exposed over HTTP at `GET /api/v1/openapi.json`.

- The OpenAPI document strictly describes **only actually implemented routes** (operational `/health`, Step 04 authentication routes, account lifecycle routes).
- No placeholder or stub routes are added to the OpenAPI specification for future domain capabilities (listings, visits, payments, leads, etc.).
- Authentication requirements (HTTP Bearer JWT) are documented on protected routes via a standard `bearerAuth` security scheme.
- Canonical success metadata (`CanonicalSuccessMeta`), collection pagination (`CanonicalPaginationMeta`), and canonical error shapes (`CanonicalError`, `RateLimitExceededError`) are published in the OpenAPI `components/schemas` dictionary as reusable building blocks for Step 06+ canonical routes.
- Step 04 legacy routes reference dedicated compatibility schemas (`Step04LegacyError`, `Step04LegacyRateLimitError`) that accurately reflect runtime compatibility envelopes without falsely advertising the canonical Step 05 envelope.
- **Zod / OpenAPI Schema Parity Protection**: `@fastify/swagger` cannot automatically introspect Step 04 Zod route schemas because those routes perform validation imperatively within route handler bodies rather than declaring Fastify JSON Schemas on route options. OpenAPI request schemas are therefore declared in `swagger.ts` and protected by automated regression tests (`openapi.test.ts`) that strictly compare `auth-schemas.ts` against OpenAPI component schemas (property keys, required flags, primitive types, min/max lengths, and enum values) to prevent silent drift.
- Automated tests (`openapi.test.ts`) assert that every `$ref` resolves, all implemented routes exist in the spec, no fake routes exist, and the spec complies with OpenAPI 3.0.3.

## Decision 2: API Security Baseline Defaults

1. **Secure Response Headers**: Registered `@fastify/helmet` with an API-first configuration:
   - `contentSecurityPolicy: false` (APIs return JSON payloads rather than HTML).
   - `frameguard: { action: "deny" }` to prevent clickjacking in API consumers.
   - `xContentTypeOptions: true` (`nosniff`).
   - `referrerPolicy: { policy: "no-referrer" }`.
   - `hsts`: Enforced in production (`maxAge: 31536000`, `includeSubDomains: true`).
2. **TLS / HTTPS Enforcement**:
   - TLS/HTTPS termination and enforcement are handled exclusively at the reverse proxy/ingress edge (e.g. AWS ALB, Cloudflare). Application-level redirects are intentionally omitted to avoid proxy redirect loops and unneeded runtime complexity.
3. **CORS Policy**: Configured `@fastify/cors` with environment-validated origins:
   - Production forbids wildcard origins with credentials (`origin: '*' && credentials: true` is strictly prohibited).
   - Allowed origins are configured via `CORS_ALLOWED_ORIGINS` (comma-separated).
   - Non-browser clients (mobile apps, server-to-server curl) omitting `Origin` headers are permitted.
4. **Request Body Size Limits**:
   - Fastify's root `bodyLimit` is bounded by `MAX_BODY_LIMIT_BYTES` (default: 1,048,576 bytes / 1 MB).
   - Oversized payloads trigger HTTP `413 Payload Too Large` with canonical error code `PAYLOAD_TOO_LARGE`.
5. **Content-Type Media Handling**:
   - Fastify's parser rejects unsupported media types with HTTP `415 Unsupported Media Type` (`UNSUPPORTED_MEDIA_TYPE`).
6. **Proxy Trust**:
   - `trustProxy` defaults to `false`. Forwarded headers (`X-Forwarded-For`, `X-Forwarded-Proto`) are ignored unless explicitly configured via `TRUST_PROXY` for deployment behind verified reverse proxies.

## Decision 3: Multi-Instance Distributed Rate Limiting

1. **Storage and Concurrency**:
   - Production rate limiting strictly uses the approved distributed Redis store (`RedisRateLimiter` with atomic sliding-window Lua script).
   - In-memory rate limiting is permitted only for isolated unit test doubles or non-production fallback.
   - **Testing Strategy**: Multi-instance atomic synchronization is verified deterministically in CI via `MockSharedRedisClient`. In addition, an environment-conditional integration test verifies cross-instance quota coordination against a real Redis backend when `REDIS_URL` is configured.
2. **Rate Limiting Mechanisms: Step 04 Service-Level vs Step 05 HTTP PreHandler**:
   - Existing Step 04 identity routes enforce rate limits inside `AuthService` via `assertRateLimit(...)` and return Step 04 legacy error envelopes (`Step04LegacyRateLimitError`) without `RateLimit-*` headers, preserving the Step 04 compatibility boundary.
   - Step 05 establishes a reusable HTTP preHandler hook (`createRateLimitHandler`) and policy catalog (`RATE_LIMIT_POLICIES`) for new and upcoming canonical routes, returning standard `RateLimit-*` headers and canonical error envelopes (`RateLimitExceededError`).
3. **Reusable Policy Model**:
   - Rate limit configurations are abstracted into `RateLimitPolicy`:
     - `id`: Unique identifier (e.g. `auth:request-otp`, `auth:verify-otp`, `auth:refresh`).
     - `maxRequests`: Maximum number of requests allowed within the window.
     - `windowSeconds`: Cooldown window duration.
     - `scopeStrategy`: Key extraction strategy (`ip`, `actor`, `agency_actor`, or `custom`).
     - `enabled`: Dynamic toggle.
     - `errorMessage`: Public-safe rejection message.
4. **Identity Security and Anti-Spoofing**:
   - Actor scopes extract identity exclusively from verified authentication middleware (`request.user.id`). Client-provided headers (`X-User-Id`, etc.) are never trusted.
   - IP scopes use `request.ip`, which respects the verified `trustProxy` setting.
5. **Standard Headers and 429 Contract**:
   - HTTP rate-limited routes emit `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.
   - Exhausted quotas return HTTP `429 Too Many Requests` with canonical error code `RATE_LIMITED`, `retryable: false` (as locked by ADR 0006 for non-concurrency errors), and an accurate `Retry-After: <seconds>` HTTP response header.
   - Rate-limit violations flow through the unified error-classification pipeline (`classifyHttpError` -> `error-handler.ts`). No internal counters or Redis state are leaked.
