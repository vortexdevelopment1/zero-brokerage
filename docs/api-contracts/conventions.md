# HTTP API Conventions

## Versioning and compatibility

All externally consumed business APIs use the major-version path prefix
`/api/v1/...`. A breaking change requires a new major version or an approved,
documented migration strategy. Additive backward-compatible changes remain in
the current version. A deprecated endpoint must document its replacement and
removal timeline. Internal module interfaces are not HTTP API versions.

## Resource paths and methods

Use plural, noun-based collection paths and lowercase kebab-case multi-word
segments. Resource identifiers are path parameters; filtering, sorting, and
pagination are query parameters.

```text
GET    /api/v1/listings
GET    /api/v1/listings/:listingId
POST   /api/v1/listings
PATCH  /api/v1/listings/:listingId
```

`GET` is safe retrieval and must not mutate state. `POST` creates a resource or
performs a documented explicit command; it is not a generic substitute for
other methods. `PUT` is complete replacement where required, `PATCH` is a
partial update, and `DELETE` deletes or deactivates according to the resource
contract.

Command endpoints are permitted only where resource semantics are insufficient.
Each command must have its own authorization, validation, state-transition, and
idempotency contracts. This batch adds no command endpoints or domain routes.

## Status codes

Use `200` for successful retrieval/update, `201` for creation, `202` for
accepted asynchronous work, and `204` for a successful response without a
body. Use `400`, `401`, `403`, `404`, `409`, `422` (where adopted), `429`, and
`500` according to their standard meanings. Use `502`, `503`, or `504` for
appropriate upstream or availability failures. A failed business operation must
not be represented as `200` merely for client convenience.

## Request correlation

`X-Request-Id` is the canonical HTTP header; JSON contracts use `requestId`.
The API accepts a valid UUID supplied in `X-Request-Id` and otherwise generates
a UUID. It returns the effective value in the `X-Request-Id` response header
and in every standard response envelope. Structured request logs use Fastify's
request identifier and must not include sensitive values. Future async work
that is correlated to a request should carry this identifier as correlation
metadata, not as business data.

## Canonical adoption boundary

The shared canonical constructors and request-context plugin implement the Step
05 foundation. All **new externally consumed API endpoints** must use the
canonical success and error envelopes in [error-format.md](error-format.md).
New routes must not introduce an additional response or error envelope, and the
legacy Step 04 format is not an alternative for new routes.

Existing Step 04 authentication responses and its error handler are the **Legacy
Step 04 Compatibility Surface**. In Batch 02A, legacy compatibility is explicitly
declared at route/module registration time via route configuration metadata
(`compatibilitySurface: "step04-legacy"`), eliminating any path-based or
prefix-based matching. The global error handler inspects this route metadata rather
than maintaining a central route-path registry. Future endpoints under `/api/v1/auth/*`
that are not part of Step 04 automatically receive canonical Step 05 formatting.
Migration of legacy routes to canonical format is a future explicit task and must
not be silently mixed into an unrelated batch.

## Pagination boundary

Step 03 pagination types are internal application/persistence results. Public
HTTP routes must not return those types directly. A route that exposes a
collection adapts its internal result to the canonical HTTP representation:

```text
Step 03 internal pagination
  -> HTTP response adapter
  -> Step 05 meta.pagination { nextCursor, hasMore }
```

Clients only see `meta.pagination.nextCursor` and `meta.pagination.hasMore`.
The existing Step 03 field names and implementation remain internal and are not
renamed or duplicated by this contract.

## Operational health endpoint

`GET /health` is an operational health endpoint, not an externally consumed
business or resource API. It intentionally returns its existing health-specific
shape:

```json
{
  "status": "ok",
  "service": "zero-brokerage-api",
  "timestamp": "..."
}
```

It is intentionally outside the Canonical Step 05 business-response envelope
and must not be wrapped in `{ "data": ..., "meta": ... }`. Its shape is not a
general API response convention and must not be copied by business/resource
endpoints.

## Request validation foundation (Batch 02B)

All new Step 05 routes use Fastify JSON Schema with the shared Ajv compiler:

