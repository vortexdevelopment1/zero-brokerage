import type { Pool, PoolClient } from "pg";
import { recordSecurityEvent } from "../repositories/security-event-repository.js";

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /otp/i,
  /token/i,
  /secret/i,
  /code/i,
  /authorization/i,
  /cookie/i,
  /hash/i,
  /credential/i,
  /jwt/i,
];

/**
 * Sanitizes arbitrary metadata before audit persistence, ensuring no secrets,
 * passwords, OTPs, tokens, or cryptographic material leak into logs.
 */
export function sanitizeAuditMetadata(
  raw?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      pattern.test(key),
    );

    if (isSensitive) {
      clean[key] = "[REDACTED]";
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

export interface AdminAuditEventParams {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null | undefined;
  sessionId?: string | null | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Persists an authoritative ADMIN_PRIVILEGE_USED security event with sanitized metadata.
 */
export async function recordAdminPrivilegeUsed(
  executor: Pool | PoolClient,
  params: AdminAuditEventParams,
): Promise<void> {
  const sanitizedMeta = sanitizeAuditMetadata(params.metadata);

  await recordSecurityEvent(executor, {
    eventType: "ADMIN_PRIVILEGE_USED",
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      sessionId: params.sessionId ?? null,
      ...sanitizedMeta,
    },
  });
}
