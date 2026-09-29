import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { createMockDbPool } from "./mock-db-pool.js";
import { AccountLifecycleService } from "../services/account-lifecycle-service.js";
import { AuthService } from "../services/auth-service.js";
import { MockOtpDeliveryProvider } from "../providers/otp-provider.js";
import {
  InvalidAccountStateError,
  UnauthorizedError,
} from "../../../common/errors/index.js";

describe("Account Deletion Lifecycle and Privacy Controls", () => {
  let pool: Pool;
  let mockState: any;
  let otpProvider: MockOtpDeliveryProvider;
  let lifecycleService: AccountLifecycleService;
  let authService: AuthService;

  const testUser = {
    id: "user-lifecycle-1",
    phone: "+919876599999",
    role: "USER",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const testProfile = {
    id: "prof-1",
    user_id: testUser.id,
    full_name: "Original Name",
    email: "original@example.com",
    avatar_url: "https://example.com/avatar.jpg",
    preferences: { theme: "dark" },
    created_at: new Date(),
    updated_at: new Date(),
  };

  const testSession = {
    id: "session-lifecycle-1",
    user_id: testUser.id,
    refresh_token_hash: "token-hash-123",
    device_info: "Test Device",
    ip_address: "127.0.0.1",
    user_agent: "Mobile/1.0",
    expires_at: new Date(Date.now() + 86400000),
    last_used_at: new Date(),
    revoked_at: null,
    revocation_reason: null,
    created_at: new Date(),
  };

  beforeEach(() => {
    pool = createMockDbPool();
    mockState = (pool as any)._state;
    otpProvider = new MockOtpDeliveryProvider();
    lifecycleService = new AccountLifecycleService(pool, otpProvider);
    authService = new AuthService(pool, otpProvider);

    mockState.identities.set(testUser.id, { ...testUser });
    mockState.profiles.set(testUser.id, { ...testProfile });
    mockState.sessions.set(testSession.id, { ...testSession });
  });

  it("A. initiates deletion: marks DELETION_PENDING, sets 30-day deadline, anonymizes PII, revokes sessions with ACCOUNT_DELETION_PENDING, and records security event", async () => {
    const res = await lifecycleService.deleteAccount({
      userId: testUser.id,
      reason: "User requested account removal",
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent/1.0",
    });

    assert.ok(res.scheduledAt);
    assert.match(res.message, /scheduled for deletion/);

    const userInDb = mockState.identities.get(testUser.id);
    assert.equal(userInDb.status, "DELETION_PENDING");
    assert.ok(userInDb.deletion_scheduled_at);

    // Profile details are immediately anonymized
    const profileInDb = mockState.profiles.get(testUser.id);
    assert.equal(profileInDb.full_name, "Deleted User");
    assert.equal(profileInDb.email, null);
    assert.equal(profileInDb.avatar_url, null);

    // Sessions are invalidated with precise reason ACCOUNT_DELETION_PENDING (not ACCOUNT_DELETED)
    const sessionInDb = mockState.sessions.get(testSession.id);
    assert.ok(sessionInDb.revoked_at);
    assert.equal(sessionInDb.revocation_reason, "ACCOUNT_DELETION_PENDING");

    // Security event recorded
    const event = mockState.securityEvents.find(
      (e: any) =>
        e.eventType === "ACCOUNT_DELETION_REQUESTED" &&
        e.userId === testUser.id,
    );
    assert.ok(event);
    assert.equal(event.metadata.reason, "User requested account removal");
  });

  it("B. immediate session invalidation: old session token is rejected after deletion initiation", async () => {
    await lifecycleService.deleteAccount({ userId: testUser.id });

    // Trying to refresh using a revoked session must fail
    await assert.rejects(
      () =>
        authService.refreshSession({
          refreshToken: "arbitrary-token",
        }),
      { name: "UnauthorizedError" },
    );
  });

  it("C. cancellation during grace period restores account to ACTIVE, clears scheduled deadline, records event, and does not restore deleted PII", async () => {
    // Initiate deletion
    await lifecycleService.deleteAccount({ userId: testUser.id });

    // Cancel deletion before deadline
    const cancelRes = await lifecycleService.cancelAccountDeletion({
      userId: testUser.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent/1.0",
    });

    assert.match(cancelRes.message, /cancelled and your account is active/);

    const userInDb = mockState.identities.get(testUser.id);
    assert.equal(userInDb.status, "ACTIVE");
    assert.equal(userInDb.deletion_scheduled_at, null);

    // PII is NOT restored
    const profileInDb = mockState.profiles.get(testUser.id);
    assert.equal(profileInDb.full_name, "Deleted User");
    assert.equal(profileInDb.email, null);

    // Event recorded
    const event = mockState.securityEvents.find(
      (e: any) =>
        e.eventType === "ACCOUNT_DELETION_CANCELLED" &&
        e.userId === testUser.id,
    );
    assert.ok(event);
  });

  it("D. cancellation is rejected after grace period deadline has expired", async () => {
    // Manually set deletion_scheduled_at to the past
    mockState.identities.get(testUser.id).status = "DELETION_PENDING";
    mockState.identities.get(testUser.id).deletion_scheduled_at = new Date(
      Date.now() - 10000,
    );

    await assert.rejects(
      () => lifecycleService.cancelAccountDeletion({ userId: testUser.id }),
      (err: any) =>
        err instanceof InvalidAccountStateError &&
        err.message.includes("expired"),
    );
  });

  it("E. finalization after deadline marks account DELETED, records ACCOUNT_DELETED, and is safe to execute idempotently", async () => {
    // Account with expired retention
    mockState.identities.get(testUser.id).status = "DELETION_PENDING";
    mockState.identities.get(testUser.id).deletion_scheduled_at = new Date(
      Date.now() - 10000,
    );

    // 1st finalization
    const res1 = await lifecycleService.finalizeAccountDeletion({
      userId: testUser.id,
    });
    assert.match(res1.message, /permanently finalized/);

    const userInDb = mockState.identities.get(testUser.id);
    assert.equal(userInDb.status, "DELETED");
    assert.ok(userInDb.deleted_at);

    // Verify ACCOUNT_DELETED event
    const event = mockState.securityEvents.find(
      (e: any) => e.eventType === "ACCOUNT_DELETED" && e.userId === testUser.id,
    );
    assert.ok(event);

    // 2nd finalization (idempotency check)
    const res2 = await lifecycleService.finalizeAccountDeletion({
      userId: testUser.id,
    });
    assert.equal(res2.alreadyDeleted, true);
    assert.match(res2.message, /already permanently deleted/);
  });

  it("F. finalizeExpiredAccountDeletions batch processes all expired accounts idempotently", async () => {
    const expiredUser2 = {
      id: "user-lifecycle-2",
      phone: "+919876588888",
      role: "USER",
      status: "DELETION_PENDING",
      deletion_scheduled_at: new Date(Date.now() - 20000),
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockState.identities.set(expiredUser2.id, expiredUser2);

    mockState.identities.get(testUser.id).status = "DELETION_PENDING";
    mockState.identities.get(testUser.id).deletion_scheduled_at = new Date(
      Date.now() - 10000,
    );

    const result = await lifecycleService.finalizeExpiredAccountDeletions();
    assert.equal(result.finalizedCount, 2);
    assert.ok(result.accountIds.includes(testUser.id));
    assert.ok(result.accountIds.includes(expiredUser2.id));

    // Both are now DELETED
    assert.equal(mockState.identities.get(testUser.id).status, "DELETED");
    assert.equal(mockState.identities.get(expiredUser2.id).status, "DELETED");

    // Second run: 0 pending
    const rerun = await lifecycleService.finalizeExpiredAccountDeletions();
    assert.equal(rerun.finalizedCount, 0);
  });

  it("G. authentication is strictly rejected after final account deletion", async () => {
    // Mark user DELETED
    mockState.identities.get(testUser.id).status = "DELETED";

    // 1. Requesting OTP for deleted account is rejected
    await assert.rejects(
      () => authService.requestOtp({ phone: testUser.phone }),
      (err: any) =>
        err instanceof InvalidAccountStateError &&
        err.message.includes("deleted"),
    );
  });
});
