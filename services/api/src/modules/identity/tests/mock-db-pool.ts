import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";

interface InMemoryState {
  identities: Map<string, any>;
  profiles: Map<string, any>;
  challenges: Map<string, any>;
  sessions: Map<string, any>;
  securityEvents: any[];
  agencyMemberships: Map<string, any>;
  brokerVerifications: Map<string, any>;
}

export function createMockDbPool(): Pool {
  const state: InMemoryState = {
    identities: new Map(),
    profiles: new Map(),
    challenges: new Map(),
    sessions: new Map(),
    securityEvents: [],
    agencyMemberships: new Map(),
    brokerVerifications: new Map(),
  };

  const executeSql = async (
    sql: string,
    params: any[] = [],
  ): Promise<{ rows: any[]; rowCount: number }> => {
    const normalized = sql.replace(/\s+/g, " ").trim();

    // 1. auth_otp_challenges - INSERT
    if (normalized.startsWith("INSERT INTO auth_otp_challenges")) {
      const [
        phone,
        purpose,
        code_hash,
        expires_at,
        max_attempts,
        ip_address,
        user_agent,
      ] = params;
      const id = crypto.randomUUID();
      const record = {
        id,
        phone,
        purpose,
        code_hash,
        expires_at,
        attempts: 0,
        max_attempts,
        status: "PENDING",
        consumed_at: null,
        ip_address,
        user_agent,
        created_at: new Date(),
      };
      state.challenges.set(id, record);
      return { rows: [record], rowCount: 1 };
    }

    // 2. auth_otp_challenges - SELECT latest pending
    if (
      normalized.includes("FROM auth_otp_challenges") &&
      normalized.includes("status = 'PENDING'") &&
      normalized.includes("LIMIT 1")
    ) {
      const [phone, purpose] = params;
      const matching = Array.from(state.challenges.values())
        .filter(
          (c) =>
            c.phone === phone &&
            c.purpose === purpose &&
            c.status === "PENDING",
        )
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return {
        rows: matching.slice(0, 1),
        rowCount: matching.length > 0 ? 1 : 0,
      };
    }

    // 3. auth_otp_challenges - SELECT by ID
    if (normalized.includes("FROM auth_otp_challenges WHERE id = $1")) {
      const [id] = params;
      const found = state.challenges.get(id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 4. auth_otp_challenges - increment attempts
    if (
      normalized.startsWith(
        "UPDATE auth_otp_challenges SET attempts = attempts + 1",
      )
    ) {
      const [id] = params;
      const c = state.challenges.get(id);
      if (c) {
        c.attempts += 1;
        if (c.attempts >= c.max_attempts) {
          c.status = "FAILED";
        }
        return { rows: [c], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 5. auth_otp_challenges - consume
    if (
      normalized.startsWith(
        "UPDATE auth_otp_challenges SET status = 'VERIFIED'",
      )
    ) {
      const [id] = params;
      const c = state.challenges.get(id);
      if (c && c.status === "PENDING") {
        c.status = "VERIFIED";
        c.consumed_at = new Date();
        return { rows: [c], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 6. auth_identities - SELECT by phone
    if (normalized.includes("FROM auth_identities WHERE phone = $1")) {
      const [phone] = params;
      const found = Array.from(state.identities.values()).find(
        (u) => u.phone === phone,
      );
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 6b. auth_identities - SELECT expired deletion pending
    if (
      normalized.includes("FROM auth_identities") &&
      normalized.includes("status = 'DELETION_PENDING'")
    ) {
      const now = new Date();
      const expired = Array.from(state.identities.values()).filter(
        (u) =>
          u.status === "DELETION_PENDING" &&
          u.deletion_scheduled_at &&
          new Date(u.deletion_scheduled_at).getTime() <= now.getTime(),
      );
      return { rows: expired, rowCount: expired.length };
    }

    // 7. auth_identities - SELECT by ID
    if (normalized.includes("FROM auth_identities WHERE id = $1")) {
      const [id] = params;
      const found = state.identities.get(id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 8. auth_identities - INSERT
    if (normalized.startsWith("INSERT INTO auth_identities")) {
      const [phone, role] = params;
      const id = crypto.randomUUID();
      const record = {
        id,
        phone,
        role: role ?? "USER",
        status: "ACTIVE",
        deletion_scheduled_at: null,
        scheduled_for_deletion_at: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      state.identities.set(id, record);
      return { rows: [record], rowCount: 1 };
    }

    // 9. auth_identities - UPDATE status
    if (normalized.startsWith("UPDATE auth_identities SET status = $1")) {
      const [status, scheduled, id] = params;
      const u = state.identities.get(id);
      if (u) {
        u.status = status;
        u.deletion_scheduled_at = scheduled ?? null;
        u.scheduled_for_deletion_at = scheduled ?? null;
        if (status === "DELETED") {
          u.deleted_at = new Date();
        }
        u.updated_at = new Date();
      }
      return { rows: [], rowCount: 1 };
    }

    // 10. auth_identities - UPDATE phone
    if (normalized.startsWith("UPDATE auth_identities SET phone = $1")) {
      const [phone, id] = params;
      const u = state.identities.get(id);
      if (u) {
        u.phone = phone;
        u.updated_at = new Date();
      }
      return { rows: [], rowCount: 1 };
    }

    // 11. user_profiles - INSERT
    if (normalized.startsWith("INSERT INTO user_profiles")) {
      const [userId, fullName, email, avatarUrl, preferences] = params;
      const id = crypto.randomUUID();
      const record = {
        id,
        user_id: userId,
        full_name: fullName ?? null,
        email: email ?? null,
        avatar_url: avatarUrl ?? null,
        preferences: preferences ? JSON.parse(preferences) : {},
        created_at: new Date(),
        updated_at: new Date(),
      };
      state.profiles.set(userId, record);
      return { rows: [record], rowCount: 1 };
    }

    // 12. user_profiles - SELECT by user_id
    if (normalized.includes("FROM user_profiles WHERE user_id = $1")) {
      const [userId] = params;
      const p = state.profiles.get(userId);
      return { rows: p ? [p] : [], rowCount: p ? 1 : 0 };
    }

    // 13. user_profiles - anonymize
    if (
      normalized.startsWith(
        "UPDATE user_profiles SET full_name = 'Deleted User'",
      )
    ) {
      const [userId] = params;
      const p = state.profiles.get(userId);
      if (p) {
        p.full_name = "Deleted User";
        p.email = null;
        p.avatar_url = null;
        p.preferences = {};
      }
      return { rows: [], rowCount: 1 };
    }

    // 14. auth_sessions - INSERT
    if (normalized.startsWith("INSERT INTO auth_sessions")) {
      const [
        userId,
        refreshTokenHash,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt,
      ] = params;
      const id = crypto.randomUUID();
      const record = {
        id,
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        device_info: deviceInfo ?? null,
        ip_address: ipAddress ?? null,
        user_agent: userAgent ?? null,
        expires_at: expiresAt,
        last_used_at: new Date(),
        revoked_at: null,
        revocation_reason: null,
        created_at: new Date(),
      };
      state.sessions.set(id, record);
      return { rows: [record], rowCount: 1 };
    }

    // 15. auth_sessions - SELECT by token hash
    if (
      normalized.includes("FROM auth_sessions WHERE refresh_token_hash = $1")
    ) {
      const [tokenHash] = params;
      const found = Array.from(state.sessions.values()).find(
        (s) => s.refresh_token_hash === tokenHash,
      );
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 16. auth_sessions - SELECT by ID
    if (normalized.includes("FROM auth_sessions WHERE id = $1")) {
      const [id] = params;
      const found = state.sessions.get(id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 17. auth_sessions - SELECT active by user_id
    if (
      normalized.includes(
        "FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL",
      )
    ) {
      const [userId] = params;
      const active = Array.from(state.sessions.values())
        .filter((s) => s.user_id === userId && !s.revoked_at)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows: active, rowCount: active.length };
    }

    // 18. auth_sessions - rotate token
    if (
      normalized.startsWith("UPDATE auth_sessions SET refresh_token_hash = $1")
    ) {
      const [newTokenHash, newExpiresAt, sessionId, oldTokenHash] = params;
      const s = state.sessions.get(sessionId);
      if (s && s.refresh_token_hash === oldTokenHash && !s.revoked_at) {
        s.refresh_token_hash = newTokenHash;
        s.expires_at = newExpiresAt;
        s.last_used_at = new Date();
        return { rows: [s], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 19. auth_sessions - update last used
    if (
      normalized.startsWith("UPDATE auth_sessions SET last_used_at = NOW()")
    ) {
      const [sessionId] = params;
      const s = state.sessions.get(sessionId);
      if (s) {
        s.last_used_at = new Date();
      }
      return { rows: [], rowCount: 1 };
    }

    // 20. auth_sessions - revoke single
    if (
      normalized.startsWith(
        "UPDATE auth_sessions SET revoked_at = NOW(), revocation_reason = $1 WHERE id = $2",
      )
    ) {
      const [reason, sessionId] = params;
      const s = state.sessions.get(sessionId);
      if (s && !s.revoked_at) {
        s.revoked_at = new Date();
        s.revocation_reason = reason;
      }
      return { rows: s ? [s] : [], rowCount: s ? 1 : 0 };
    }

    // 21. auth_sessions - revoke all user sessions
    if (
      normalized.startsWith(
        "UPDATE auth_sessions SET revoked_at = NOW(), revocation_reason = $1 WHERE user_id = $2",
      )
    ) {
      const [reason, userId] = params;
      for (const s of state.sessions.values()) {
        if (s.user_id === userId && !s.revoked_at) {
          s.revoked_at = new Date();
          s.revocation_reason = reason;
        }
      }
      return { rows: [], rowCount: 1 };
    }

    // 22. auth_security_events - INSERT
    if (normalized.startsWith("INSERT INTO auth_security_events")) {
      const [eventType, userId, ipAddress, userAgent, metadataStr] = params;
      const id = crypto.randomUUID();
      const event = {
        id,
        event_type: eventType,
        eventType,
        user_id: userId ?? null,
        userId: userId ?? null,
        ip_address: ipAddress ?? null,
        user_agent: userAgent ?? null,
        metadata: metadataStr ? JSON.parse(metadataStr) : {},
        created_at: new Date(),
      };
      state.securityEvents.push(event);
      return { rows: [event], rowCount: 1 };
    }

    // 23. agency_memberships - SELECT by user_id
    if (normalized.includes("FROM agency_memberships WHERE user_id = $1")) {
      const [userId] = params;
      const memberships = Array.from(state.agencyMemberships.values()).filter(
        (m) => m.user_id === userId,
      );
      return { rows: memberships, rowCount: memberships.length };
    }

    // 24. broker_verifications - SELECT by user_id
    if (normalized.includes("FROM broker_verifications WHERE user_id = $1")) {
      const [userId] = params;
      const ver = Array.from(state.brokerVerifications.values()).find(
        (v) => v.user_id === userId,
      );
      return { rows: ver ? [ver] : [], rowCount: ver ? 1 : 0 };
    }

    // Fallback: empty rows
    return { rows: [], rowCount: 0 };
  };

  const mockClient: PoolClient = {
    query: async (queryTextOrConfig: any, values?: any[]) => {
      if (typeof queryTextOrConfig === "string") {
        return executeSql(queryTextOrConfig, values);
      }
      return executeSql(queryTextOrConfig.text, queryTextOrConfig.values);
    },
    release: () => {},
  } as unknown as PoolClient;

  const mockPool = {
    query: async (queryTextOrConfig: any, values?: any[]) => {
      if (typeof queryTextOrConfig === "string") {
        return executeSql(queryTextOrConfig, values);
      }
      return executeSql(queryTextOrConfig.text, queryTextOrConfig.values);
    },
    connect: async () => mockClient,
    end: async () => {},
    on: () => mockPool,
    _state: state,
  } as unknown as Pool;

  return mockPool;
}
