import { createHash } from "node:crypto";

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /otp/i,
  /authorization/i,
  /creditcard/i,
  /cvv/i,
];

function isSensitive(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

/**
 * Recursively canonicalizes an object or array by:
 * 1. Sorting object keys lexicographically.
 * 2. Redacting sensitive property values.
 * 3. Removing undefined values.
 */
export function canonicalizePayload(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizePayload(item));
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val === undefined) {
      continue;
    }
    if (isSensitive(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = canonicalizePayload(val);
    }
  }

  return result;
}

/**
 * Computes a deterministic SHA-256 fingerprint for an HTTP request based on:
 * - Method (uppercase)
 * - Route template or path
 * - Canonicalized body
 * - Canonicalized query
 * - Canonicalized params
 */
export function computeRequestFingerprint(request: {
  method: string;
  route: string;
  body?: unknown;
  query?: unknown;
  params?: unknown;
}): string {
  const canonicalData = {
    method: request.method.toUpperCase(),
    route: request.route,
    params: canonicalizePayload(request.params ?? {}),
    query: canonicalizePayload(request.query ?? {}),
    body: canonicalizePayload(request.body ?? {}),
  };

  const jsonString = JSON.stringify(canonicalData);
  return createHash("sha256").update(jsonString, "utf8").digest("hex");
}
