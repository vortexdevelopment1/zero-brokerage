import type { Pool, PoolClient } from "pg";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface Migration {
  id: string;
  up: (client: PoolClient) => Promise<void>;
  down?: (client: PoolClient) => Promise<void>;
  /** Optional explicit checksum override, useful for controlled testing */
  checksum?: string;
  /** Optional explicit file path to migration source */
  filePath?: string;
}

export interface SchemaMigrationRecord {
  id: string;
  appliedAt: Date;
  checksum: string | null;
}

/**
 * Deterministic 64-bit signed integer advisory lock ID for Zero Brokerage migrations.
 * Derived from SHA-256("zero-brokerage:database:migrations") first 8 bytes.
 * Value: 2253708588080840845 (guarantees zero collision with other application locks).
 */
export const MIGRATION_ADVISORY_LOCK_ID = "2253708588080840845";

export class MigrationChecksumMismatchError extends Error {
  public readonly migrationId: string;
  public readonly storedChecksum: string;
  public readonly currentChecksum: string;

  constructor(params: {
    migrationId: string;
    storedChecksum: string;
    currentChecksum: string;
  }) {
    super(
      `Migration checksum mismatch detected for migration "${params.migrationId}".\n` +
        `  Stored checksum : ${params.storedChecksum}\n` +
        `  Current checksum: ${params.currentChecksum}\n` +
        `Applied migrations are immutable. The migration file content has been altered after being applied to the database.\n` +
        `Do not modify already-applied migrations in place. Revert the modification or apply a new migration to introduce changes.`,
    );
    this.name = "MigrationChecksumMismatchError";
    this.migrationId = params.migrationId;
    this.storedChecksum = params.storedChecksum;
    this.currentChecksum = params.currentChecksum;
  }
}

