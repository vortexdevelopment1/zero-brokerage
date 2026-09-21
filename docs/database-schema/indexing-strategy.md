# Indexing Strategy

## Purpose
Guidelines and conventions for database indexing in PostgreSQL.

## Principles
* **Primary Keys**: UUID v7 or identity integers for predictable B-tree indexing.
* **Foreign Keys**: Explicit B-tree index on all foreign key columns to prevent cascade locking and optimize joins.
* **Geospatial Queries**: PostGIS GIST indexes on coordinates / location polygons for property search.
* **Full-Text Search**: GIN indexes on `tsvector` columns for property descriptions and title searches.
* **Naming Convention**:
  - Primary Key: `pk_<table_name>`
  - Foreign Key: `fk_<table_name>_<referenced_table>`
  - Index: `idx_<table_name>_<column_name(s)>`
  - Unique Index: `uq_<table_name>_<column_name(s)>`
