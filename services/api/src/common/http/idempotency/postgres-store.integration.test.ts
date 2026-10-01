import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Pool } from "pg";
import {
  createDatabasePool,
  withTransaction,
  insertOutboxEvent,
} from "@zero-brokerage/database";
import { PostgresIdempotencyStore } from "./postgres-store.js";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/zero_brokerage_test";

describe("PostgresIdempotencyStore Integration Tests (Real PostgreSQL)", () => {
  let pool: Pool;
  let store: PostgresIdempotencyStore;

  before(async () => {
    pool = createDatabasePool({
      connectionString: TEST_DB_URL,
      maxConnections: 10,
    });
    store = new PostgresIdempotencyStore(pool);
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    await pool.query(`
      TRUNCATE TABLE
        idempotency_keys,
        outbox_events,
        auth_identities
      CASCADE;
    `);
  });

  it("1. Fresh claim persists IN_PROGRESS state and returns claimed: true", async () => {
    const claim = await store.claimKey({
      key: "key_fresh_001_12345678",
      scope: "actor:user_101",
      fingerprint: "sha256_fp_101",
      ttlMs: 3600000,
    });

    assert.equal(claim.claimed, true);
    assert.equal(claim.existingRecord, undefined);

    const record = await store.getRecord({
      key: "key_fresh_001_12345678",
      scope: "actor:user_101",
    });
    assert.ok(record);
    assert.equal(record.status, "IN_PROGRESS");
    assert.equal(record.key, "key_fresh_001_12345678");
    assert.equal(record.scope, "actor:user_101");
    assert.equal(record.fingerprint, "sha256_fp_101");
  });

  it("2. Duplicate active claim with same fingerprint returns claimed: false and existing record", async () => {
    await store.claimKey({
      key: "key_dup_002_12345678",
      scope: "actor:user_102",
      fingerprint: "sha256_fp_102",
      ttlMs: 3600000,
    });

    const secondClaim = await store.claimKey({
      key: "key_dup_002_12345678",
      scope: "actor:user_102",
      fingerprint: "sha256_fp_102",
      ttlMs: 3600000,
    });

    assert.equal(secondClaim.claimed, false);
    assert.ok(secondClaim.existingRecord);
    assert.equal(secondClaim.existingRecord.status, "IN_PROGRESS");
    assert.equal(secondClaim.existingRecord.fingerprint, "sha256_fp_102");
  });

  it("3. Duplicate claim with different fingerprint preserves existing record for mismatch detection", async () => {
    await store.claimKey({
      key: "key_mismatch_003_12345678",
      scope: "actor:user_103",
      fingerprint: "sha256_original_fp",
      ttlMs: 3600000,
    });

    const secondClaim = await store.claimKey({
      key: "key_mismatch_003_12345678",
      scope: "actor:user_103",
      fingerprint: "sha256_different_fp",
      ttlMs: 3600000,
    });

    assert.equal(secondClaim.claimed, false);
    assert.ok(secondClaim.existingRecord);
    assert.equal(secondClaim.existingRecord.fingerprint, "sha256_original_fp");
    assert.notEqual(
      secondClaim.existingRecord.fingerprint,
      "sha256_different_fp",
    );
  });

  it("4. Completion transitions record to COMPLETED with status code and JSON response body", async () => {
    await store.claimKey({
      key: "key_complete_004_12345678",
      scope: "actor:user_104",
      fingerprint: "sha256_fp_104",
      ttlMs: 3600000,
    });

    await store.completeKey({
      key: "key_complete_004_12345678",
      scope: "actor:user_104",
      statusCode: 201,
      responseBody: { success: true, bookingId: "bk_999" },
    });

    const record = await store.getRecord({
      key: "key_complete_004_12345678",
      scope: "actor:user_104",
    });

    assert.ok(record);
    assert.equal(record.status, "COMPLETED");
    assert.equal(record.statusCode, 201);
    assert.deepEqual(record.responseBody, {
      success: true,
      bookingId: "bk_999",
    });
  });

  it("5. Replay persistence correctly returns completed status and payload on subsequent lookups", async () => {
    await store.claimKey({
      key: "key_replay_005_12345678",
      scope: "actor:user_105",
      fingerprint: "sha256_fp_105",
      ttlMs: 3600000,
    });

    await store.completeKey({
      key: "key_replay_005_12345678",
      scope: "actor:user_105",
      statusCode: 200,
      responseBody: { data: { orderId: "ord_555" } },
    });

    const recheck = await store.claimKey({
      key: "key_replay_005_12345678",
      scope: "actor:user_105",
      fingerprint: "sha256_fp_105",
      ttlMs: 3600000,
    });

    assert.equal(recheck.claimed, false);
    assert.ok(recheck.existingRecord);
    assert.equal(recheck.existingRecord.status, "COMPLETED");
    assert.equal(recheck.existingRecord.statusCode, 200);
    assert.deepEqual(recheck.existingRecord.responseBody, {
      data: { orderId: "ord_555" },
    });
  });

  it("6. FAILED state marks record as FAILED via failKey", async () => {
    await store.claimKey({
      key: "key_failed_006_12345678",
      scope: "actor:user_106",
      fingerprint: "sha256_fp_106",
      ttlMs: 3600000,
    });

    await store.failKey({
      key: "key_failed_006_12345678",
      scope: "actor:user_106",
      errorReason: "Payment gateway timeout",
    });

    const record = await store.getRecord({
      key: "key_failed_006_12345678",
      scope: "actor:user_106",
    });

    assert.ok(record);
    assert.equal(record.status, "FAILED");
  });

  it("7. FAILED -> successful retry allows re-claiming and completing successfully", async () => {
    const key = "key_retry_007_12345678";
    const scope = "actor:user_107";
    const fingerprint = "sha256_fp_retry_107";

    // 1. Initial attempt fails
    await store.claimKey({ key, scope, fingerprint, ttlMs: 3600000 });
    await store.failKey({ key, scope });

    const failedRecord = await store.getRecord({ key, scope });
    assert.equal(failedRecord?.status, "FAILED");

    // 2. Retry with same key, scope, and fingerprint reclaims key in IN_PROGRESS
    const retryClaim = await store.claimKey({
      key,
      scope,
      fingerprint,
      ttlMs: 3600000,
    });
    assert.equal(retryClaim.claimed, true);

    // 3. Retry completes successfully
    await store.completeKey({
      key,
      scope,
      statusCode: 200,
      responseBody: { retrySuccess: true },
    });

    const finalRecord = await store.getRecord({ key, scope });
    assert.ok(finalRecord);
    assert.equal(finalRecord.status, "COMPLETED");
    assert.equal(finalRecord.statusCode, 200);
    assert.deepEqual(finalRecord.responseBody, { retrySuccess: true });
  });

  it("8. Expired key reclamation reclaims slot and updates created_at to current timestamp", async () => {
    const key = "key_expired_008_12345678";
    const scope = "actor:user_108";
    const fingerprint = "sha256_fp_108";

    // 1. Seed an already-expired record directly with past timestamp
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    await pool.query(
      `INSERT INTO idempotency_keys (scope, key, fingerprint, status, created_at, updated_at, expires_at)
       VALUES ($1, $2, $3, 'COMPLETED', $4, $4, $4);`,
      [scope, key, fingerprint, pastDate],
    );

    const oldRecord = await store.getRecord({ key, scope });
    assert.ok(oldRecord);
    assert.equal(oldRecord.createdAt, pastDate.getTime());

    // 2. Claim expired key
    const newClaim = await store.claimKey({
      key,
      scope,
      fingerprint: "sha256_fp_new_108",
      ttlMs: 7200000,
    });

    assert.equal(newClaim.claimed, true);

    const reclaimedRecord = await store.getRecord({ key, scope });
    assert.ok(reclaimedRecord);
    assert.equal(reclaimedRecord.status, "IN_PROGRESS");
    assert.equal(reclaimedRecord.fingerprint, "sha256_fp_new_108");
    // Verify created_at was refreshed to NOW() and is not the stale past timestamp
    assert.ok(
      reclaimedRecord.createdAt > pastDate.getTime(),
      "created_at must be refreshed upon reclamation",
    );
  });

  it("9. Unexpired key cannot be reclaimed by a new claim", async () => {
    const key = "key_unexpired_009_12345678";
    const scope = "actor:user_109";
    const fingerprint = "sha256_fp_109";

    await store.claimKey({ key, scope, fingerprint, ttlMs: 3600000 });

    const secondClaim = await store.claimKey({
      key,
      scope,
      fingerprint,
      ttlMs: 3600000,
    });

    assert.equal(secondClaim.claimed, false);
    assert.ok(secondClaim.existingRecord);
    assert.equal(secondClaim.existingRecord.status, "IN_PROGRESS");
  });

  it("10. Concurrent claims across separate database clients result in exactly ONE claimant", async () => {
    const key = "key_concurrent_010_12345678";
    const scope = "actor:user_110";
    const fingerprint = "sha256_fp_concurrent";

    // Create 2 independent client connections from pool
    const client1 = await pool.connect();
    const client2 = await pool.connect();

    try {
      // Launch two claims concurrently
      const [res1, res2] = await Promise.all([
        store.claimKey({
          key,
          scope,
          fingerprint,
          ttlMs: 60000,
          executor: client1,
        }),
        store.claimKey({
          key,
          scope,
          fingerprint,
          ttlMs: 60000,
          executor: client2,
        }),
      ]);

      // Exactly one must be claimed: true, other must be claimed: false
      const winnerCount = (res1.claimed ? 1 : 0) + (res2.claimed ? 1 : 0);
      assert.equal(winnerCount, 1, "Exactly one concurrent claim must succeed");

      const loser = res1.claimed ? res2 : res1;
      assert.equal(loser.claimed, false);
      assert.equal(loser.existingRecord?.status, "IN_PROGRESS");
    } finally {
      client1.release();
      client2.release();
    }
  });

  it("11. Transaction rollback completely removes claimKey state", async () => {
    const key = "key_rollback_011_12345678";
    const scope = "actor:user_111";
    const fingerprint = "sha256_fp_rollback";

    await assert.rejects(async () => {
      await withTransaction(pool, async (tx) => {
        const claim = await store.claimKey({
          key,
          scope,
          fingerprint,
          ttlMs: 60000,
          executor: tx,
        });
        assert.equal(claim.claimed, true);

        // Simulated business mutation crash
        throw new Error("Business mutation failed abruptly");
      });
    }, /Business mutation failed abruptly/);

    // Verify key was rolled back and is NOT present in database
    const record = await store.getRecord({ key, scope });
    assert.equal(record, undefined, "Rolled back key must not exist in DB");

    // Proves client can re-claim the key immediately after failure
    const freshClaim = await store.claimKey({
      key,
      scope,
      fingerprint,
      ttlMs: 60000,
    });
    assert.equal(freshClaim.claimed, true);
  });

  it("12. Atomic rollback: claim + business write + outbox + complete roll back completely on failure", async () => {
    const key = "key_atomic_012_12345678";
    const scope = "actor:user_112";
    const fingerprint = "sha256_fp_atomic";
    let identityId = "";

    await assert.rejects(async () => {
      await withTransaction(pool, async (tx) => {
        // 1. Claim
        await store.claimKey({
          key,
          scope,
          fingerprint,
          ttlMs: 60000,
          executor: tx,
        });

        // 2. Business mutation
        const res = await tx.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
          ["+919111222333", "USER"],
        );
        identityId = res.rows[0]!.id;

        // 3. Outbox event
        await insertOutboxEvent(tx, {
          eventName: "USER_REGISTERED",
          aggregateId: identityId,
          correlationId: "corr_atomic_rollback",
          payload: { phone: "+919111222333" },
        });

        // 4. Complete idempotency
        await store.completeKey({
          key,
          scope,
          statusCode: 201,
          responseBody: { success: true },
          executor: tx,
        });

        // 5. Fatal crash right before commit
        throw new Error("Crash right before commit");
      });
    }, /Crash right before commit/);

    // Verify NONE of the 3 components persisted
    const idCheck = await pool.query(
      "SELECT * FROM auth_identities WHERE id = $1;",
      [identityId],
    );
    assert.equal(
      idCheck.rows.length,
      0,
      "Business mutation must be rolled back",
    );

    const outboxCheck = await pool.query(
      "SELECT * FROM outbox_events WHERE aggregate_id = $1;",
      [identityId],
    );
    assert.equal(
      outboxCheck.rows.length,
      0,
      "Outbox event must be rolled back",
    );

    const idemCheck = await store.getRecord({ key, scope });
    assert.equal(
      idemCheck,
      undefined,
      "Idempotency completion must be rolled back",
    );
  });
});
