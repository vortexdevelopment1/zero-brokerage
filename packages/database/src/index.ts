export {
  createDatabasePool,
  type DatabaseClientOptions,
} from "./client/index.js";

export { executeQuery } from "./query/index.js";

export { withTransaction } from "./transaction/index.js";

export type {
  Migration,
  SchemaMigrationRecord,
  RunMigrationsOptions,
} from "./migrations/index.js";

export {
  runMigrations,
  computeMigrationChecksum,
  normalizeContentForChecksum,
  validateMigrationRegistry,
  ensureMigrationTable,
  getAppliedMigrationRecords,
  reconcileAppliedChecksums,
  MigrationChecksumMismatchError,
  MIGRATION_ADVISORY_LOCK_ID,
} from "./migrations/index.js";

export { allMigrations } from "./migrations/registry.js";

export { checkDatabaseHealth, type DatabaseHealth } from "./health/index.js";
