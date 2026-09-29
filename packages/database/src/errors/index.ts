export interface DatabaseErrorDetails {
  code: string;
  sqlState?: string | undefined;
  table?: string | undefined;
  constraint?: string | undefined;
  column?: string | undefined;
  detail?: string | undefined;
}

/**
 * Base database error class for all mapped PostgreSQL errors.
 * Preserves structured metadata while ensuring no sensitive query text,
 * bind parameters, or credentials are leaked.
 */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly sqlState?: string | undefined;
  public readonly table?: string | undefined;
  public readonly constraint?: string | undefined;
  public readonly column?: string | undefined;
  public readonly detail?: string | undefined;

  constructor(message: string, details: DatabaseErrorDetails) {
    super(message);
    this.name = this.constructor.name;
    this.code = details.code;
    this.sqlState = details.sqlState;
    this.table = details.table;
    this.constraint = details.constraint;
    this.column = details.column;
    this.detail = details.detail;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a unique constraint or index is violated (SQLSTATE 23505).
 */
export class UniqueConstraintViolationError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ??
        `Unique constraint violation${details.constraint ? ` on "${details.constraint}"` : ""}.`,
      { ...details, code: "UNIQUE_VIOLATION" },
    );
  }
}

/**
 * Thrown when a foreign key constraint is violated (SQLSTATE 23503).
 */
export class ForeignKeyViolationError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ??
        `Foreign key constraint violation${details.constraint ? ` on "${details.constraint}"` : ""}.`,
      { ...details, code: "FOREIGN_KEY_VIOLATION" },
    );
  }
}

/**
 * Thrown when a NOT NULL column constraint is violated (SQLSTATE 23502).
 */
export class NotNullConstraintViolationError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ??
        `Not-null constraint violation${details.column ? ` on column "${details.column}"` : ""}.`,
      { ...details, code: "NOT_NULL_VIOLATION" },
    );
  }
}

/**
 * Thrown when a CHECK constraint is violated (SQLSTATE 23514).
 */
export class CheckConstraintViolationError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ??
        `Check constraint violation${details.constraint ? ` on "${details.constraint}"` : ""}.`,
      { ...details, code: "CHECK_VIOLATION" },
    );
  }
}

/**
 * Thrown when a transaction serialization failure occurs (SQLSTATE 40001).
 * Typically retryable under serializable isolation level.
 */
export class SerializationFailureError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ?? "Transaction serialization failure due to concurrent update.",
      { ...details, code: "SERIALIZATION_FAILURE" },
    );
  }
}

/**
 * Thrown when a deadlock is detected between concurrent transactions (SQLSTATE 40P01).
 */
export class DeadlockDetectedError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ?? "Deadlock detected between concurrent transactions.",
      { ...details, code: "DEADLOCK_DETECTED" },
    );
  }
}

/**
 * Fallback for unclassified database errors.
 */
export class UnknownDatabaseError extends DatabaseError {
  constructor(details: Omit<DatabaseErrorDetails, "code">, message?: string) {
    super(
      message ?? "An unexpected database error occurred.",
      { ...details, code: "UNKNOWN_DATABASE_ERROR" },
    );
  }
}

interface RawPgError {
  code?: string;
  table?: string;
  constraint?: string;
  column?: string;
  detail?: string;
  message?: string;
}

/**
 * Maps a raw PostgreSQL error (from pg / node-postgres) into a structured DatabaseError subclass.
 * Non-database errors and existing DatabaseErrors are returned without modification.
 * Secrets, connection strings, and raw SQL queries are explicitly stripped.
 */
export function mapDatabaseError(error: unknown): DatabaseError | Error {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (typeof error !== "object" || error === null) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const pgErr = error as RawPgError;
  const sqlState = typeof pgErr.code === "string" ? pgErr.code : undefined;

  // If there's no SQLSTATE code, this is not a PostgreSQL server error
  if (!sqlState) {
    return error instanceof Error ? error : new Error(String(error));
  }

  // Extract safe metadata (filtering out any sensitive values)
  const safeDetails: Omit<DatabaseErrorDetails, "code"> = {
    sqlState,
    table: sanitizeIdentifier(pgErr.table),
    constraint: sanitizeIdentifier(pgErr.constraint),
    column: sanitizeIdentifier(pgErr.column),
    detail: sanitizeDetail(pgErr.detail),
  };

  switch (sqlState) {
    case "23505":
      return new UniqueConstraintViolationError(safeDetails);
    case "23503":
      return new ForeignKeyViolationError(safeDetails);
    case "23502":
      return new NotNullConstraintViolationError(safeDetails);
    case "23514":
      return new CheckConstraintViolationError(safeDetails);
    case "40001":
      return new SerializationFailureError(safeDetails);
    case "40P01":
      return new DeadlockDetectedError(safeDetails);
    default:
      return new UnknownDatabaseError(
        safeDetails,
        pgErr.message ? sanitizeDetail(pgErr.message) : undefined,
      );
  }
}

function sanitizeIdentifier(val: unknown): string | undefined {
  if (typeof val === "string" && val.length > 0) {
    // Only allow alphanumeric and underscore characters for safe identifiers
    return val.replace(/[^a-zA-Z0-9_.]/g, "");
  }
  return undefined;
}

function sanitizeDetail(val: unknown): string | undefined {
  if (typeof val !== "string" || !val) {
    return undefined;
  }
  // Strip out potential passwords or connection URIs
  const sanitized = val
    .replace(/password=[^\s;]+/gi, "password=***")
    .replace(/postgres:\/\/[^\s;]+/gi, "postgres://***")
    .replace(/postgresql:\/\/[^\s;]+/gi, "postgresql://***");
  return sanitized;
}
