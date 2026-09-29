export {
  createDatabasePool,
  type DatabaseClientOptions,
} from "./client/index.js";

export { executeQuery, type QueryExecutor } from "./query/index.js";

export {
  withTransaction,
  type TransactionContext,
  isTransactionContext,
} from "./transaction/index.js";

export {
  DatabaseError,
  type DatabaseErrorDetails,
  UniqueConstraintViolationError,
  ForeignKeyViolationError,
  NotNullConstraintViolationError,
  CheckConstraintViolationError,
  SerializationFailureError,
  DeadlockDetectedError,
  UnknownDatabaseError,
  mapDatabaseError,
} from "./errors/index.js";

export {
  type OutboxStatus,
  type OutboxEventRecord,
  type InsertOutboxEventParams,
  type ClaimOutboxEventsOptions,
  type MarkOutboxPublishedOptions,
  type MarkOutboxFailedOptions,
  OutboxStateTransitionError,
  insertOutboxEvent,
  claimOutboxEvents,
  markOutboxEventPublished,
  markOutboxEventFailed,
  reclaimStaleOutboxLeases,
} from "./outbox/index.js";

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

export {
  GeospatialValidationError,
  type GeoCoordinates,
  type BoundingBox,
  type ParameterizedSqlFragment,
  validateCoordinates,
  createGeoPoint,
  validateBoundingBox,
  buildRadiusCondition,
  buildBoundingBoxCondition,
  buildDistanceSelect,
  formatPointWkt,
  parsePointWkt,
} from "./geospatial/index.js";
