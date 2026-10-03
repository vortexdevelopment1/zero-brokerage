# Database Schema Documentation

## Purpose
This directory will contain documentation, entity-relationship diagrams (ERDs), and schema design references for the platform's data models.

## Scope
* Conceptual, logical, and physical entity-relationship diagrams.
* Data dictionary, table structures, index strategies, and partitioning notes.

## Documentation Index

- [Domain Inventory & Persistence Architecture](./domain-inventory.md)
- [Database Ownership Matrix](./ownership-matrix.md)
- [Entity-Relationship Diagram (ERD)](./erd.md)
- [Index & Query Performance Plan](./indexing-strategy.md)
- [Status Transition Data Model Policy](./status-transitions.md)
- [Concurrency Control Inventory](./concurrency-inventory.md)
- [Retention & Deletion Matrix](./retention-and-deletion-matrix.md)
- [Database & Repository Test Coverage](./test-coverage.md)

## Implementation Status
Step 03 persistence architecture (Batches 01, 02, 03, and 04) is implemented and independently verified across PostgreSQL 18.x and PostGIS 3.x. Migrations `20260925_001` through `20260930_005` establish core identity, outbox, agency, property, and listing persistence.
