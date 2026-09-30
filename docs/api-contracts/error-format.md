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
enforces this contract is Batch 02 work.
