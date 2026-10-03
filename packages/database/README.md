# Database Package (`@zero-brokerage/database`)

## Purpose
Core PostgreSQL and PostGIS persistence foundation for Zero Brokerage. Provides connection pooling, raw parameterized query execution, atomic transactions, database health checks, and a hardened migration runner with advisory locking and SHA-256 checksum verification.

## Architecture

- `client/`: PostgreSQL connection pool creation and lifecycle management (`pg.Pool`).
- `health/`: Database connectivity health check (`SELECT 1`).
- `migrations/`: Migration runner, registry, SHA-256 checksum verification, and session advisory locking.
- `query/`: Parameterized query execution helper (`executeQuery`).
- `transaction/`: Transaction boundary helper (`withTransaction`).
- `tests/`: Real PostgreSQL integration test suite.

## Migration System

### Concurrency Protection & Advisory Locking
To prevent race conditions, concurrent DDL execution, and duplicate records when multiple application containers boot simultaneously:
- The migration runner acquires a PostgreSQL session-level advisory lock using `pg_advisory_lock($1::bigint)`.
- The lock ID (`2253708588080840845`) is deterministically derived from the first 8 bytes of `SHA-256("zero-brokerage:database:migrations")`, preventing collisions with other database tools.
- When Process A holds the lock, competing processes are suspended until Process A commits its migrations and releases the lock.
- If a process dies or crashes, PostgreSQL automatically releases all session advisory locks held by that connection, eliminating permanent lock leaks.

### SHA-256 Checksums & Applied Migration Immutability
- Every migration script is hashed using SHA-256 when executed, and the checksum is recorded in `schema_migrations.checksum`.
- To ensure cross-platform determinism between Windows (CRLF) and Linux/macOS (LF), content line endings are normalized (`\r\n` -> `\n`) before hashing.
- On startup, the runner verifies the current checksum of each applied migration against its recorded value in `schema_migrations`.
- If an already-applied migration has been modified, the runner throws `MigrationChecksumMismatchError` and halts startup immediately. Stored checksums are never silently overwritten.
- Legacy migrations applied before checksum tracking receive safe backfill upgrades upon the first run.

### Atomic Migration Execution
Each pending migration executes within an explicit transaction:
```sql
BEGIN;
-- execute migration.up(client)
INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2);
COMMIT;
```
If a migration fails, all DDL and table mutations are rolled back, and no record is written to `schema_migrations`.

## Running Tests

Tests execute against a real PostgreSQL instance (with PostGIS installed):

```bash
# Run real PostgreSQL migration integration tests
npm run test

# Typecheck
npm run typecheck

# Build dist bundle
npm run build
```

### Test Database Isolation
Tests target `zero_brokerage_test` database (or the database specified in `TEST_DATABASE_URL`). Schema resets are guarded by an assertion requiring `"test"` in the target database name to prevent accidental execution against development or production databases.
