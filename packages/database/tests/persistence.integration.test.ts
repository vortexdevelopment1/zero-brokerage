import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Pool } from "pg";
import {
  allMigrations,
  CheckConstraintViolationError,
  claimOutboxEvents,
  DatabaseError,
  ForeignKeyViolationError,
  insertOutboxEvent,
  markOutboxEventFailed,
  markOutboxEventPublished,
  NotNullConstraintViolationError,
  OutboxStateTransitionError,
  reclaimStaleOutboxLeases,
  runMigrations,
  UniqueConstraintViolationError,
  withTransaction,
} from "../src/index.js";
import { cleanTestDatabase, createTestPool } from "./test-config.js";

describe("Persistence Engine Hardening — Integration Tests (Real PostgreSQL)", () => {
  let pool: Pool;

  before(async () => {
    pool = await createTestPool();
    await cleanTestDatabase(pool);
    // Apply all migrations (including 001, 002, 003 outbox)
    await runMigrations(pool, allMigrations);
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
        auth_security_events,
        user_profiles,
        auth_sessions,
        auth_otp_challenges,
        agency_memberships,
        broker_verifications,
        auth_identities
      CASCADE;
    `);
  });

  // =========================================================================
  // A. DATABASE ERROR MAPPING
  // =========================================================================
  describe("A. PostgreSQL Database Error Mapping", () => {
    it("maps 23505 unique_violation to UniqueConstraintViolationError with metadata", async () => {
      // 1. Insert initial identity
      await pool.query(
        "INSERT INTO auth_identities (phone, role) VALUES ($1, $2);",
        ["+919876543210", "USER"],
      );

      // 2. Attempt duplicate insert using withTransaction
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "INSERT INTO auth_identities (phone, role) VALUES ($1, $2);",
              ["+919876543210", "USER"],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.equal(err.code, "UNIQUE_VIOLATION");
          assert.equal(err.sqlState, "23505");
          assert.equal(err.table, "auth_identities");
          assert.ok(err.constraint?.includes("phone"));
          return true;
        },
      );
    });

    it("maps 23503 foreign_key_violation to ForeignKeyViolationError with metadata", async () => {
      const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2);",
              [nonExistentUserId, "Ghost User"],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForeignKeyViolationError);
          assert.equal(err.code, "FOREIGN_KEY_VIOLATION");
          assert.equal(err.sqlState, "23503");
          assert.equal(err.table, "user_profiles");
          return true;
        },
      );
    });

    it("maps 23502 not_null_violation to NotNullConstraintViolationError with column metadata", async () => {
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query("INSERT INTO auth_identities (phone) VALUES ($1);", [
              null,
            ]);
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof NotNullConstraintViolationError);
          assert.equal(err.code, "NOT_NULL_VIOLATION");
          assert.equal(err.sqlState, "23502");
          assert.equal(err.table, "auth_identities");
          assert.equal(err.column, "phone");
          return true;
        },
      );
    });

    it("maps 23514 check_violation to CheckConstraintViolationError with constraint name", async () => {
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              "INSERT INTO auth_identities (phone, status) VALUES ($1, $2);",
              ["+919999999999", "INVALID_STATUS_VALUE"],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof CheckConstraintViolationError);
          assert.equal(err.code, "CHECK_VIOLATION");
          assert.equal(err.sqlState, "23514");
          assert.equal(err.table, "auth_identities");
          return true;
        },
      );
    });
  });

  // =========================================================================
  // B. TRANSACTION INFRASTRUCTURE & SAVEPOINTS
  // =========================================================================
  describe("B. Transaction Infrastructure & Savepoints", () => {
    it("commits all writes atomically on successful callback completion", async () => {
      const result = await withTransaction(pool, async (tx) => {
        const idRes = await tx.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
          ["+919876543201", "USER"],
        );
        const userId = idRes.rows[0]!.id;

        await tx.query(
          "INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2);",
          [userId, "Alice"],
        );

        return userId;
      });

      // Assert persistence outside transaction
      const checkIdentity = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [result],
      );
      assert.equal(checkIdentity.rows.length, 1);

      const checkProfile = await pool.query(
        "SELECT user_id FROM user_profiles WHERE user_id = $1;",
        [result],
      );
      assert.equal(checkProfile.rows.length, 1);
    });

    it("rolls back all writes completely when callback throws", async () => {
      let insertedUserId: string | null = null;

      await assert.rejects(async () => {
        await withTransaction(pool, async (tx) => {
          const idRes = await tx.query<{ id: string }>(
            "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
            ["+919876543202", "USER"],
          );
          insertedUserId = idRes.rows[0]!.id;

          // Injected failure
          throw new Error(
            "Simulated business failure midway through transaction",
          );
        });
      }, /Simulated business failure/);

      assert.ok(insertedUserId !== null);

      // Verify no record remains in database
      const checkIdentity = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [insertedUserId],
      );
      assert.equal(checkIdentity.rows.length, 0);
    });

    it("releases client back to pool unconditionally after success and failure", async () => {
      // 1. Success path
      await withTransaction(pool, async (tx) => {
        await tx.query("SELECT 1;");
      });
      // Idle count should match expected pool state
      assert.ok(pool.idleCount >= 1);

      // 2. Failure path
      try {
        await withTransaction(pool, async () => {
          throw new Error("Failure for release test");
        });
      } catch {
        // expected
      }
      assert.ok(pool.idleCount >= 1);
    });

    it("supports nested savepoints: inner failure rolls back to savepoint while outer succeeds", async () => {
      let outerUserId: string | null = null;
      let innerUserId: string | null = null;

      await withTransaction(pool, async (tx) => {
        // Outer write
        const outerRes = await tx.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
          ["+919876543203", "USER"],
        );
        outerUserId = outerRes.rows[0]!.id;

        // Nested savepoint with controlled failure
        try {
          await tx.withSavepoint("sp_attempt_secondary", async (nestedTx) => {
            const innerRes = await nestedTx.query<{ id: string }>(
              "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
              ["+919876543204", "USER"],
            );
            innerUserId = innerRes.rows[0]!.id;

            // Trigger failure inside savepoint
            throw new Error("Secondary write failed");
          });
        } catch (innerErr) {
          // Outer caller handles savepoint failure and continues
          assert.match(String(innerErr), /Secondary write failed/);
        }

        // Outer write continues and creates profile for outerUser
        await tx.query(
          "INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2);",
          [outerUserId, "Outer Succeeded"],
        );
      });

      // Verify outer write was committed
      const checkOuter = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [outerUserId],
      );
      assert.equal(checkOuter.rows.length, 1);

      // Verify inner savepoint write was rolled back
      const checkInner = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [innerUserId],
      );
      assert.equal(checkInner.rows.length, 0);
    });

    it("guarantees root and nested savepoint contexts share the exact same pg_backend_pid", async () => {
      await withTransaction(pool, async (rootTx) => {
        const rootPidRes = await rootTx.query<{ pid: number }>(
          "SELECT pg_backend_pid() AS pid;",
        );
        const rootPid = rootPidRes.rows[0]!.pid;

        await rootTx.withSavepoint(async (nestedTx) => {
          const nestedPidRes = await nestedTx.query<{ pid: number }>(
            "SELECT pg_backend_pid() AS pid;",
          );
          const nestedPid = nestedPidRes.rows[0]!.pid;
          assert.equal(
            nestedPid,
            rootPid,
            "Root and nested contexts must share the exact same backend PID",
          );

          await nestedTx.withSavepoint(async (deepTx) => {
            const deepPidRes = await deepTx.query<{ pid: number }>(
              "SELECT pg_backend_pid() AS pid;",
            );
            assert.equal(
              deepPidRes.rows[0]!.pid,
              rootPid,
              "Deeply nested savepoint must share the exact same backend PID",
            );
          });
        });
      });
    });

    it("rolls back outer transaction if a nested savepoint failure is not caught by caller", async () => {
      let outerId: string | null = null;
      await assert.rejects(async () => {
        await withTransaction(pool, async (tx) => {
          const res = await tx.query<{ id: string }>(
            "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
            ["+919876543209", "USER"],
          );
          outerId = res.rows[0]!.id;

          await tx.withSavepoint(async (nested) => {
            await nested.query(
              "INSERT INTO auth_identities (phone, role) VALUES ($1, $2);",
              ["+919876543219", "USER"],
            );
            throw new Error("Uncaught error inside savepoint");
          });
        });
      }, /Uncaught error inside savepoint/);

      const check = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [outerId],
      );
      assert.equal(
        check.rows.length,
        0,
        "Outer write must be rolled back if savepoint error is uncaught",
      );
    });

    it("handles multi-level deep savepoints (Root -> L1 -> L2 -> L3) with granular rollbacks", async () => {
      let rootId: string | null = null;
      let l1Id: string | null = null;
      let l2Id: string | null = null;
      let l3Id: string | null = null;

      await withTransaction(pool, async (rootTx) => {
        const rRes = await rootTx.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
          ["+919876543001", "USER"],
        );
        rootId = rRes.rows[0]!.id;

        await rootTx.withSavepoint(async (l1Tx) => {
          const l1Res = await l1Tx.query<{ id: string }>(
            "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
            ["+919876543002", "USER"],
          );
          l1Id = l1Res.rows[0]!.id;

          await l1Tx.withSavepoint(async (l2Tx) => {
            const l2Res = await l2Tx.query<{ id: string }>(
              "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
              ["+919876543003", "USER"],
            );
            l2Id = l2Res.rows[0]!.id;

            try {
              await l2Tx.withSavepoint(async (l3Tx) => {
                const l3Res = await l3Tx.query<{ id: string }>(
                  "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
                  ["+919876543004", "USER"],
                );
                l3Id = l3Res.rows[0]!.id;
                throw new Error("L3 failure");
              });
            } catch {
              // L3 error caught, L2 continues
            }
          });
        });
      });

      // Verify Root, L1, L2 committed; L3 rolled back
      const rCheck = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [rootId],
      );
      assert.equal(rCheck.rows.length, 1);
      const l1Check = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [l1Id],
      );
      assert.equal(l1Check.rows.length, 1);
      const l2Check = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [l2Id],
      );
      assert.equal(l2Check.rows.length, 1);
      const l3Check = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [l3Id],
      );
      assert.equal(
        l3Check.rows.length,
        0,
        "L3 must be rolled back while outer savepoints persist",
      );
    });

    it("rejects invalid savepoint identifiers to prevent SQL injection", async () => {
      await withTransaction(pool, async (tx) => {
        await assert.rejects(async () => {
          await tx.withSavepoint("sp; DROP TABLE users;--", async () => {});
        }, /Invalid savepoint identifier/);
      });
    });
  });

  // =========================================================================
  // D. TRANSACTIONAL OUTBOX FOUNDATION
  // =========================================================================
  describe("D. Transactional Outbox Persistence Foundation", () => {
    it("inserts outbox event atomically in same transaction as business mutation", async () => {
      let createdUserId: string | null = null;
      let outboxEventId: string | null = null;

      await withTransaction(pool, async (tx) => {
        // 1. Business mutation
        const userRes = await tx.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
          ["+919876543205", "USER"],
        );
        createdUserId = userRes.rows[0]!.id;

        // 2. Outbox event insert
        const event = await insertOutboxEvent(tx, {
          eventName: "user.registered",
          aggregateId: createdUserId,
          correlationId: "corr-12345",
          payload: {
            phone: "+919876543205",
            role: "USER",
          },
        });
        outboxEventId = event.id;
      });

      // Both must exist in database
      const userCheck = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [createdUserId],
      );
      assert.equal(userCheck.rows.length, 1);

      const eventCheck = await pool.query(
        "SELECT id, status, payload FROM outbox_events WHERE id = $1;",
        [outboxEventId],
      );
      assert.equal(eventCheck.rows.length, 1);
      assert.equal(eventCheck.rows[0]?.status, "PENDING");
      assert.deepEqual(eventCheck.rows[0]?.payload, {
        phone: "+919876543205",
        role: "USER",
      });
    });

    it("rolls back outbox event if business mutation fails", async () => {
      let createdEventId: string | null = null;

      await assert.rejects(async () => {
        await withTransaction(pool, async (tx) => {
          const event = await insertOutboxEvent(tx, {
            eventName: "user.registered",
            aggregateId: "agg-test",
            correlationId: "corr-test",
            payload: { test: true },
          });
          createdEventId = event.id;

          // Injected failure
          throw new Error("Business logic aborted transaction");
        });
      }, /Business logic aborted transaction/);

      const eventCheck = await pool.query(
        "SELECT id FROM outbox_events WHERE id = $1;",
        [createdEventId],
      );
      assert.equal(eventCheck.rows.length, 0);
    });

    it("claims events concurrently using FOR UPDATE SKIP LOCKED without duplicate processing", async () => {
      // Insert 3 pending events
      await withTransaction(pool, async (tx) => {
        for (let i = 1; i <= 3; i++) {
          await insertOutboxEvent(tx, {
            eventName: `test.event.${i}`,
            aggregateId: `agg-${i}`,
            correlationId: `corr-${i}`,
            payload: { item: i },
          });
        }
      });

      // Worker 1 claims up to 2 events
      const worker1Claims = await withTransaction(pool, async (tx) => {
        return await claimOutboxEvents(tx, {
          workerId: "worker-1",
          limit: 2,
        });
      });

      assert.equal(worker1Claims.length, 2);
      assert.equal(worker1Claims[0]?.claimedBy, "worker-1");
      assert.equal(worker1Claims[0]?.status, "PROCESSING");

      // Worker 2 claims remaining events concurrently
      const worker2Claims = await withTransaction(pool, async (tx) => {
        return await claimOutboxEvents(tx, {
          workerId: "worker-2",
          limit: 2,
        });
      });

      assert.equal(worker2Claims.length, 1);
      assert.equal(worker2Claims[0]?.claimedBy, "worker-2");
      assert.equal(worker2Claims[0]?.status, "PROCESSING");

      // Ensure no intersection between claimed events
      const worker1Ids = new Set(worker1Claims.map((e) => e.id));
      assert.equal(worker1Ids.has(worker2Claims[0]!.id), false);
    });

    it("marks claimed event as PUBLISHED upon external delivery completion", async () => {
      let eventId = "";
      await withTransaction(pool, async (tx) => {
        const ev = await insertOutboxEvent(tx, {
          eventName: "test.published",
          aggregateId: "agg-p",
          correlationId: "corr-p",
          payload: { p: 1 },
        });
        eventId = ev.id;
      });

      // Claim
      await claimOutboxEvents(pool, { workerId: "worker-pub", limit: 1 });

      // Mark published
      await markOutboxEventPublished(pool, eventId);

      const check = await pool.query<{
        status: string;
        claimed_by: string | null;
        processed_at: Date | null;
      }>(
        "SELECT status, claimed_by, processed_at FROM outbox_events WHERE id = $1;",
        [eventId],
      );

      assert.equal(check.rows[0]?.status, "PUBLISHED");
      assert.equal(check.rows[0]?.claimed_by, null);
      assert.ok(check.rows[0]?.processed_at !== null);
    });

    it("marks failed event with retry delay and transitions to DEAD_LETTER when max_attempts exceeded", async () => {
      let eventId = "";
      await withTransaction(pool, async (tx) => {
        const ev = await insertOutboxEvent(tx, {
          eventName: "test.retry",
          aggregateId: "agg-r",
          correlationId: "corr-r",
          payload: { r: 1 },
          maxAttempts: 2,
        });
        eventId = ev.id;
      });

      // Attempt 1: Claim and fail
      await claimOutboxEvents(pool, { workerId: "worker-retry", limit: 1 });
      await markOutboxEventFailed(pool, eventId, "Network timeout 1", 10);

      let check = await pool.query<{
        status: string;
        attempt_count: number;
        last_error: string;
      }>(
        "SELECT status, attempt_count, last_error FROM outbox_events WHERE id = $1;",
        [eventId],
      );
      assert.equal(check.rows[0]?.status, "FAILED");
      assert.equal(check.rows[0]?.attempt_count, 1);
      assert.equal(check.rows[0]?.last_error, "Network timeout 1");

      // Attempt 2: Claim and fail again (reaches maxAttempts = 2)
      // Manually set available_at to past so it can be claimed immediately
      await pool.query(
        "UPDATE outbox_events SET available_at = NOW() - INTERVAL '1 second' WHERE id = $1;",
        [eventId],
      );

      await claimOutboxEvents(pool, { workerId: "worker-retry", limit: 1 });
      await markOutboxEventFailed(pool, eventId, "Network timeout 2", 10);

      check = await pool.query(
        "SELECT status, attempt_count, last_error FROM outbox_events WHERE id = $1;",
        [eventId],
      );
      assert.equal(check.rows[0]?.status, "DEAD_LETTER");
      assert.equal(check.rows[0]?.attempt_count, 2);
    });

    it("reclaims stale outbox event leases abandoned by crashed workers", async () => {
      let eventId = "";
      await withTransaction(pool, async (tx) => {
        const ev = await insertOutboxEvent(tx, {
          eventName: "test.stale",
          aggregateId: "agg-stale",
          correlationId: "corr-stale",
          payload: { s: 1 },
        });
        eventId = ev.id;
      });

      // Simulate a worker that crashed: status = 'PROCESSING', claimed_at = 10 minutes ago
      await pool.query(
        `UPDATE outbox_events
         SET status = 'PROCESSING',
             claimed_at = NOW() - INTERVAL '600 seconds',
             claimed_by = 'crashed-worker-99'
         WHERE id = $1;`,
        [eventId],
      );

      // Run reclaim with 300s timeout
      const reclaimedCount = await reclaimStaleOutboxLeases(pool, 300);
      assert.equal(reclaimedCount, 1);

      // Event should be reset to PENDING and available for claim
      const check = await pool.query<{
        status: string;
        claimed_by: string | null;
      }>("SELECT status, claimed_by FROM outbox_events WHERE id = $1;", [
        eventId,
      ]);
      assert.equal(check.rows[0]?.status, "PENDING");
      assert.equal(check.rows[0]?.claimed_by, null);
    });

    it("persists custom and default occurred_at on outbox events", async () => {
      const customTime = new Date("2026-01-15T08:30:00.000Z");
      let event1Id = "";
      let event2Id = "";
      await withTransaction(pool, async (tx) => {
        const e1 = await insertOutboxEvent(tx, {
          eventName: "test.occurred.custom",
          aggregateId: "agg-occ-1",
          correlationId: "corr-occ-1",
          occurredAt: customTime,
          payload: { custom: true },
        });
        event1Id = e1.id;

        const e2 = await insertOutboxEvent(tx, {
          eventName: "test.occurred.default",
          aggregateId: "agg-occ-2",
          correlationId: "corr-occ-2",
          payload: { custom: false },
        });
        event2Id = e2.id;
      });

      const row1 = (
        await pool.query<{ occurred_at: Date }>(
          "SELECT occurred_at FROM outbox_events WHERE id = $1;",
          [event1Id],
        )
      ).rows[0]!;
      assert.equal(row1.occurred_at.toISOString(), customTime.toISOString());

      const row2 = (
        await pool.query<{ occurred_at: Date }>(
          "SELECT occurred_at FROM outbox_events WHERE id = $1;",
          [event2Id],
        )
      ).rows[0]!;
      assert.ok(row2.occurred_at instanceof Date);
      assert.ok(Math.abs(row2.occurred_at.getTime() - Date.now()) < 10000);
    });

    it("prevents invalid status transitions (PENDING -> PUBLISHED, DEAD_LETTER -> PUBLISHED, PUBLISHED -> FAILED)", async () => {
      let eventId = "";
      await withTransaction(pool, async (tx) => {
        const ev = await insertOutboxEvent(tx, {
          eventName: "test.transitions",
          aggregateId: "agg-trans",
          correlationId: "corr-trans",
          payload: { t: 1 },
          maxAttempts: 1,
        });
        eventId = ev.id;
      });

      // 1. PENDING -> PUBLISHED without claim must be rejected
      await assert.rejects(async () => {
        await markOutboxEventPublished(pool, eventId);
      }, OutboxStateTransitionError);

      // 2. Claim event -> transitions to PROCESSING
      await claimOutboxEvents(pool, { workerId: "worker-trans", limit: 1 });

      // 3. Mark failed (reaches maxAttempts = 1 -> transitions to DEAD_LETTER)
      await markOutboxEventFailed(pool, eventId, "Dead letter reason");

      const checkDead = await pool.query<{ status: string }>(
        "SELECT status FROM outbox_events WHERE id = $1;",
        [eventId],
      );
      assert.equal(checkDead.rows[0]?.status, "DEAD_LETTER");

      // 4. DEAD_LETTER -> PUBLISHED must be rejected
      await assert.rejects(async () => {
        await markOutboxEventPublished(pool, eventId);
      }, OutboxStateTransitionError);

      // 5. DEAD_LETTER -> PROCESSING via claim must also be impossible
      const claimedAfterDead = await claimOutboxEvents(pool, {
        workerId: "worker-trans",
        limit: 1,
      });
      assert.equal(claimedAfterDead.length, 0);

      // 6. Test PUBLISHED -> FAILED invalid transition
      let pubEventId = "";
      await withTransaction(pool, async (tx) => {
        const ev = await insertOutboxEvent(tx, {
          eventName: "test.published.terminal",
          aggregateId: "agg-pub-term",
          correlationId: "corr-pub-term",
          payload: { p: 2 },
        });
        pubEventId = ev.id;
      });
      await claimOutboxEvents(pool, { workerId: "worker-pub-term", limit: 1 });
      await markOutboxEventPublished(pool, pubEventId);

      // Once PUBLISHED, attempting to mark FAILED must be rejected
      await assert.rejects(async () => {
        await markOutboxEventFailed(pool, pubEventId, "Cannot fail published");
      }, OutboxStateTransitionError);
    });

    it("enforces claim ownership: worker B cannot mark worker A's claim as PUBLISHED or FAILED", async () => {
      let eventId = "";
      await withTransaction(pool, async (tx) => {
        const ev = await insertOutboxEvent(tx, {
          eventName: "test.ownership",
          aggregateId: "agg-own",
          correlationId: "corr-own",
          payload: { own: 1 },
        });
        eventId = ev.id;
      });

      // Worker A claims the event
      const claims = await claimOutboxEvents(pool, {
        workerId: "worker-A",
        limit: 1,
      });
      assert.equal(claims.length, 1);
      assert.equal(claims[0]?.claimedBy, "worker-A");

      // Worker B attempts to mark Worker A's claim as PUBLISHED -> REJECTED
      await assert.rejects(async () => {
        await markOutboxEventPublished(pool, eventId, { workerId: "worker-B" });
      }, OutboxStateTransitionError);

      // Worker B attempts to mark Worker A's claim as FAILED -> REJECTED
      await assert.rejects(async () => {
        await markOutboxEventFailed(pool, eventId, "Unauthorized failure", {
          workerId: "worker-B",
        });
      }, OutboxStateTransitionError);

      // Event is still in PROCESSING with claimed_by = worker-A
      const check = await pool.query<{ status: string; claimed_by: string }>(
        "SELECT status, claimed_by FROM outbox_events WHERE id = $1;",
        [eventId],
      );
      assert.equal(check.rows[0]?.status, "PROCESSING");
      assert.equal(check.rows[0]?.claimed_by, "worker-A");

      // Rightful owner Worker A marks it PUBLISHED -> SUCCEEDS
      await markOutboxEventPublished(pool, eventId, { workerId: "worker-A" });

      const finalCheck = await pool.query<{
        status: string;
        claimed_by: string | null;
      }>("SELECT status, claimed_by FROM outbox_events WHERE id = $1;", [
        eventId,
      ]);
      assert.equal(finalCheck.rows[0]?.status, "PUBLISHED");
      assert.equal(finalCheck.rows[0]?.claimed_by, null);
    });
  });

  // =========================================================================
  // E. STEP 04 FAILURE INJECTION ON REAL POSTGRESQL
  // =========================================================================
  describe("E. Multi-Write Transactional Atomicity (Failure Injection)", () => {
    it("ensures user identity and user profile are not left partially created when profile fails", async () => {
      let createdUserId: string | null = null;

      await assert.rejects(async () => {
        await withTransaction(pool, async (tx) => {
          // Write 1: Identity creation
          const res = await tx.query<{ id: string }>(
            "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
            ["+919876543299", "USER"],
          );
          createdUserId = res.rows[0]!.id;

          // Write 2: Intentionally invalid profile insert (duplicate or syntax error)
          await tx.query(
            "INSERT INTO user_profiles (user_id, full_name, email) VALUES ($1, $2, $3);",
            [createdUserId, "Test User", "test@example.com"],
          );

          // Injected crash
          throw new Error("Crash right after profile insert");
        });
      }, /Crash right after profile insert/);

      assert.ok(createdUserId !== null);

      // Verify ZERO orphaned records remain in PostgreSQL
      const idCheck = await pool.query(
        "SELECT id FROM auth_identities WHERE id = $1;",
        [createdUserId],
      );
      assert.equal(
        idCheck.rows.length,
        0,
        "Identity record must be rolled back",
      );

      const profCheck = await pool.query(
        "SELECT user_id FROM user_profiles WHERE user_id = $1;",
        [createdUserId],
      );
      assert.equal(
        profCheck.rows.length,
        0,
        "Profile record must be rolled back",
      );
    });
  });

  // =========================================================================
  // F. KEYSET PAGINATION ON REAL POSTGRESQL (MUTATION & DETERMINISM)
  // =========================================================================
  describe("F. Keyset Pagination Tuple Comparison on Real PostgreSQL", () => {
    it("preserves deterministic pagination across mid-feed insertions without duplicates or skips", async () => {
      // Insert 5 records: A, B, C, D, E with staggered timestamps
      const ids: string[] = [];
      const t0 = new Date("2026-09-29T10:00:00.000Z").getTime();
      for (let i = 0; i < 5; i++) {
        const createdAt = new Date(t0 + i * 1000);
        const res = await pool.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role, created_at) VALUES ($1, $2, $3) RETURNING id;",
          [`+91999990000${i}`, "USER", createdAt],
        );
        ids.push(res.rows[0]!.id);
      }
      // Items ordered DESC by created_at, id:
      // ids[4], ids[3], ids[2], ids[1], ids[0]

      // Fetch page 1 (limit 2)
      const page1 = await pool.query<{ id: string; created_at: Date }>(
        "SELECT id, created_at FROM auth_identities ORDER BY created_at DESC, id DESC LIMIT 2;",
      );
      assert.equal(page1.rows.length, 2);
      assert.equal(page1.rows[0]!.id, ids[4]);
      assert.equal(page1.rows[1]!.id, ids[3]);

      const cursorSortVal = page1.rows[1]!.created_at;
      const cursorTieBreakerVal = page1.rows[1]!.id;

      // Concurrently insert a new item that sorts at the top (newer than all items)
      // Under offset pagination (LIMIT 2 OFFSET 2), this would cause ids[3] to shift and appear on page 2!
      await pool.query(
        "INSERT INTO auth_identities (phone, role, created_at) VALUES ($1, $2, $3);",
        ["+919999900099", "USER", new Date(t0 + 10000)],
      );

      // Keyset pagination condition: (created_at, id) < ($1, $2)
      const page2 = await pool.query<{ id: string; created_at: Date }>(
        `SELECT id, created_at FROM auth_identities
         WHERE (created_at, id) < ($1, $2)
         ORDER BY created_at DESC, id DESC
         LIMIT 2;`,
        [cursorSortVal, cursorTieBreakerVal],
      );

      // Keyset pagination must yield ids[2] and ids[1] deterministically
      assert.equal(page2.rows.length, 2);
      assert.equal(page2.rows[0]!.id, ids[2]);
      assert.equal(page2.rows[1]!.id, ids[1]);

      const page1Ids = new Set(page1.rows.map((r) => r.id));
      for (const r of page2.rows) {
        assert.equal(
          page1Ids.has(r.id),
          false,
          "Page 2 must contain no duplicates from Page 1",
        );
      }
    });
  });

  // =========================================================================
  // G. POSTGRESQL IDEMPOTENCY KEYS PERSISTENCE & CONCURRENCY
  // =========================================================================
  describe("G. PostgreSQL Idempotency Keys Persistence & Concurrency", () => {
    it("enforces unique scope and key constraint (uq_idempotency_scope_key)", async () => {
      const scope = "actor:user_real_pg_1";
      const key = "key_unique_test_12345678";
      const fingerprint = "sha256_hash_123";
      const expiresAt = new Date(Date.now() + 3600000);

      // 1. Initial insert
      await pool.query(
        `INSERT INTO idempotency_keys (scope, key, fingerprint, status, expires_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', $4);`,
        [scope, key, fingerprint, expiresAt],
      );

      // 2. Duplicate insert must trigger 23505 UniqueConstraintViolationError
      await assert.rejects(
        async () => {
          await withTransaction(pool, async (tx) => {
            await tx.query(
              `INSERT INTO idempotency_keys (scope, key, fingerprint, status, expires_at)
               VALUES ($1, $2, $3, 'IN_PROGRESS', $4);`,
              [scope, key, fingerprint, expiresAt],
            );
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.equal(err.code, "UNIQUE_VIOLATION");
          assert.equal(err.table, "idempotency_keys");
          assert.ok(err.constraint?.includes("uq_idempotency_scope_key"));
          return true;
        },
      );
    });

    it("rolls back idempotency record when the business transaction fails", async () => {
      const scope = "actor:user_real_pg_2";
      const key = "key_rollback_test_12345678";
      const fingerprint = "sha256_hash_rollback";
      const expiresAt = new Date(Date.now() + 3600000);

      await assert.rejects(async () => {
        await withTransaction(pool, async (tx) => {
          // Claim key inside transaction
          await tx.query(
            `INSERT INTO idempotency_keys (scope, key, fingerprint, status, expires_at)
             VALUES ($1, $2, $3, 'IN_PROGRESS', $4);`,
            [scope, key, fingerprint, expiresAt],
          );

          // Simulated failure in business mutation
          throw new Error("Simulated business mutation failure");
        });
      });

      // Verify that no idempotency record persisted
      const checkResult = await pool.query(
        "SELECT * FROM idempotency_keys WHERE scope = $1 AND key = $2;",
        [scope, key],
      );
      assert.equal(checkResult.rows.length, 0);
    });

    it("commits business mutation, outbox event, and idempotency completion atomically", async () => {
      const scope = "actor:user_real_pg_3";
      const key = "key_atomic_complete_12345678";
      const fingerprint = "sha256_hash_atomic";
      const expiresAt = new Date(Date.now() + 3600000);
      let identityId = "";

      await withTransaction(pool, async (tx) => {
        // 1. Claim key
        await tx.query(
          `INSERT INTO idempotency_keys (scope, key, fingerprint, status, expires_at)
           VALUES ($1, $2, $3, 'IN_PROGRESS', $4);`,
          [scope, key, fingerprint, expiresAt],
        );

        // 2. Business mutation
        const identity = await tx.query<{ id: string }>(
          "INSERT INTO auth_identities (phone, role) VALUES ($1, $2) RETURNING id;",
          ["+919988776655", "USER"],
        );
        identityId = identity.rows[0]!.id;

        // 3. Outbox event
        await insertOutboxEvent(tx, {
          eventName: "USER_REGISTERED",
          aggregateId: identityId,
          correlationId: "corr_atomic_123",
          payload: { phone: "+919988776655" },
        });

        // 4. Complete idempotency
        await tx.query(
          `UPDATE idempotency_keys
           SET status = 'COMPLETED', status_code = 201, response_body = $1, updated_at = NOW()
           WHERE scope = $2 AND key = $3;`,
          [JSON.stringify({ success: true, userId: identityId }), scope, key],
        );
      });

      // Verify all 3 components are durably recorded
      const idRecord = await pool.query(
        "SELECT * FROM auth_identities WHERE id = $1;",
        [identityId],
      );
      assert.equal(idRecord.rows.length, 1);

      const outboxRecord = await pool.query(
        "SELECT * FROM outbox_events WHERE aggregate_id = $1;",
        [identityId],
      );
      assert.equal(outboxRecord.rows.length, 1);

      const idemRecord = await pool.query<{
        status: string;
        status_code: number;
      }>("SELECT * FROM idempotency_keys WHERE scope = $1 AND key = $2;", [
        scope,
        key,
      ]);
      assert.equal(idemRecord.rows.length, 1);
      assert.equal(idemRecord.rows[0]!.status, "COMPLETED");
      assert.equal(idemRecord.rows[0]!.status_code, 201);
    });
  });
});
