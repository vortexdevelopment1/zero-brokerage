# Redis Keyspace Design

## Purpose
This document outlines conventions, prefixes, data types, and TTL (Time-To-Live) strategies for Redis keys across platform services.

## Key Naming Conventions
* Format: `<service>:<entity>:<identifier>:<sub-resource>`
* Delimiter: Colon (`:`) separator for hierarchical keys.
* Casing: Lowercase alphanumeric strings with hyphens where needed.

## Key Categories & Proposed Patterns
* **Session / Auth**: `auth:session:<session_id>` (TTL: matching token lifetime)
* **Rate Limiting**: `ratelimit:<ip_or_user_id>:<endpoint_hash>` (TTL: window duration)
* **Cache**: `cache:property:<property_id>` (TTL: configured eviction window)
* **Pub/Sub Channels**: `events:<domain>:<event_name>`

## Persistence & Eviction
* Eviction policy recommendations and memory thresholds will be finalized during deployment planning.
