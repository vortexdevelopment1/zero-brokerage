# Canonical Step 05 Response and Error Contract

All **new externally consumed API endpoints** use these JSON contracts. The
Legacy Step 04 Compatibility Surface is intentionally excluded until its future
explicit migration; it is not an alternative format for new routes.

Single-resource success responses are:

```json
{
  "data": { "id": "listing-id", "status": "active" },
  "meta": { "requestId": "550e8400-e29b-41d4-a716-446655440000" }
}
```

Collections add the only public pagination representation:

```json
{
  "data": [],
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "pagination": { "nextCursor": null, "hasMore": false }
  }
}
```

`nextCursor` is opaque. Pagination limits, filters, and sort allowlists are
endpoint contracts and are not implemented in this batch.

Expected errors use this exact envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request contains invalid values.",
    "details": {
      "fields": [
        {
          "field": "email",
          "code": "INVALID_FORMAT",
          "message": "Enter a valid email address."
        }
      ]
    },
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "retryable": false
  }
}
```

`details` and `retryable` are optional. Field errors use public field paths and
stable field codes. Error codes are uppercase snake case and stable for
programmatic client handling, for example `BAD_REQUEST`, `UNAUTHORIZED`,
`FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`,
`RATE_LIMITED`, and `INTERNAL_SERVER_ERROR`.

Public messages are actionable but do not reveal stack traces, SQL, secrets,
OTP values, access tokens, provider credentials, unnecessary personal data, or
sensitive existence information. Internal and provider failures are mapped to
safe application-level errors. The centralized validation/error engine that
enforces this contract is introduced incrementally. Batch 02A established error
classification and formatting separation. Batch 02B establishes the Fastify
JSON Schema + Ajv transport validation engine for Step 05 routes while preserving
existing Step 04 Zod validation.

## Transport validation and error policy (Batch 02B)

1. **Transport vs. Business Validation**:
   - _Transport validation_ verifies structural conformance of incoming HTTP requests (types, formats, lengths, ranges, enums, required fields, and unexpected properties) using Fastify JSON Schema and Ajv.
   - _Business validation_ (state transitions, entity ownership, authorization rules, cross-entity constraints) remains exclusively within application and domain service layers.
2. **Strict Unexpected Properties**:
   - Objects intended to be strict must declare `additionalProperties: false`.
   - Global `removeAdditional: true` is disabled (`removeAdditional: false`). Unexpected properties are rejected with `UNEXPECTED_PROPERTY` rather than silently stripped.
3. **Body Type Strictness**:
   - Request bodies strictly disallow implicit type coercion (`coerceTypes: false`). Strings like `"123"` are rejected if the schema requires an integer.
4. **Query, Path, and Header Coercion**:
   - Query parameters, path parameters, and headers arrive over HTTP as strings. Controlled type coercion (`coerceTypes: true`) is enabled specifically for these parts to parse string inputs into declared primitive types (integers, booleans).
5. **Header Validation and Normalization**:
   - Header validation normalizes declared header property names and required lists to lower case during compilation for case-insensitive RFC matching.
   - HTTP transport headers represent an open protocol set populated by Node/Fastify (`Host`, `User-Agent`, `Accept`, `Connection`, proxy headers, etc.). To prevent undeclared transport headers from causing rejection when an endpoint defines a strict schema, the validator compiler normalizes the root header schema to permit open additional properties while strictly enforcing all declared header types, formats, enums, and required constraints.
   - Endpoint authors do not need to enumerate standard HTTP transport headers. Source schema objects remain immutable.
6. **Shared Schemas and `$ref` Resolution**:
   - Supports local document references (`#/$defs/...`), TypeScript/JavaScript imported schema objects, and Fastify's native `app.addSchema()` registry.
   - The custom validator compiler connects directly to Fastify's official `schemaController.compilersFactory.buildValidator(externalSchemas)`, ensuring external `$ref` references resolve across routes within their Fastify encapsulation scope.
   - No separate or domain-specific schema registry exists.
