# Database Migrations

## Conventions

1. **Ordering & Naming**:
   Migrations follow the pattern:
   `YYYYMMDD_NNN_descriptive_name.ts` (e.g. `20260925_001_enable_postgis.ts`).
   The migration registry enforces deterministic lexicographical ordering.

2. **Applied Migration Immutability**:
   Once applied to any environment, migration files **must never be edited in place**.
   The migration runner computes SHA-256 checksums and will halt if historical migrations differ from their recorded hashes.

3. **Transaction Safety**:
   Each migration is executed in its own atomic transaction. Do not include explicit `BEGIN` or `COMMIT` statements within migration files unless required for non-transactional statements.

4. **Rollbacks**:
   Provide a corresponding `down(client: PoolClient)` method where practical to support rollback capabilities.
