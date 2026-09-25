import type { Pool, PoolClient } from "pg";

export interface Migration {
  id: string;
  up: (client: PoolClient) => Promise<void>;
  down?: (client: PoolClient) => Promise<void>;
}

export async function runMigrations(
  pool: Pool,
  migrations: readonly Migration[],
): Promise<void> {
  for (const migration of migrations) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await migration.up(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
