# Standardized Error Format

## Purpose
Defines the uniform error payload structure returned by all Zero Brokerage APIs.

## Schema

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload contains invalid values.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ],
    "timestamp": "2026-09-17T12:00:00.000Z",
    "requestId": "req-abc-123"
  }
}
```

## Standard Error Codes
* `BAD_REQUEST` (400)
* `UNAUTHORIZED` (401)
* `FORBIDDEN` (403)
* `NOT_FOUND` (404)
* `CONFLICT` (409)
* `VALIDATION_FAILED` (422)
* `RATE_LIMITED` (429)
* `INTERNAL_SERVER_ERROR` (500)
