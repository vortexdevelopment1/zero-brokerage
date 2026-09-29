import type { Pool, PoolClient } from "pg";

type HealthCheckExecutor = Pool | PoolClient;

export interface DatabaseHealth {
  healthy: boolean;
}

export async function checkDatabaseHealth(
  executor: HealthCheckExecutor,
): Promise<DatabaseHealth> {
  try {
    await executor.query("SELECT 1");
    return { healthy: true };
  } catch {
    return { healthy: false };
  }
}