7. **HTTP 400 vs. 422 Distinction**:
   - `400 Bad Request` is returned for transport syntax/parsing failures that prevent request decoding (malformed JSON, empty body when required, transport errors).
   - `422 Unprocessable Content` is returned for requests that are syntactically valid JSON/HTTP but fail the declared endpoint schema (missing fields, wrong types, range/length violations, unknown properties).
8. **Validation Error Contract**:
   - Validation errors receive status code `422`, error code `VALIDATION_FAILED`, and message `"The request contains invalid values."`.
   - Field-level details are structured under `details: { fields: [...] }` with stable uppercase codes (`REQUIRED`, `UNEXPECTED_PROPERTY`, `INVALID_TYPE`, `INVALID_FORMAT`, `INVALID_ENUM`, `STRING_TOO_SHORT`, `STRING_TOO_LONG`, `VALUE_TOO_SMALL`, `VALUE_TOO_LARGE`, `ARRAY_TOO_SHORT`, `ARRAY_TOO_LONG`, `PATTERN_MISMATCH`).
9. **Sensitive Value Redaction**:
   - Input values for sensitive fields (passwords, tokens, OTPs, secrets, authorization headers) are never echoed or reflected in error messages or details.
10. **Step 04 Zod Coexistence**:

- Existing Step 04 authentication routes remain on Zod and continue returning the Legacy Step 04 error envelope during the compatibility window.

11. **Schema Compilation Failures**:
    - Malformed schemas, unsupported formats, or unresolved `$ref` references fail fast at application startup / route registration time (`app.ready()`), halting server boot to prevent deploying broken endpoints.
12. **Unified Error Pipeline Integration (Batch 02C)**:
    - All error sources—Fastify schema validation, transport parsing failures, application domain errors, database errors, and unmatched routes (404 via `setNotFoundHandler`)—flow through the single `classifyHttpError` classifier and format via `formatCanonicalHttpError` (or `formatLegacyStep04Error` for legacy-marked routes).
    - Concurrency conflicts (`CONCURRENCY_CONFLICT`, HTTP 503) explicitly set `retryable: true`.
    - Application-level `ValidationError` field details are structured into canonical `details.fields`.
    - Database error mapping shields all SQL statements, table names, constraint names, and column identifiers from public error responses.
13. **Rate Limiting Error Contract (Batch 05)**:
    - Rate limit violations return status `429 Too Many Requests` with canonical error code `RATE_LIMITED` and safe public message.
    - Rate-limited responses set `retryable: false` (immediate retries without waiting for the cooldown window are invalid).
    - When a cooldown window applies, the server emits the standard HTTP response header `Retry-After: <seconds>`.
    - Client requests that exceed quota do not expose internal counters, policy thresholds, or datastore internals in the error payload.

## Compatibility boundary and legacy dispatch

1. **Explicit Route Registration Declaration**: Legacy Step 04 compatibility is explicitly declared at route/module registration time via route configuration metadata (`compatibilitySurface: "step04-legacy"`). The Step 04 auth module (`registerAuthRoutes`) attaches this metadata automatically to all routes registered within its encapsulated scope.
2. **No URL-Prefix Matching**: The global error handler does not infer legacy behavior from URL prefixes (such as `/api/v1/auth/*`) or maintain a duplicated route-path registry.
3. **New Step 04 Routes**: Any new Step 04 routes must be registered via the Step 04 route registration mechanism (or carry the explicit route compatibility config) to receive the legacy envelope.
4. **Canonical Step 05 Default**: All new routes remain canonical Step 05 by default unless explicitly declared as a legacy compatibility surface.
5. **Path Independence**: `/api/v1/auth/*` is not a legacy compatibility rule. Future endpoints under `/api/v1/auth/*` outside the Step 04 registration scope receive the canonical Step 05 error contract.
6. **Internal Implementation Detail**: Compatibility metadata is strictly an internal routing concern (`FastifyContextConfig.compatibilitySurface`) and is never leaked as a public HTTP response header or JSON field.
