# Step 05 — API Contracts, HTTP Conventions, Validation, and Error Handling

## 1. Purpose

This step defines the HTTP API implementation contract for the Zero Brokerage backend.

The objective is to create a predictable, secure, versionable, and developer-friendly REST API that can be consumed by:

- User Mobile App.
- Broker Mobile App.
- Super Admin Panel.
- Public Website.
- Future Agency Web Portal.
- Approved internal jobs or operational tools.

The API must expose business capabilities through stable contracts while keeping business rules inside the shared backend.

---

## 2. API Architecture Baseline

The API must use:

- Fastify.
- TypeScript.
- RESTful HTTP endpoints.
- JSON request and response bodies where applicable.
- JSON Schema validation.
- Ajv-compatible validation.
- Consistent authentication and authorization hooks.
- Centralized error handling.
- OpenAPI documentation.
- Request correlation identifiers.
- Structured logging.
- Bounded pagination for collection endpoints.

The API must not expose internal database structures directly.

Routes should call application services or module-level use cases rather than implementing complex business rules inside route handlers.

---

## 3. API Versioning

The team must establish and document one consistent versioning strategy.

The initial implementation should use a clear major-version boundary, such as:

```text
/api/v1/...
```

Versioning rules:

- Every externally consumed business API must belong to a documented version.
- Breaking changes require a new version or an approved migration strategy.
- Additive, backward-compatible changes may remain within the same version.
- Deprecated endpoints must have a documented replacement and removal timeline.
- Versioning must apply consistently across mobile, web, and administrative APIs.
- Internal module interfaces must not be confused with public HTTP API versions.

Do not introduce multiple versioning styles without a documented reason.

---

## 4. URL and Resource Naming

Use consistent, predictable resource names.

Recommended principles:

- Use nouns for resource paths.
- Use plural resource names for collections.
- Use kebab-case for multi-word path segments.
- Use path parameters for resource identifiers.
- Use query parameters for filtering, sorting, and pagination.
- Avoid action verbs unless the operation represents a domain command that cannot be expressed clearly as a resource operation.

Examples:

```text
GET    /api/v1/listings
GET    /api/v1/listings/:listingId
POST   /api/v1/listings
PATCH  /api/v1/listings/:listingId
DELETE /api/v1/listings/:listingId
POST   /api/v1/listings/:listingId/submit-review
POST   /api/v1/visits/:visitId/cancel
```

Command-style endpoints must still have documented authorization, validation, state-transition, and idempotency behavior.

---

## 5. HTTP Method Semantics

Use HTTP methods consistently:

- `GET` for safe retrieval.
- `POST` for creation or explicit commands.
- `PUT` for complete replacement where required.
- `PATCH` for partial updates.
- `DELETE` for deletion or deactivation according to the resource contract.

Do not use `GET` for operations that mutate state.

Do not use `POST` as a generic substitute for every operation without documenting why.

The API must return appropriate HTTP status codes while preserving the shared error format.

---

## 6. Standard Response Envelope

The team must define and use a consistent response convention.

A successful single-resource response may follow a structure similar to:

```json
{
  "data": {
    "id": "resource-id",
    "status": "active"
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

A successful collection response may follow a structure similar to:

```json
{
  "data": [],
  "meta": {
    "requestId": "request-id",
    "pagination": {
      "nextCursor": null,
      "hasMore": false
    }
  }
}
```

The exact envelope must be finalized in the repository API-contract documentation and applied consistently.

Do not expose internal ORM models, database column names, provider payloads, or internal error stacks.

---

## 7. Error Response Contract

All expected API errors must use the shared error format.

A representative structure is:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": {},
    "requestId": "request-id"
  }
}
```

The final error contract must define:

- Error code format.
- Public message rules.
- Optional details structure.
- Request or correlation identifier.
- Field-level validation errors.
- Retryability metadata where appropriate.
- Localization strategy if introduced.
- Security-sensitive error masking rules.

Error codes must be stable enough for clients to handle programmatically.

Messages must not expose:

- Stack traces.
- SQL statements.
- Secrets.
- OTP values.
- Access tokens.
- Internal provider credentials.
- Sensitive existence information.
- Unnecessary personal data.

---

## 8. HTTP Status Code Conventions

The API should use status codes consistently.

Typical mappings include:

- `200 OK` — successful retrieval or update.
- `201 Created` — successful resource creation.
- `202 Accepted` — asynchronous processing accepted.
- `204 No Content` — successful operation without a response body.
- `400 Bad Request` — malformed or invalid request.
- `401 Unauthorized` — missing or invalid authentication.
- `403 Forbidden` — authenticated but not permitted.
- `404 Not Found` — resource not found or intentionally hidden.
- `409 Conflict` — state or uniqueness conflict.
- `422 Unprocessable Entity` — semantically invalid input where adopted by the API convention.
- `429 Too Many Requests` — rate limit exceeded.
- `500 Internal Server Error` — unexpected server failure.
- `502/503/504` — appropriately mapped upstream or availability failure.

The team must avoid returning `200` for failed business operations merely to simplify client handling.

---

## 9. Request Validation

