import type { Pool, PoolClient } from "pg";

export interface Migration {
  id: string;
  up: (client: PoolClient) => Promise<void>;
  down?: (client: PoolClient) => Promise<void>;
}

const CREATE_SCHEMA_MIGRATIONS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64)
);
`;

const SELECT_APPLIED_MIGRATIONS_QUERY = `
SELECT id FROM schema_migrations;
`;

const RECORD_MIGRATION_QUERY = `
INSERT INTO schema_migrations (id) VALUES ($1);
`;

interface SchemaMigrationRow {
  id: string;
}

function validateMigrationIds(migrations: readonly Migration[]): void {
  const seenIds = new Set<string>();

  for (const migration of migrations) {
    if (seenIds.has(migration.id)) {
      throw new Error(
        `Duplicate migration ID detected: "${migration.id}". Migration IDs must be unique.`,
      );
    }

    seenIds.add(migration.id);
  }
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(CREATE_SCHEMA_MIGRATIONS_TABLE_QUERY);
}

async function getAppliedMigrationIds(
  client: PoolClient,
): Promise<Set<string>> {
  const result = await client.query<SchemaMigrationRow>(
    SELECT_APPLIED_MIGRATIONS_QUERY,
  );

  return new Set(result.rows.map((row) => row.id));
}

export async function runMigrations(
  pool: Pool,
  migrations: readonly Migration[],
): Promise<void> {
  validateMigrationIds(migrations);

  const setupClient = await pool.connect();
  let appliedIds: Set<string>;

  try {
    await ensureMigrationTable(setupClient);
    appliedIds = await getAppliedMigrationIds(setupClient);
  } finally {
    setupClient.release();
  }

  const pendingMigrations = migrations.filter(
    (migration) => !appliedIds.has(migration.id),
  );

  if (pendingMigrations.length === 0) {
    return;
  }

  for (const migration of pendingMigrations) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await migration.up(client);
      await client.query(RECORD_MIGRATION_QUERY, [migration.id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
