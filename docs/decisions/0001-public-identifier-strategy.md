# ADR 0001 — Public Identifier Strategy

## Status

Accepted

## Context

Zero Brokerage requires stable, non-sequential public identifiers where appropriate. Public identifiers must not expose sensitive internal sequencing or unnecessarily reveal record volume.

The database blueprint requires the team to explicitly decide and document the identifier strategy and apply it consistently across related tables.

## Decision

Zero Brokerage will use UUIDs as the stable public/domain identifier strategy where public identifiers are required.

The UUID strategy must be applied consistently across related entities and their references.

## Scope

This decision establishes UUID as the approved public/domain identifier strategy.

It does NOT require every internal database key to be a public identifier or mandate UUID for every internal implementation detail. Internal key choices may be evaluated during detailed schema design as long as they do not conflict with the approved public identifier strategy.

## Consequences

- Public/domain identifiers will be non-sequential.
- APIs and persisted domain models can use UUID-based identifiers without exposing sequential record counts.
- Related tables must use a consistent UUID-compatible identifier strategy where they reference these public/domain identifiers.
- Future database schema designs must follow this decision unless a later ADR explicitly supersedes it.

## Non-Decision

Do not decide or document a specific PostgreSQL UUID-generation extension or generation mechanism in this ADR. That is an implementation detail to be decided when the initial database migration and schema implementation are designed.
