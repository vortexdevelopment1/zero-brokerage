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
enforces this contract is introduced incrementally. Batch 02A classifies errors
once and formats canonical errors for new Step 05 routes while preserving the
Legacy Step 04 Compatibility Surface. Schema-validation normalization remains
Batch 02B work.

## Compatibility boundary and legacy dispatch

1. **Explicit Route Registration Declaration**: Legacy Step 04 compatibility is explicitly declared at route/module registration time via route configuration metadata (`compatibilitySurface: "step04-legacy"`). The Step 04 auth module (`registerAuthRoutes`) attaches this metadata automatically to all routes registered within its encapsulated scope.
2. **No URL-Prefix Matching**: The global error handler does not infer legacy behavior from URL prefixes (such as `/api/v1/auth/*`) or maintain a duplicated route-path registry.
3. **New Step 04 Routes**: Any new Step 04 routes must be registered via the Step 04 route registration mechanism (or carry the explicit route compatibility config) to receive the legacy envelope.
4. **Canonical Step 05 Default**: All new routes remain canonical Step 05 by default unless explicitly declared as a legacy compatibility surface.
5. **Path Independence**: `/api/v1/auth/*` is not a legacy compatibility rule. Future endpoints under `/api/v1/auth/*` outside the Step 04 registration scope receive the canonical Step 05 error contract.
6. **Internal Implementation Detail**: Compatibility metadata is strictly an internal routing concern (`FastifyContextConfig.compatibilitySurface`) and is never leaked as a public HTTP response header or JSON field.
