import { executeQuery, type QueryExecutor } from "@zero-brokerage/database";
import type { AuthSession } from "../types.js";

type DBExecutor = QueryExecutor;

interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  last_used_at: Date;
  revoked_at: Date | null;
  revocation_reason: string | null;
  created_at: Date;
}

function mapSessionRow(row: SessionRow): AuthSession {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    deviceInfo: row.device_info,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    createdAt: row.created_at,
  };
}

export async function createSession(
  executor: DBExecutor,
  data: {
    userId: string;
    refreshTokenHash: string;
    deviceInfo?: string | null | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
    expiresAt: Date;
  },
): Promise<AuthSession> {
  const result = await executeQuery<SessionRow>(
    executor,
    `INSERT INTO auth_sessions (
       user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *;`,
    [
      data.userId,
      data.refreshTokenHash,
      data.deviceInfo ?? null,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      data.expiresAt,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create session.");
  }

  return mapSessionRow(row);
}

export async function findSessionByTokenHash(
  executor: DBExecutor,
  tokenHash: string,
): Promise<AuthSession | null> {
  const result = await executeQuery<SessionRow>(
    executor,
    `SELECT * FROM auth_sessions WHERE refresh_token_hash = $1 LIMIT 1;`,
    [tokenHash],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapSessionRow(result.rows[0]);
}

export async function findSessionById(
  executor: DBExecutor,
  id: string,
): Promise<AuthSession | null> {
  const result = await executeQuery<SessionRow>(
    executor,
    `SELECT * FROM auth_sessions WHERE id = $1 LIMIT 1;`,
    [id],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapSessionRow(result.rows[0]);
}

export async function findActiveSessionsByUserId(
  executor: DBExecutor,
  userId: string,
): Promise<AuthSession[]> {
  const result = await executeQuery<SessionRow>(
    executor,
    `SELECT * FROM auth_sessions
     WHERE user_id = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     ORDER BY last_used_at DESC;`,
    [userId],
  );

  return result.rows.map(mapSessionRow);
}

export async function updateSessionLastUsed(
  executor: DBExecutor,
  sessionId: string,
): Promise<void> {
  await executeQuery(
    executor,
    `UPDATE auth_sessions
     SET last_used_at = NOW()
     WHERE id = $1 AND revoked_at IS NULL;`,
    [sessionId],
  );
}

/**
 * Atomically rotates the refresh token for an active session.
 * Protects against race conditions and token replay.
 */
export async function rotateSessionToken(
  executor: DBExecutor,
  sessionId: string,
  oldTokenHash: string,
  newTokenHash: string,
  newExpiresAt: Date,
): Promise<boolean> {
  const result = await executeQuery<SessionRow>(
    executor,
    `UPDATE auth_sessions
     SET refresh_token_hash = $1,
         expires_at = $2,
         last_used_at = NOW()
     WHERE id = $3
       AND refresh_token_hash = $4
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING id;`,
    [newTokenHash, newExpiresAt, sessionId, oldTokenHash],
  );

  return result.rows.length > 0;
}

export async function revokeSession(
  executor: DBExecutor,
  sessionId: string,
  reason: string,
): Promise<boolean> {
  const result = await executeQuery<SessionRow>(
    executor,
    `UPDATE auth_sessions
     SET revoked_at = NOW(),
         revocation_reason = $1
     WHERE id = $2 AND revoked_at IS NULL
     RETURNING id;`,
    [reason, sessionId],
  );

  return result.rows.length > 0;
}

export async function revokeAllUserSessions(
  executor: DBExecutor,
  userId: string,
  reason: string,
): Promise<number> {
  const result = await executeQuery<SessionRow>(
    executor,
    `UPDATE auth_sessions
     SET revoked_at = NOW(),
         revocation_reason = $1
     WHERE user_id = $2 AND revoked_at IS NULL
     RETURNING id;`,
    [reason, userId],
  );

  return result.rows.length;
}
