# API Conventions

## Purpose
Establishes standardized conventions for HTTP REST and RPC APIs across the platform.

## URL Structure & Naming
* Resource-oriented URLs using plural nouns: `/api/v1/properties`, `/api/v1/brokers`.
* Hierarchical relations: `/api/v1/agencies/:agencyId/brokers`.
* Lowercase kebab-case for endpoint paths.
* Query parameter naming: camelCase (e.g., `?pageSize=20&sortBy=createdAt`).

## Request / Response Standards
* Standard request and response payloads must be JSON.
* Consistent payload wrapping:
  - Success: `{ "success": true, "data": { ... } }`
  - Paginated responses: `{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }`
  - Error responses: See `error-format.md`.

## Versioning
* Major versioning prefix in the path: `/api/v1/`.
