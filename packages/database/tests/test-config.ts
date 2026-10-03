import { Pool } from "pg";
import { execSync } from "node:child_process";
import * as net from "node:net";

let resolvedTestDatabaseUrl: string | null = null;

async function isPortOpen(
  host: string,
  port: number,
  timeoutMs = 1000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Resolves the active test database connection string.
 * Priority:
 * 1. process.env.TEST_DATABASE_URL
 * 2. Localhost / 127.0.0.1 port 5432
 * 3. Dynamic WSL2 bridged IP for Windows development environments
 */
export async function getTestDatabaseUrl(): Promise<string> {
  if (resolvedTestDatabaseUrl) {
    return resolvedTestDatabaseUrl;
  }

  if (process.env.TEST_DATABASE_URL) {
    resolvedTestDatabaseUrl = process.env.TEST_DATABASE_URL;
    return resolvedTestDatabaseUrl;
  }

  // Check if 127.0.0.1:5432 is directly reachable
  const isLocalOpen = await isPortOpen("127.0.0.1", 5432, 800);
  if (isLocalOpen) {
    resolvedTestDatabaseUrl =
      "postgresql://postgres:postgres@127.0.0.1:5432/zero_brokerage_test";
    return resolvedTestDatabaseUrl;
  }

  // Windows fallback: detect WSL host IP dynamically
  if (process.platform === "win32") {
    try {
      const output = execSync("wsl -d Ubuntu -e hostname -I", {
        encoding: "utf8",
        timeout: 4000,
      }).trim();
      const ip = output.split(/\s+/)[0];
      if (ip && net.isIP(ip)) {
        const isWslOpen = await isPortOpen(ip, 5432, 1000);
        if (isWslOpen) {
          resolvedTestDatabaseUrl = `postgresql://postgres:postgres@${ip}:5432/zero_brokerage_test`;
          return resolvedTestDatabaseUrl;
        }
      }
    } catch {
      // Fall through to default
    }
  }

  resolvedTestDatabaseUrl =
    "postgresql://postgres:postgres@localhost:5432/zero_brokerage_test";
  return resolvedTestDatabaseUrl;
}

export async function createTestPool(options?: {
  max?: number;
}): Promise<Pool> {
  const connectionString = await getTestDatabaseUrl();
  return new Pool({
    connectionString,
    max: options?.max ?? 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
}

/**
 * Resets the test database schema to a pristine, isolated state.
 * Strictly forbidden on non-test databases. Enforces multiple layers of safety.
 */
export async function cleanTestDatabase(pool: Pool): Promise<void> {
  const dbNameResult = await pool.query<{ current_database: string }>(
    "SELECT current_database();",
  );
  const currentDb = dbNameResult.rows[0]?.current_database ?? "";

  // Multi-layer safety guard:
  // 1. Explicitly disallow production and development database names
  if (
    currentDb === "zero_brokerage" ||
    currentDb === "postgres" ||
    currentDb === "production"
  ) {
    throw new Error(
      `CRITICAL SAFETY VIOLATION: cleanTestDatabase was invoked on protected database "${currentDb}". Aborting immediately.`,
    );
  }

  // 2. Target database MUST explicitly end with _test or contain test
  if (!currentDb.endsWith("_test") && !currentDb.includes("test")) {
    throw new Error(
      `SAFETY VIOLATION: cleanTestDatabase was called on database "${currentDb}". Destructive reset is only permitted on databases containing "test" in their name.`,
    );
  }

  await pool.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
  `);
}
