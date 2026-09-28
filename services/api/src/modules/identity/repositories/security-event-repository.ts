import type { Pool, PoolClient } from "pg";
import { executeQuery } from "@zero-brokerage/database";
import type { AuthSecurityEvent, SecurityEventType } from "../types.js";

type DBExecutor = Pool | PoolClient;

interface EventRow {
  id: string;
  event_type: SecurityEventType;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export async function recordSecurityEvent(
  executor: DBExecutor,
  data: {
    eventType: SecurityEventType;
    userId?: string | null | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
  },
): Promise<AuthSecurityEvent> {
  // Defensive check: Ensure no secrets are leaked in metadata
  const sanitizedMetadata = { ...(data.metadata ?? {}) };
  delete sanitizedMetadata["code"];
  delete sanitizedMetadata["otp"];
  delete sanitizedMetadata["token"];
  delete sanitizedMetadata["accessToken"];
  delete sanitizedMetadata["refreshToken"];
  delete sanitizedMetadata["codeHash"];
  delete sanitizedMetadata["secret"];

  const result = await executeQuery<EventRow>(
    executor,
    `INSERT INTO auth_security_events (
       event_type, user_id, ip_address, user_agent, metadata
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *;`,
    [
      data.eventType,
      data.userId ?? null,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      JSON.stringify(sanitizedMetadata),
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to record security event.");
  }

  return {
    id: row.id,
    eventType: row.event_type,
    userId: row.user_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function getSecurityEventsByUserId(
  executor: DBExecutor,
  userId: string,
  limit = 20,
): Promise<AuthSecurityEvent[]> {
  const result = await executeQuery<EventRow>(
    executor,
    `SELECT * FROM auth_security_events
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2;`,
    [userId, limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    userId: row.user_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}
