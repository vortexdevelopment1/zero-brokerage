import type { Pool } from "pg";
import { withTransaction } from "@zero-brokerage/database";
import { ForbiddenError, NotFoundError } from "../../../common/errors/index.js";
import { recordSecurityEvent } from "../repositories/security-event-repository.js";
import {
  findActiveSessionsByUserId,
  findSessionById,
  revokeSession,
} from "../repositories/session-repository.js";
import type { SessionSummary } from "../types.js";

export class SessionService {
  constructor(private pool: Pool) {}

  /**
   * Retrieves all active sessions for a user with safe metadata.
   */
  async getActiveSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionSummary[]> {
    const sessions = await findActiveSessionsByUserId(this.pool, userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress ? maskIp(session.ipAddress) : null,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      isCurrent: session.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session belonging to the user.
   */
  async revokeSession(params: {
    userId: string;
    sessionIdToRevoke: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<void> {
    const session = await findSessionById(this.pool, params.sessionIdToRevoke);

    if (!session || session.revokedAt) {
      throw new NotFoundError("Session not found or already inactive.");
    }

    if (session.userId !== params.userId) {
      throw new ForbiddenError(
        "You do not have permission to revoke this session.",
      );
    }

    await withTransaction(this.pool, async (tx) => {
      await revokeSession(tx, params.sessionIdToRevoke, "USER_REVOKED");

      await recordSecurityEvent(tx, {
        eventType: "SESSION_REVOKED",
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          sessionId: params.sessionIdToRevoke,
          reason: "USER_REVOKED",
        },
      });
    });
  }
}

function maskIp(ip: string): string {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }
  return "***";
}