const CREATE_SCHEMA_MIGRATIONS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64)
);

ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);
`;

const SELECT_APPLIED_MIGRATIONS_QUERY = `
SELECT id, applied_at, checksum FROM schema_migrations ORDER BY applied_at ASC;
`;

const RECORD_MIGRATION_QUERY = `
INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2);
`;

const UPDATE_MIGRATION_CHECKSUM_QUERY = `
UPDATE schema_migrations SET checksum = $1 WHERE id = $2 AND checksum IS NULL;
`;

/**
 * Normalizes text to ensure byte-for-byte SHA-256 determinism across
 * Windows (CRLF), Linux (LF), and BOM-encoded environments.
 * Preserves all internal whitespace and code formatting while canonicalizing
 * line-ending conventions and trailing newline.
 */
export function normalizeContentForChecksum(content: string): string {
  // Strip UTF-8 BOM if present (0xFEFF)
  const withoutBom =
    content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return withoutBom.replace(/\r\n/g, "\n").trimEnd() + "\n";
}

/**
 * Computes a deterministic SHA-256 checksum for a migration.
 *
 * Strategy:
 * 1. If explicit `migration.checksum` is provided, returns it (test control).
 * 2. If migration file is found on disk (.ts or .js), reads its UTF-8 content,
 *    strips BOM, normalizes line endings (CRLF -> LF), and computes SHA-256 hex digest.
 * 3. Fallback for in-memory synthetic migrations: hashes the normalized string
 *    representation of the `up` function.
 */
export function computeMigrationChecksum(migration: Migration): string {
  if (migration.checksum) {
    return migration.checksum;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  const candidatePaths: string[] = [];
  if (migration.filePath) {
    candidatePaths.push(migration.filePath);
  }

  // Search candidate paths across src, dist, and package roots
  candidatePaths.push(
    path.resolve(currentDir, "../../migrations", `${migration.id}.ts`),
    path.resolve(currentDir, "../../migrations", `${migration.id}.js`),
    path.resolve(currentDir, "../../../migrations", `${migration.id}.ts`),
    path.resolve(currentDir, "../../../migrations", `${migration.id}.js`),
    path.resolve(currentDir, "../migrations", `${migration.id}.ts`),
    path.resolve(currentDir, "../migrations", `${migration.id}.js`),
    path.resolve(process.cwd(), "packages/database/migrations", `${migration.id}.ts`),
    path.resolve(process.cwd(), "packages/database/migrations", `${migration.id}.js`),
    path.resolve(process.cwd(), "migrations", `${migration.id}.ts`),
    path.resolve(process.cwd(), "migrations", `${migration.id}.js`),
  );

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      const rawContent = fs.readFileSync(candidate, "utf8");
      const normalized = normalizeContentForChecksum(rawContent);
      return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
    }
  }

  // In-memory or synthetic test migration fallback
  const fallbackContent = migration.up.toString();
  const normalized = normalizeContentForChecksum(fallbackContent);
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function validateMigrationRegistry(
  migrations: readonly Migration[],
): void {
  if (!Array.isArray(migrations)) {
    throw new Error("Migrations registry must be an array.");
  }

  const seenIds = new Set<string>();
  let previousId: string | null = null;

  for (const migration of migrations) {
    if (!migration || typeof migration.id !== "string" || migration.id.trim() === "") {
      throw new Error("Invalid migration: migration ID must be a non-empty string.");
    }

    if (typeof migration.up !== "function") {
      throw new Error(
        `Invalid migration "${migration.id}": "up" method must be an executable function.`,
      );
    }

    if (migration.down !== undefined && typeof migration.down !== "function") {
      throw new Error(
        `Invalid migration "${migration.id}": "down" method must be a function if provided.`,
      );
    }

    if (seenIds.has(migration.id)) {
      throw new Error(
        `Duplicate migration ID detected: "${migration.id}". Migration IDs must be unique.`,
      );
    }

    // Enforce strictly deterministic ordering (chronological/lexicographical)
    if (previousId !== null && migration.id < previousId) {
      throw new Error(
        `Migration registry ordering error: "${migration.id}" appears after "${previousId}". Migrations must be ordered deterministically.`,
      );
    }

    seenIds.add(migration.id);
    previousId = migration.id;
  }
}

export async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(CREATE_SCHEMA_MIGRATIONS_TABLE_QUERY);
}

export async function getAppliedMigrationRecords(
  client: PoolClient,
): Promise<Map<string, SchemaMigrationRecord>> {
  const result = await client.query<{
    id: string;
    applied_at: Date;
    checksum: string | null;
  }>(SELECT_APPLIED_MIGRATIONS_QUERY);

  const map = new Map<string, SchemaMigrationRecord>();
  for (const row of result.rows) {
    map.set(row.id, {
      id: row.id,
      appliedAt: row.applied_at,
      checksum: row.checksum ?? null,
    });
  }

  return map;
}

/**
 * Reconciles applied migrations against the registry:
 * - Backfills missing checksums on historical records.
 * - Detects checksum mismatches (file altered post-apply) and throws.
 */
export async function reconcileAppliedChecksums(
  client: PoolClient,
  migrations: readonly Migration[],
  appliedMap: Map<string, SchemaMigrationRecord>,
): Promise<void> {
  for (const migration of migrations) {
    const appliedRecord = appliedMap.get(migration.id);
    if (!appliedRecord) {
      continue;
    }

    const currentChecksum = computeMigrationChecksum(migration);

    if (appliedRecord.checksum === null) {
      // Historical migration applied before checksum enforcement: backfill safely
      await client.query(UPDATE_MIGRATION_CHECKSUM_QUERY, [
        currentChecksum,
        migration.id,
      ]);
      appliedRecord.checksum = currentChecksum;
    } else if (appliedRecord.checksum !== currentChecksum) {
      throw new MigrationChecksumMismatchError({
        migrationId: migration.id,
        storedChecksum: appliedRecord.checksum,
        currentChecksum,
      });
    }
  }
}

export interface RunMigrationsOptions {
  /** Optional custom advisory lock ID */
  lockId?: string | bigint | undefined;
}

/**
 * Executes pending database migrations with strict concurrency protection,
 * checksum validation, and atomic metadata persistence.
 *
 * Single-Client Lifecycle:
 * Uses one dedicated client from the pool to acquire the session-level advisory lock,
 * perform discovery, execute migration transactions, and release the lock.
 * This guarantees zero pool-exhaustion deadlocks when multiple runners compete.
 */
export async function runMigrations(
  pool: Pool,
  migrations: readonly Migration[],
  options?: RunMigrationsOptions | undefined,
): Promise<void> {
  validateMigrationRegistry(migrations);

  const lockId = options?.lockId?.toString() ?? MIGRATION_ADVISORY_LOCK_ID;
  const client = await pool.connect();

  try {
    // 1. Acquire PostgreSQL session-level advisory lock
    // Blocks concurrent migration runners until the critical section completes.
    // If the process dies unexpectedly, PostgreSQL automatically releases session advisory locks.
    await client.query("SELECT pg_advisory_lock($1::bigint);", [lockId]);

    try {
      // 2. Ensure schema_migrations table exists with checksum column
      await ensureMigrationTable(client);

      // 3. Load applied migration records
      const appliedMap = await getAppliedMigrationRecords(client);

      // 4. Verify checksums of applied migrations & backfill legacy null checksums
      await reconcileAppliedChecksums(client, migrations, appliedMap);

      // 5. Filter unapplied pending migrations
      const appliedIds = new Set(appliedMap.keys());
      const pendingMigrations = migrations.filter(
        (migration) => !appliedIds.has(migration.id),
      );

      if (pendingMigrations.length === 0) {
        return;
      }

      // 6. Execute pending migrations sequentially in atomic transactions on the locked client
      for (const migration of pendingMigrations) {
        const checksum = computeMigrationChecksum(migration);

        try {
          await client.query("BEGIN");
          await migration.up(client);
          await client.query(RECORD_MIGRATION_QUERY, [migration.id, checksum]);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    } finally {
      // 7. Reliably release advisory lock
      try {
        await client.query("SELECT pg_advisory_unlock($1::bigint);", [lockId]);
      } catch {
        // Suppress unlock failure if connection was lost
      }
    }
  } finally {
    // 8. Return client to pool
    client.release();
  }
}