Every externally supplied request must be validated.

Validation must cover:

- Path parameters.
- Query parameters.
- Headers where applicable.
- Request body.
- Content type.
- Required fields.
- Field types.
- String lengths.
- Numeric ranges.
- Enum values.
- Array sizes.
- Nested object structure.
- Date and time formats.
- Identifier formats.
- File metadata where uploads are supported.

Validation must reject unexpected fields when strict validation is required for the endpoint.

Validation schemas must be maintained close to the relevant route or module contract and reused where appropriate.

---

## 10. Business Validation

Schema validation is not sufficient to enforce business correctness.

Application and domain validation must handle:

- Ownership.
- Role and permission requirements.
- Broker verification state.
- Agency membership.
- Listing lifecycle.
- Visit state transitions.
- Lead assignment rules.
- Review eligibility.
- Subscription entitlements.
- Inventory availability.
- Payment state.
- Transaction state.
- Duplicate requests.
- Time-window restrictions.
- Cross-resource invariants.

The API must distinguish malformed input from validly shaped input that violates a business rule.

---

## 11. Authentication and Authorization Integration

Protected routes must use the shared authentication and authorization foundation.

Each route contract must explicitly document:

- Whether authentication is required.
- Which roles may access the route.
- Whether agency context is required.
- Whether resource ownership is required.
- Whether broker verification is required.
- Whether an entitlement is required.
- Whether step-up authentication is required.
- Whether the operation must be audited.
- Whether an idempotency key is required.

Never authorize an operation using role or ownership values supplied by the client.

---

## 12. Pagination Contract

All potentially large collections must use a standardized pagination contract.

The team must finalize:

- Default page size.
- Maximum page size.
- Cursor or offset strategy.
- Sort field.
- Sort direction.
- Stable tie-breaker.
- Filter encoding.
- Invalid-cursor behavior.
- `hasMore` semantics.
- Next-page token format.

A representative cursor-based request may look like:

```text
GET /api/v1/listings?limit=20&cursor=<opaque-cursor>
```

A cursor must be treated as opaque by clients.

The API must not allow unrestricted page sizes or unbounded collection responses.

---

## 13. Filtering and Sorting

Filtering and sorting must be explicitly allowlisted.

The backend must define:

- Supported filter fields.
- Supported operators.
- Allowed sort fields.
- Default sort order.
- Null-handling behavior.
- Case-sensitivity rules.
- Search normalization.
- Invalid-filter behavior.

Do not translate arbitrary client-provided field names directly into SQL expressions.

Filters must respect authorization and data visibility constraints.

---

## 14. Idempotency

Idempotency must be implemented for operations where duplicate requests could create financial, inventory, assignment, or workflow problems.

Potentially idempotent operations include:

- Payment-order creation.
- Payment webhook processing.
- Refund requests.
- Furniture reservations.
- Furniture order creation.
- Lead creation from retry-prone client actions.
- Visit booking.
- Administrative commands.
- Notification dispatch.
- Export-job creation.

The implementation must define:

- Which endpoints require idempotency keys.
- Key format and length.
- Scope of uniqueness.
- Storage duration.
- Request fingerprinting.
- Behavior when the same key is reused with a different payload.
- Response replay behavior.
- Concurrent-request handling.

An idempotency key must not be treated as a replacement for authorization or validation.

---

## 15. Concurrency and State-Transition APIs

Command endpoints that change state must:

- Validate the current state.
- Verify actor permissions.
- Apply concurrency protection.
- Record the state transition.
- Emit required events.
- Return a clear result.
- Handle repeated requests safely.

Examples include:

- Submitting a listing for review.
- Approving or rejecting broker verification.
- Publishing or suspending a listing.
- Assigning a lead.
- Confirming or cancelling a visit.
- Completing a furniture return.
- Updating payment status through a verified provider event.
- Closing a transaction.

The API must not permit arbitrary status updates such as:

```json
{
  "status": "approved"
}
```

unless the endpoint's business contract explicitly allows that transition and the backend validates it.

---

## 16. File Upload Contracts

Where documents or media uploads are supported, the team must define:

- Upload authorization.
- Accepted MIME types.
- File-size limits.
- File-count limits.
- Filename handling.
- Malware or content scanning requirements where applicable.
- Storage provider abstraction.
- Private versus public visibility.
- Signed URL behavior.
- Expiration of upload URLs.
- Ownership and access checks.
- Deletion behavior.
- Audit requirements.

The API must not trust a client-provided MIME type or file extension as the only security control.

Sensitive verification documents must not be publicly accessible by default.

---

## 17. External Provider Boundaries

External provider integrations must be isolated behind application ports or adapters.

Examples include:

- OTP delivery provider.
- SMS provider.
- WhatsApp provider.
- Email provider.
- Payment provider.
- File storage provider.
- Maps or geocoding provider.
- Push-notification provider.

API routes must not directly call provider SDKs.

Provider failures must be translated into stable application-level error categories.

Provider-specific response payloads must not leak directly to clients unless explicitly approved.

---

## 18. OpenAPI and Documentation

Every externally consumed endpoint must be documented.

