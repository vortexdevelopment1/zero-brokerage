# PostgreSQL Infrastructure

## Purpose
This directory will contain infrastructure resources, local container definitions, provisioning scripts, and configuration for PostgreSQL.

## Scope
* Container configuration (e.g., Docker Compose service definitions or local setup scripts).
* Database initialization scripts, performance tuning parameters, and extension configurations.

## Documentation & Operational Runbooks

- [Backup & Disaster Recovery Runbook](./backup-and-recovery.md)
- [Local Docker Compose Environment](./docker-compose.yml)

## Implementation Status
PostgreSQL 18.x with PostGIS 3.x is configured for local development and integration testing via `docker-compose.yml`. Operational backup and restoration runbooks are established.
