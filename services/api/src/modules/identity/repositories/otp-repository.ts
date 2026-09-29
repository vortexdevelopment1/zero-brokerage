import { executeQuery, type QueryExecutor } from "@zero-brokerage/database";
import type { AuthOtpChallenge, OtpPurpose, OtpStatus } from "../types.js";

type DBExecutor = QueryExecutor;

interface OtpRow {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  max_attempts: number;
  status: OtpStatus;
  consumed_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

function mapOtpRow(row: OtpRow): AuthOtpChallenge {
  return {
    id: row.id,
    phone: row.phone,
    purpose: row.purpose,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    status: row.status,
    consumedAt: row.consumed_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export async function createOtpChallenge(
  executor: DBExecutor,
  data: {
    phone: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    maxAttempts: number;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  },
): Promise<AuthOtpChallenge> {
  const result = await executeQuery<OtpRow>(
    executor,
    `INSERT INTO auth_otp_challenges (
       phone, purpose, code_hash, expires_at, max_attempts, ip_address, user_agent
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *;`,
    [
      data.phone,
      data.purpose,
      data.codeHash,
      data.expiresAt,
      data.maxAttempts,
      data.ipAddress ?? null,
      data.userAgent ?? null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create OTP challenge.");
  }

  return mapOtpRow(row);
}

export async function findChallengeById(
  executor: DBExecutor,
  id: string,
): Promise<AuthOtpChallenge | null> {
  const result = await executeQuery<OtpRow>(
    executor,
    `SELECT * FROM auth_otp_challenges WHERE id = $1 LIMIT 1;`,
    [id],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapOtpRow(result.rows[0]);
}

export async function findLatestPendingChallenge(
  executor: DBExecutor,
  phone: string,
  purpose: OtpPurpose,
): Promise<AuthOtpChallenge | null> {
  const result = await executeQuery<OtpRow>(
    executor,
    `SELECT * FROM auth_otp_challenges
     WHERE phone = $1 AND purpose = $2 AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1;`,
    [phone, purpose],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapOtpRow(result.rows[0]);
}

export async function supersedePendingChallenges(
  executor: DBExecutor,
  phone: string,
  purpose: OtpPurpose,
): Promise<void> {
  await executeQuery(
    executor,
    `UPDATE auth_otp_challenges
     SET status = 'SUPERSEDED'
     WHERE phone = $1 AND purpose = $2 AND status = 'PENDING';`,
    [phone, purpose],
  );
}

export async function incrementOtpAttempts(
  executor: DBExecutor,
  id: string,
): Promise<{ attempts: number; maxAttempts: number; isFailed: boolean }> {
  const result = await executeQuery<{ attempts: number; max_attempts: number }>(
    executor,
    `UPDATE auth_otp_challenges
     SET attempts = attempts + 1,
         status = CASE WHEN attempts + 1 >= max_attempts THEN 'FAILED' ELSE status END
     WHERE id = $1
     RETURNING attempts, max_attempts;`,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return { attempts: 0, maxAttempts: 3, isFailed: true };
  }

  return {
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    isFailed: row.attempts >= row.max_attempts,
  };
}

/**
 * Atomically marks the OTP challenge as VERIFIED if it is currently PENDING, not expired,
 * and has not exceeded max attempts. Prevents race conditions / duplicate consumption.
 */
export async function consumeOtpChallenge(
  executor: DBExecutor,
  id: string,
): Promise<boolean> {
  const result = await executeQuery<OtpRow>(
    executor,
    `UPDATE auth_otp_challenges
     SET status = 'VERIFIED',
         consumed_at = NOW()
     WHERE id = $1
       AND status = 'PENDING'
       AND expires_at > NOW()
       AND attempts < max_attempts
     RETURNING id;`,
    [id],
  );

  return result.rows.length > 0;
}
