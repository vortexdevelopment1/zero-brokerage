import { describe, it, beforeEach, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, type Pool } from "pg";
import {
  runMigrations,
  computeMigrationChecksum,
  normalizeContentForChecksum,
  MigrationChecksumMismatchError,
  MIGRATION_ADVISORY_LOCK_ID,
  type Migration,
} from "../src/index.js";
import { allMigrations } from "../src/migrations/registry.js";
import { createTestPool, cleanTestDatabase, getTestDatabaseUrl } from "./test-config.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const databaseMigrationsDir = path.resolve(currentDir, "../migrations");

describe("PostgreSQL Real Migration Runner Integration Tests", () => {
  let pool: Pool;

  before(async () => {
    pool = await createTestPool();
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    await cleanTestDatabase(pool);
  });

  // =========================================================================
  // TEST 1 — Fresh migration application
  // =========================================================================
  it("TEST 1: applies migrations fresh on empty database with checksums and tables", async () => {
    // Run all official migrations against empty database
    await runMigrations(pool, allMigrations);

    // Verify schema_migrations table contents
    const result = await pool.query<{
      id: string;
      applied_at: Date;
      checksum: string | null;
    }>("SELECT id, applied_at, checksum FROM schema_migrations ORDER BY applied_at ASC;");

    assert.equal(result.rows.length, allMigrations.length);

    for (const migration of allMigrations) {
      const row = result.rows.find((r) => r.id === migration.id);
      assert.ok(row, `Expected migration ${migration.id} to be recorded in schema_migrations`);
      assert.ok(row.checksum, `Expected non-null checksum for migration ${migration.id}`);
      assert.equal(row.checksum.length, 64, "Expected valid 64-char SHA-256 hex checksum");

      const expectedChecksum = computeMigrationChecksum(migration);
      assert.equal(row.checksum, expectedChecksum, `Checksum match for ${migration.id}`);
    }

    // Verify real domain tables exist in PostgreSQL
    const tablesRes = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
    );
    const tableNames = new Set(tablesRes.rows.map((r) => r.table_name));

    assert.ok(tableNames.has("schema_migrations"), "schema_migrations table must exist");
    assert.ok(tableNames.has("auth_identities"), "auth_identities table must exist");
    assert.ok(tableNames.has("user_profiles"), "user_profiles table must exist");
    assert.ok(tableNames.has("auth_sessions"), "auth_sessions table must exist");
    assert.ok(tableNames.has("auth_otp_challenges"), "auth_otp_challenges table must exist");
    assert.ok(tableNames.has("agency_memberships"), "agency_memberships table must exist");
    assert.ok(tableNames.has("broker_verifications"), "broker_verifications table must exist");
    assert.ok(tableNames.has("auth_security_events"), "auth_security_events table must exist");
  });

  // =========================================================================
  // TEST 2 — Idempotent second migration run
  // =========================================================================
  it("TEST 2: running migration runner twice is strictly idempotent with no re-application", async () => {
    // First run
    await runMigrations(pool, allMigrations);

    const firstRunRows = await pool.query<{ id: string; applied_at: Date }>(
      "SELECT id, applied_at FROM schema_migrations ORDER BY id ASC;",
    );
    assert.equal(firstRunRows.rows.length, allMigrations.length);

    // Second run
    await runMigrations(pool, allMigrations);

    const secondRunRows = await pool.query<{ id: string; applied_at: Date }>(
      "SELECT id, applied_at FROM schema_migrations ORDER BY id ASC;",
    );

    assert.equal(secondRunRows.rows.length, allMigrations.length);
    for (let i = 0; i < firstRunRows.rows.length; i++) {
      assert.equal(secondRunRows.rows[i]?.id, firstRunRows.rows[i]?.id);
      assert.equal(
        secondRunRows.rows[i]?.applied_at.getTime(),
        firstRunRows.rows[i]?.applied_at.getTime(),
        "Applied timestamp must not be overwritten or updated on redundant run",
      );
    }
  });

  // =========================================================================
  // TEST 3 — Checksum persistence
  // =========================================================================
  it("TEST 3: persists SHA-256 checksums matching calculated file hashes", async () => {
    await runMigrations(pool, allMigrations);

    const rows = await pool.query<{ id: string; checksum: string }>(
      "SELECT id, checksum FROM schema_migrations;",
    );

    for (const row of rows.rows) {
      assert.ok(row.checksum, `Row ${row.id} must have a checksum`);
      const migration = allMigrations.find((m) => m.id === row.id);
      assert.ok(migration, `Migration ${row.id} must exist in registry`);

      const calculated = computeMigrationChecksum(migration);
      assert.equal(
        row.checksum,
        calculated,
        `Persisted checksum in DB must match calculated hash for ${row.id}`,
      );
    }
  });

  // =========================================================================
  // TEST 4 — Real File Tampering Test
  // =========================================================================
  it("TEST 4: detects tampered applied migration using real on-disk file modification", async () => {
    const tempFileName = "20261001_999_temp_tamper_test.ts";
    const tempFilePath = path.resolve(databaseMigrationsDir, tempFileName);

    const initialContent = `import type { Migration } from "../src/index.js";
export const migration: Migration = {
  id: "20261001_999_temp_tamper_test",
  async up(client) {
    await client.query("CREATE TABLE IF NOT EXISTS temp_tamper_tbl (id INT);");
  },
};
`;

    // 1. Write physical migration file to disk
    fs.writeFileSync(tempFilePath, initialContent, "utf8");

    try {
      const tempMigration: Migration = {
        id: "20261001_999_temp_tamper_test",
        filePath: tempFilePath,
        up: async (client) => {
          await client.query("CREATE TABLE IF NOT EXISTS temp_tamper_tbl (id INT);");
        },
      };

      const originalMigrations = [...allMigrations, tempMigration];

      // 2. Apply migrations with initial file content
      await runMigrations(pool, originalMigrations);

      // Verify checksum was recorded from real file
      const beforeResult = await pool.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE id = $1;",
        [tempMigration.id],
      );
      const originalChecksum = beforeResult.rows[0]?.checksum;
      assert.ok(originalChecksum);
      assert.equal(originalChecksum, computeMigrationChecksum(tempMigration));

      // 3. Physically tamper with the file on disk
      const tamperedContent = initialContent + "\n// Malicious or unauthorized change post-application\n";
      fs.writeFileSync(tempFilePath, tamperedContent, "utf8");

      // Verify that the on-disk checksum has now genuinely changed
      const tamperedChecksum = computeMigrationChecksum(tempMigration);
      assert.notEqual(originalChecksum, tamperedChecksum);

      // 4. Runner must detect mismatch between recorded DB checksum and real on-disk file
      await assert.rejects(
        async () => {
          await runMigrations(pool, originalMigrations);
        },
        (err: unknown) => {
          assert.ok(err instanceof MigrationChecksumMismatchError);
          assert.equal(err.migrationId, tempMigration.id);
          assert.equal(err.storedChecksum, originalChecksum);
          assert.equal(err.currentChecksum, tamperedChecksum);
          return true;
        },
      );

      // 5. Stored checksum in DB must NOT be overwritten
      const afterResult = await pool.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE id = $1;",
        [tempMigration.id],
      );
      assert.equal(afterResult.rows[0]?.checksum, originalChecksum);
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  // =========================================================================
  // TEST 5 — New migration gets checksum
  // =========================================================================
  it("TEST 5: new migration executes, creates table, and persists calculated checksum", async () => {
    // Apply initial slice
    await runMigrations(pool, allMigrations);

    // Add a controlled new migration
    const newMigration: Migration = {
      id: "20261001_003_test_features",
      up: async (client) => {
        await client.query(`
          CREATE TABLE IF NOT EXISTS test_features (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(50) NOT NULL
          );
        `);
      },
    };

    const combinedMigrations = [...allMigrations, newMigration];

    await runMigrations(pool, combinedMigrations);

    // Verify test_features table exists
    const checkTable = await pool.query(
      `SELECT to_regclass('public.test_features') as exists;`,
    );
    assert.ok(checkTable.rows[0]?.exists);

    // Verify checksum was persisted
    const record = await pool.query<{ id: string; checksum: string }>(
      "SELECT id, checksum FROM schema_migrations WHERE id = $1;",
      [newMigration.id],
    );
    assert.equal(record.rows.length, 1);
    assert.ok(record.rows[0]?.checksum);
    assert.equal(
      record.rows[0]?.checksum,
      computeMigrationChecksum(newMigration),
    );
  });

  // =========================================================================
  // TEST 6 — Failed migration rollback
  // =========================================================================
  it("TEST 6: failed migration rolls back DDL and is not recorded in schema_migrations", async () => {
    const failingMigration: Migration = {
      id: "20261001_004_test_failing",
      up: async (client) => {
        await client.query("CREATE TABLE test_failing_marker (id INT);");
        // Force intentional SQL error
        throw new Error("Simulated failure during migration execution");
      },
    };

    const migrationsToRun = [...allMigrations, failingMigration];

    await assert.rejects(
      async () => {
        await runMigrations(pool, migrationsToRun);
      },
      /Simulated failure during migration execution/,
    );

    // Verify marker table was rolled back and does NOT exist
    const markerTable = await pool.query(
      `SELECT to_regclass('public.test_failing_marker') as exists;`,
    );
    assert.equal(
      markerTable.rows[0]?.exists,
      null,
      "Table created in failed migration transaction must be rolled back",
    );

    // Verify migration was not recorded as applied
    const recorded = await pool.query(
      "SELECT id FROM schema_migrations WHERE id = $1;",
      [failingMigration.id],
    );
    assert.equal(recorded.rows.length, 0);
  });

  // =========================================================================
  // TEST 7 — Duplicate migration ID
  // =========================================================================
  it("TEST 7: fails before executing when duplicate migration IDs are provided", async () => {
    const duplicateMigrations: Migration[] = [
      ...allMigrations,
      {
        id: allMigrations[0]!.id, // duplicate
        up: async () => {},
      },
    ];

    await assert.rejects(
      async () => {
        await runMigrations(pool, duplicateMigrations);
      },
      /Duplicate migration ID detected/,
    );

    // schema_migrations table should not even have been created
    const checkTable = await pool.query(
      `SELECT to_regclass('public.schema_migrations') as exists;`,
    );
    assert.equal(checkTable.rows[0]?.exists, null);
  });

  // =========================================================================
  // TEST 8 — Concurrent migration execution (Advisory Lock)
  // =========================================================================
  it("TEST 8: advisory lock prevents concurrent execution race and duplicates", async () => {
    // Launch two migration runner executions against the same database concurrently
    const [res1, res2] = await Promise.allSettled([
      runMigrations(pool, allMigrations),
      runMigrations(pool, allMigrations),
    ]);

    assert.equal(res1.status, "fulfilled", "Runner 1 must succeed");
    assert.equal(res2.status, "fulfilled", "Runner 2 must succeed");

    // Verify exact migration count and zero duplicate rows
    const rows = await pool.query<{ id: string }>(
      "SELECT id FROM schema_migrations;",
    );
    assert.equal(rows.rows.length, allMigrations.length);

    const ids = rows.rows.map((r) => r.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, "No duplicate migration rows in DB");
  });

  // =========================================================================
  // TEST 9 — Lock release after success
  // =========================================================================
  it("TEST 9: lock is reliably released after successful migration execution", async () => {
    // Run initial migrations
    await runMigrations(pool, allMigrations);

    // Test that another connection can immediately acquire the same advisory lock
    const client = await pool.connect();
    try {
      const lockRes = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1::bigint) as acquired;",
        [MIGRATION_ADVISORY_LOCK_ID],
      );
      assert.equal(
        lockRes.rows[0]?.acquired,
        true,
        "Advisory lock must be free and acquirable immediately after runner finishes",
      );

      // Clean up lock
      await client.query("SELECT pg_advisory_unlock($1::bigint);", [
        MIGRATION_ADVISORY_LOCK_ID,
      ]);
    } finally {
      client.release();
    }
  });

  // =========================================================================
  // TEST 10 — Lock release after failure
  // =========================================================================
  it("TEST 10: lock is reliably released even when a migration runner throws an error", async () => {
    const failingMigration: Migration = {
      id: "20261001_005_failing_lock_test",
      up: async () => {
        throw new Error("Forced failure to verify lock release in finally block");
      },
    };

    // Runner fails
    await assert.rejects(async () => {
      await runMigrations(pool, [...allMigrations, failingMigration]);
    });

    // Test that the advisory lock is completely free
    const client = await pool.connect();
    try {
      const lockRes = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1::bigint) as acquired;",
        [MIGRATION_ADVISORY_LOCK_ID],
      );
      assert.equal(
        lockRes.rows[0]?.acquired,
        true,
        "Advisory lock must be released even after migration failure (no permanent lock leak)",
      );

      await client.query("SELECT pg_advisory_unlock($1::bigint);", [
        MIGRATION_ADVISORY_LOCK_ID,
      ]);
    } finally {
      client.release();
    }
  });

  // =========================================================================
  // TEST 11 — CRLF / LF Checksum Determinism Test
  // =========================================================================
  it("TEST 11: proves CRLF, LF, and UTF-8 BOM produce identical SHA-256 checksums", () => {
    const lfContent = "CREATE TABLE example (\n  id UUID PRIMARY KEY\n);\n";
    const crlfContent = "CREATE TABLE example (\r\n  id UUID PRIMARY KEY\r\n);\r\n";
    const bomCrlfContent = "\uFEFFCREATE TABLE example (\r\n  id UUID PRIMARY KEY\r\n);\r\n";

    const normalizedLf = normalizeContentForChecksum(lfContent);
    const normalizedCrlf = normalizeContentForChecksum(crlfContent);
    const normalizedBom = normalizeContentForChecksum(bomCrlfContent);

    assert.equal(normalizedLf, normalizedCrlf, "CRLF and LF must normalize to identical content");
    assert.equal(normalizedLf, normalizedBom, "UTF-8 BOM must be stripped");

    // Meaningful difference must produce different content
    const modifiedContent = "CREATE TABLE example (\n  id BIGINT PRIMARY KEY\n);\n";
    assert.notEqual(
      normalizeContentForChecksum(lfContent),
      normalizeContentForChecksum(modifiedContent),
    );
  });

  // =========================================================================
  // TEST 12 — Session Advisory Lock Ownership & Cross-Session Rejection
  // =========================================================================
  it("TEST 12: proves session B cannot release session A's advisory lock", async () => {
    const clientA = await pool.connect();
    const clientB = await pool.connect();

    try {
      const testLockId = "9988776655";
      // Client A acquires lock
      await clientA.query("SELECT pg_advisory_lock($1::bigint);", [testLockId]);

      // Client B attempts to unlock Client A's lock
      const unlockResB = await clientB.query<{ unlocked: boolean }>(
        "SELECT pg_advisory_unlock($1::bigint) as unlocked;",
        [testLockId],
      );
      assert.equal(
        unlockResB.rows[0]?.unlocked,
        false,
        "PostgreSQL must reject cross-session advisory unlock attempt",
      );

      // Client A unlocks its own lock
      const unlockResA = await clientA.query<{ unlocked: boolean }>(
        "SELECT pg_advisory_unlock($1::bigint) as unlocked;",
        [testLockId],
      );
      assert.equal(
        unlockResA.rows[0]?.unlocked,
        true,
        "Owning session must be permitted to unlock",
      );
    } finally {
      clientA.release();
      clientB.release();
    }
  });

  // =========================================================================
  // TEST 13 — Abrupt Socket Disconnect Automatic Lock Release
  // =========================================================================
  it("TEST 13: proves PostgreSQL automatically drops advisory lock on abrupt client socket drop", async () => {
    const testLockId = "7766554433";
    // Connect standalone Client (NOT from shared pool) so socket destroy doesn't corrupt pool state
    const standaloneClient = new Client({ connectionString: await getTestDatabaseUrl() });
    await standaloneClient.connect();
    standaloneClient.on("error", () => {}); // Suppress expected error on destroy

    await standaloneClient.query("SELECT pg_advisory_lock($1::bigint);", [testLockId]);

    // Abruptly destroy the underlying socket stream (simulating process crash / SIGKILL)
    (standaloneClient as any).connection.stream.destroy();

    // Small delay to allow TCP teardown on PostgreSQL server
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Client B must now be able to acquire the lock immediately
    const clientB = await pool.connect();
    try {
      const resB = await clientB.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1::bigint) as acquired;",
        [testLockId],
      );
      assert.equal(
        resB.rows[0]?.acquired,
        true,
        "PostgreSQL must automatically release session advisory lock upon connection drop",
      );

      await clientB.query("SELECT pg_advisory_unlock($1::bigint);", [testLockId]);
    } finally {
      clientB.release();
    }
  });

  // =========================================================================
  // TEST 14 — Connection Pool Constraint & Deadlock Freedom
  // =========================================================================
  it("TEST 14: proves runners do not deadlock even on constrained pool (max: 2)", async () => {
    // Create a constrained test pool with max: 2 connections
    const constrainedPool = await (await import("./test-config.js")).createTestPool({ max: 2 });

    try {
      // Launch 3 concurrent migration runs simultaneously on a pool of only 2 connections
      const results = await Promise.allSettled([
        runMigrations(constrainedPool, allMigrations),
        runMigrations(constrainedPool, allMigrations),
        runMigrations(constrainedPool, allMigrations),
      ]);

      for (const res of results) {
        assert.equal(
          res.status,
          "fulfilled",
          "All runners must complete without pool exhaustion deadlock",
        );
      }
    } finally {
      await constrainedPool.end();
    }
  });
});