- **Body validation**: Strict types without implicit coercion (`coerceTypes: false`). Strict schemas reject unexpected fields (`additionalProperties: false`, `removeAdditional: false`).
- **Query and Path**: Controlled string-to-primitive coercion (`coerceTypes: true`).
- **Headers**: Controlled string coercion (`coerceTypes: true`). Normalized to lower case during compilation for case-insensitive RFC matching. Root header schemas permit undeclared HTTP transport headers without rejecting requests, while strictly enforcing declared header rules.
- **Shared Schemas**: Cross-route schema reuse via TypeScript schema imports, local `$defs`, and Fastify's native `app.addSchema()` registry via `schemaController.compilersFactory.buildValidator`.
- **HTTP Status Codes**: `400 Bad Request` for malformed transport input (e.g., malformed JSON syntax); `422 Unprocessable Content` for schema validation failures.
- **Step 04 Coexistence**: Step 04 identity routes remain on Zod and continue to pass through the legacy compatibility boundary.

## Request context and structured completion logging (Batch 03)

Every HTTP request is instrumented through the central request context plugin and lifecycle hooks:

### Standard request-context fields

The request context is accessible via `request.getContext()` and Fastify request decorators:

- `requestId`: The canonical request UUID (string).
- `method`: HTTP method in uppercase (`GET`, `POST`, `PATCH`, `DELETE`, etc.).
- `route`: The parameterized route pattern (e.g., `/api/v1/listings/:listingId`). Unmatched 404 routes evaluate safely to `"unmatched"`.
- `startTime`: Monotonic nanosecond start timestamp (`bigint`) captured at the `onRequest` hook via `process.hrtime.bigint()`.
- `durationMs`: Elapsed monotonic request duration in milliseconds (numeric float).
- `actorId`: Safe authenticated actor identifier (UUID) extracted from `request.user.id` when an authenticated user context is present; `null` otherwise.
- `agencyId`: Safe organization identifier (UUID) from `request.agencyId` when agency context is present; `null` otherwise.
- `errorCode`: Classified error code (`ApiErrorCode`) populated from `classifyHttpError(error).code` when a failure occurs; `null` otherwise.

### Structured completion log fields

On request completion (`onResponse` hook), Fastify emits exactly one structured completion record containing allowlisted metadata:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "route": "/api/v1/listings/:listingId",
  "statusCode": 200,
  "durationMs": 1.245,
  "actorId": "usr_9999",
  "agencyId": "ag_1234",
  "errorCode": "NOT_FOUND",
  "upstreamTimingMs": 42.5
}
```

Optional fields (`actorId`, `agencyId`, `errorCode`, `upstreamTimingMs`) are included only when available and safe. Upstream timing is logged only when an actual upstream timing measurement exists.

### Sensitive fields strictly excluded from logging

To ensure data security and compliance, the structured logging layer allowlists only safe metadata fields. The following sensitive data must NEVER be logged:

- OTP codes and verification tokens
- JWT access tokens and refresh tokens
- Payment secrets, client secrets, and webhook signing keys
- Passwords and credential hashes
- API keys
- Identity documents and biometric records
- Authorization headers and cookie contents
- Raw database error objects, constraint strings, SQL statements, and database connection strings
- Raw provider response payloads
- Unsanitized request bodies, query parameters, or header dumps

### Route pattern convention

To prevent high-cardinality log noise and avoid leaking sensitive parameter data, logs record the parameterized Fastify route pattern (`request.routeOptions.url`, such as `/api/v1/listings/:listingId`) rather than concrete resource identifiers. Unmatched paths fall back safely to `"unmatched"` without throwing.

### Request-ID relationship

The request ID generation and normalization path is centralized in `contracts.ts` via `createRequestId()`:

- A valid inbound UUID in `X-Request-Id` is preserved and normalized to lowercase.
- An absent or invalid inbound header generates a new random UUIDv4.
- The authoritative request ID is assigned to `request.id`, echoed in the `X-Request-Id` response header, returned in all canonical/legacy response envelopes, and attached to structured log records.

### Safe actor and organization context

Actor and organization contexts are never inferred from unauthenticated client headers or body fields. They are extracted exclusively from verified authentication/authorization middleware (`request.user.id`, `request.agencyId`). When absent, the fields are omitted from logs and set to `null` in context.

### Duration semantics

Duration is calculated monotonically using `process.hrtime.bigint()` captured in the `onRequest` hook and evaluated in the `onResponse` hook. Wall-clock timestamps (`Date.now()`) are never used for duration calculations to prevent skew from NTP adjustments.

## Collection pagination, filtering, and sorting (Batch 04)

### Pagination standards

All collection endpoints must use bounded keyset pagination:

- `DEFAULT_PAGE_LIMIT = 20`
- `MAX_PAGE_LIMIT = 100`
- `MIN_PAGE_LIMIT = 1`
- Next page is retrieved using an opaque Base64URL-encoded cursor token bound to query context (`queryContext`, `sortField`, `direction`, `tieBreakerField`).
- Canonical collection responses wrap records in `{ data: [...], meta: { requestId, pagination: { hasMore: boolean, nextCursor: string | null } } }`.

### Sorting allowlists

- Sorting parameters (`sortBy`, `sortOrder`) must be validated against explicit per-endpoint allowlists.
- Disallowed sort fields or invalid directions reject with `422 Unprocessable Content` (`INVALID_SORT`).
- Every sorted query must include a deterministic unique tie-breaker (`id`).

### Filtering allowlists

- Filtering queries (`field[operator]=value`) must match strictly declared filter specifications.
- Supported operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `like`, `between`.
- Disallowed fields or unsupported operators reject with `422 Unprocessable Content` (`INVALID_FILTER`).
- Array limits (e.g. `in` operator) are strictly enforced to prevent unbounded query allocations.

## Idempotent command APIs (Batch 04)

Sensitive mutating operations (POST commands, payment orders, reservations, state transitions) require idempotency protection:

- **Header**: `Idempotency-Key` (RFC draft standard). Must contain 16–128 alphanumeric characters, dashes, dots, or underscores.
- **Scope**: Keys are isolated per authenticated actor (`actor:userId`) and agency (`agency:agencyId:actor:userId`) to prevent cross-tenant key hijacking.
- **Fingerprint**: Deterministic SHA-256 hash computed over canonicalized method, route, parameters, query, and request body. Sensitive fields (passwords, tokens, OTPs, secrets) are redacted prior to hashing.
- **State Model**:
  - `IN_PROGRESS`: Transaction/operation is actively processing. Concurrent requests with the same key are rejected with `409 Conflict` (`IDEMPOTENCY_IN_PROGRESS`).
  - `COMPLETED`: Operation has finished. Exact retries replay the stored response status and payload with header `Idempotency-Replayed: true` and the _current_ request's `requestId`.
  - Mismatched Payload: Same key presented with a materially different payload is rejected with `409 Conflict` (`IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).

