# ADR 0006 — API Validation and Error-Handling Transition

## Status

Accepted

## Context

Step 05 Batch 01 established the Canonical Step 05 HTTP contract for new externally consumed business/resource endpoints. It uses canonical success, collection, and error envelopes plus `X-Request-Id` request correlation.

Step 04 authentication routes remain a Legacy Step 04 Compatibility Surface. They currently return `{ "success": true, "data": ... }`, and the existing global error handler returns the corresponding legacy error envelope. These behaviors are verified and must not change during Step 05 Batch 02.

Step 03 already classifies raw PostgreSQL failures into typed database errors. That persistence concern must not be duplicated in the HTTP layer.

Batch 02 will introduce validation and public error transformation for new canonical routes without silently migrating Step 04 or changing Step 03.

## Decision 1: Legacy and Canonical Error Boundary

The system will maintain one internal error-classification concept and support controlled public formatting for two compatibility surfaces:

```text
Raw error
  -> error classification
  -> classified internal error
  -> Step 04 legacy formatter -> legacy envelope
  -> Step 05 canonical formatter -> { error: { ... } }
```

- Step 04 behavior must remain unchanged throughout Batch 02.
- New Step 05 routes must use the canonical error contract.
- The legacy format is not an accepted pattern for new routes.
- The implementation must not maintain independent legacy and canonical error classification systems.
- Batch 02A implements runtime dispatch via explicit route configuration metadata (`compatibilitySurface: "step04-legacy"` attached at Step 04 route/module registration), avoiding path-prefix matching or centralized path registries.

## Decision 2: Unknown Request Properties

Where a request schema requires strictness, unexpected object properties must be rejected rather than silently discarded. Such schemas must use `additionalProperties: false`.

Batch 02 must establish this policy deliberately at the schema/validation layer. It must not rely on global `removeAdditional: true` behavior as request sanitization. No global Ajv configuration has been changed by this decision.

## Decision 3: Type Coercion

Validation distinguishes HTTP transport representation from application values:

- Bodies prefer strict type validation and must not rely on broad implicit coercion.
- Query strings and path parameters may use controlled, deliberate coercion where their HTTP transport form is string-based.
- Headers require explicit validation.
- Identifiers and dates require explicit format validation.

Batch 02B implements this via dedicated Ajv compilers: `coerceTypes: false` for body, and `coerceTypes: true` for querystring, params, and headers. Header normalization lowercases keys and ensures undeclared HTTP transport headers are permitted while declared header constraints remain strictly enforced. External `$ref` schemas resolve across routes via Fastify's native `schemaController.compilersFactory.buildValidator`.

## Decision 4: HTTP 400 and 422

`400 Bad Request` is for malformed JSON, malformed request syntax, invalid content type where the request cannot be processed as intended, and malformed transport-level input.

`422 Unprocessable Content` is for a request that can be structurally parsed but fails its declared schema: missing required fields, invalid types, enums, UUIDs, formats, date/time values, ranges, lengths, nested structures, or array items. Endpoint contracts and schemas govern the specific application of this distinction.

## Decision 5: Zod and Ajv Coexistence

Step 04 currently performs Zod validation in its routes. Batch 02 must not migrate those routes from Zod to Ajv.

```text
Step 04 routes: Zod -> existing legacy-compatible behavior
New Step 05 routes: Fastify JSON Schema/Ajv -> canonical validation/error behavior
```

This coexistence is intentional. It does not mean all repository validation has already been standardized.

## Decision 6: Classification and Formatting Occur Once

The target pipeline is:

```text
Raw error -> classification -> classified internal error -> public formatter -> response
```

Classification must occur once. Formatting is separate from classification. The Batch 02 implementation must prevent already-classified errors from being classified again or becoming nested/double-wrapped canonical errors. The exact internal marker or representation is an implementation detail for Batch 02A. Public responses must never expose internal error objects directly, and unknown errors must use a safe public fallback.

## Database Error Boundary

Step 03 remains responsible for PostgreSQL/persistence error classification:

```text
PostgreSQL error -> Step 03 typed database error -> Step 05 public HTTP transformation -> canonical public response
```

Step 05 must reuse this classification and must not duplicate raw PostgreSQL classification. This ADR does not claim the canonical integration is already implemented.

## Transport and Business Validation Boundary

Transport validation handles request body, query parameters, path parameters, headers, content type, primitive types, required fields, enums, formats, lengths/ranges, arrays, nested schemas, and strict unexpected-property rules.

Business/domain validation handles state transitions, ownership, authorization-dependent rules, domain and cross-entity invariants, and workflow rules. Business logic must not be moved into Ajv schemas.

## Public Error Information Disclosure

Canonical public errors must not expose SQL, table/column/constraint names, stack traces, filesystem/internal-module paths, environment values, secrets, OTPs, access or refresh tokens, provider credentials, unnecessary personal data, or raw provider/internal payloads. Internal diagnostics may retain safe context for logging. This ADR makes no logging or observability implementation change.

## Retryability

`retryable` is part of the canonical public error contract. Error classification, not HTTP status alone, determines its value. Batch 02 will provide the architecture for classified errors to supply retryability without inventing provider- or domain-specific retry policies.

## Proposed Batch 02 Implementation Sequence

### Batch 02A — Error Classification and Compatibility Foundation

Implement internal classification, canonical formatter architecture, the Step 04 legacy compatibility boundary, double-transformation protection, request-ID preservation, and a safe unknown-error fallback. Excludes Ajv configuration, route schemas, and domain validation.

### Batch 02B — Ajv and Transport Validation Foundation

Implement deliberate Ajv configuration; body, query, path, and header schemas; strict unexpected-property behavior; controlled coercion; validation-error normalization; and the 400/422 policy. Excludes domain validation.

### Batch 02C — Validation and Error Integration

Connect Fastify validation, application errors, database errors, and Fastify errors to the classifier and canonical formatter while preserving Step 04 legacy behavior. Add integration tests.

### Batch 02D — Adversarial Validation and Security Testing

Test malformed JSON/query/path/header values, unknown fields, IDs, enums, formats, nesting, arrays, database/Fastify leakage, double transformation, request-ID consistency, Step 04 regressions, and canonical Step 05 behavior.

These are proposed implementation boundaries only. None is implemented by this ADR.

## Consequences

- Batch 02 has an explicit compatibility constraint before changing the shared error pipeline.
- New schema-driven routes have a canonical validation path without forcing an unrelated Step 04 migration.
- Step 03 remains the single source of database error classification.
- Batch 02 implementation must make its compatibility dispatch and Ajv choices explicit and independently testable.

## Non-Decision

This ADR does not select the concrete compatibility-dispatch mechanism, change Fastify or Ajv configuration, introduce schemas or validators, alter runtime error handling, migrate Step 04, modify database code, or define future provider/domain retry policies.