Documentation must include:

- HTTP method and path.
- Purpose.
- Authentication requirements.
- Authorization requirements.
- Request parameters.
- Request body schema.
- Success response schema.
- Error responses.
- Pagination behavior.
- Idempotency requirements.
- State-transition rules.
- Example requests and responses.
- Deprecation information where applicable.

OpenAPI documentation must be generated or maintained in a way that remains synchronized with the implementation.

The team must avoid documenting endpoints that do not exist or exposing undocumented endpoints as stable public APIs.

---

## 19. Observability and Request Context

Every request should have a correlation or request identifier.

The API should record:

- Request identifier.
- Route and method.
- Response status.
- Duration.
- Authenticated actor reference where safe.
- Relevant organization context where safe.
- Error code if a failure occurs.
- Upstream dependency timing where applicable.

Do not log:

- OTP values.
- Access tokens.
- Refresh tokens.
- Payment secrets.
- Full identity documents.
- Sensitive personal data without a justified need.

Logs must be structured and suitable for production investigation.

---

## 20. Rate Limiting and Abuse Controls

The API must apply endpoint-specific rate limits.

High-risk or high-cost endpoints should receive stricter controls, including:

- OTP requests and verification.
- Authentication/session renewal.
- Search.
- Listing creation.
- Lead creation.
- Visit booking.
- File-upload initiation.
- Payment operations.
- Administrative commands.
- Export generation.

Rate limits must work correctly when multiple API instances are deployed.

The API must return a consistent rate-limit error response and should provide safe retry guidance where appropriate.

---

## 21. API Security Requirements

The API must implement or document:

- HTTPS enforcement in deployed environments.
- Secure headers where appropriate.
- CORS policy.
- Request-body size limits.
- Content-type validation.
- Input sanitization where required.
- SQL injection protection through parameterized access.
- NoSQL-style injection protection if any document queries are introduced.
- SSRF protections for server-side URL fetching.
- File-upload protections.
- Sensitive-data redaction.
- Authorization checks on every protected resource.
- Safe error handling.
- Dependency and secret-management practices.

CORS must not be configured as unrestricted wildcard access for credentialed production requests.

---

## 22. Testing Requirements

### Contract Tests

Test:

- Request schema validation.
- Response shape.
- Error codes.
- HTTP status codes.
- Required headers.
- Pagination contract.
- Idempotency behavior.
- OpenAPI consistency.

### Integration Tests

Test:

- Authentication hooks.
- Authorization hooks.
- Database-backed business validation.
- Transaction behavior.
- External-provider adapter failures.
- Rate limits.
- Request correlation.
- Error mapping.

### End-to-End Tests

Test:

- Authentication and protected requests.
- Listing creation and publication.
- Broker verification.
- Lead assignment.
- Visit scheduling.
- Review eligibility.
- Furniture order lifecycle.
- Payment and webhook flows.
- Administrative actions.
- Unauthorized and cross-organization access attempts.

Tests must include malformed requests, duplicate requests, stale state, expired sessions, concurrency conflicts, and provider failures.

---

## 23. Required Deliverables

The implementation team must produce:

1. A versioning decision record.
2. API naming and HTTP-method conventions.
3. Success-response and error-response schemas.
4. A standard pagination contract.
5. An idempotency policy.
6. A validation strategy.
7. A route authorization checklist.
8. An OpenAPI generation and review process.
9. File-upload contracts where applicable.
10. External-provider adapter conventions.
11. API security configuration requirements.
12. Contract, integration, and end-to-end tests for implemented routes.

---

## 24. Definition of Done

This step is complete when:

- The API versioning strategy is documented.
- URL and HTTP conventions are standardized.
- Success and error envelopes are consistent.
- Request validation is implemented for the first API slice.
- Business validation remains in application/domain layers.
- Pagination is standardized.
- Idempotency requirements are documented and implemented where needed.
- Protected routes use shared authentication and authorization.
- OpenAPI documentation is available for implemented endpoints.
- Request correlation and structured errors are working.
- API security defaults are documented.
- Contract and integration tests pass for the implemented scope.

---

## 25. Acceptance Criteria

- [ ] All public endpoints use the approved API versioning strategy.
- [ ] Resource naming and HTTP methods are consistent.
- [ ] Request schemas validate path, query, header, and body inputs.
- [ ] Unexpected or malformed input is handled consistently.
- [ ] Business rules are not implemented inside thin route handlers.
- [ ] Success and error responses follow shared contracts.
- [ ] HTTP status codes are used meaningfully.
- [ ] Collection endpoints use bounded pagination.
- [ ] Filters and sorting are allowlisted.
- [ ] Sensitive commands support idempotency where required.
- [ ] State transitions are validated server-side.
- [ ] Provider-specific errors are mapped to stable API errors.
- [ ] OpenAPI documentation covers implemented endpoints.
- [ ] Sensitive values are excluded from logs and error responses.
- [ ] Rate limits are applied to high-risk endpoints.
- [ ] Protected routes enforce authentication, authorization, ownership, and entitlement requirements.
- [ ] Contract and end-to-end tests cover critical workflows.