### Production persistence and transaction boundary

- **Production Store**: `PostgresIdempotencyStore` persists idempotency records in PostgreSQL table `idempotency_keys` with atomic `INSERT ... ON CONFLICT (scope, key)` claim semantics. The production application wires `app.idempotencyStore` directly to `PostgresIdempotencyStore` backed by the PostgreSQL pool; no silent fallback to `InMemoryIdempotencyStore` is permitted.
- **Pre-Transaction HTTP Hook**: `createIdempotencyHandler` performs non-transactional pre-checks: HTTP header parsing/validation, server-derived scope extraction, canonical fingerprint calculation, and completed replay verification. It attaches `request.idempotencyContext` containing the key, scope, fingerprint, and store to the request, without opening or holding a database connection.
- **Atomic Transaction Boundary**: The application command layer coordinates durable state using `withIdempotentTransaction(pool, context, async (tx) => ...)` or explicit `withTransaction`. Within the exact same PostgreSQL transaction:
  1. `claimKey({ ..., executor: tx })` atomically acquires the key or verifies existing state.
  2. Business mutations execute using the same `tx` executor.
  3. Outbox events are inserted using the same `tx` executor (`insertOutboxEvent`).
  4. `completeKey({ ..., executor: tx })` persists the HTTP status code and response payload.
  5. The transaction commits atomically.
- **Rollback Semantics**: If any business mutation fails or an exception is thrown, the entire transaction rolls back. Neither the idempotency claim, business mutation, nor outbox events persist, enabling safe subsequent retries.
- **Failure and Retry Lifecycle**: If an operation records `FAILED`, subsequent client requests with the matching fingerprint can safely reclaim the key (`IN_PROGRESS`) and advance it to `COMPLETED` upon successful execution.
- **Expiration and Lifecycle Reclamation**: Records expire after the specified TTL (default 24 hours, `expires_at`). Reclaiming an expired record atomically updates `created_at = NOW()` and `updated_at = NOW()`, resetting the logical lifecycle for the new idempotency operation.
- **Multi-Instance Concurrency**: Engine-level unique constraints (`uq_idempotency_scope_key`) and row-level locking prevent concurrent duplicate claims across horizontal API instances.
- **Test Double**: `InMemoryIdempotencyStore` is retained strictly for isolated unit-test doubles where explicit injection is requested; it is never used implicitly in production.
