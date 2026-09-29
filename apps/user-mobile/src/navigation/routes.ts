/**
 * Centralized Route Definitions and Navigation Helpers for Zero Brokerage User Mobile.
 *
 * Strict Rules:
 * 1. Use stable public resource identifiers (RFC 4122 UUIDs).
 * 2. Never pass complete listing, user, or financial objects in route parameters.
 * 3. Never pass tokens, secrets, OTPs, or passwords in route parameters.
 * 4. Never use client route parameters as an authorization mechanism.
 */

// Canonical UUID v4/RFC 4122 validation pattern
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

/**
 * Primary Route Paths
 */
export const ROUTES = {
  // App Shell Tabs
  DISCOVER: "/(app)/discover",
  SAVED: "/(app)/saved",
  ACTIVITY: "/(app)/activity",
  ACCOUNT: "/(app)/account",

  // Contextual Sub-journeys
  FURNITURE: "/furniture",
  LISTING_DETAIL: "/listing/[id]",

  // Auth Journeys
  AUTH_SIGN_IN: "/(auth)/sign-in",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Route Builder for Listing Details
 * Ensures only a valid UUID is passed.
 */
export function getListingDetailRoute(listingId: string): string {
  const sanitizedId = listingId.trim();
  if (!isValidUuid(sanitizedId)) {
    throw new Error(
      `Invalid listing identifier: '${listingId}'. Navigation requires a valid UUID.`,
    );
  }
  return `/listing/${sanitizedId}`;
}

/**
 * Sanitizes route parameters to prevent accidental leakage of sensitive tokens,
 * passwords, OTPs, or complex nested objects.
 */
export function sanitizeRouteParams(
  params: Record<string, unknown>,
): Record<string, string> {
  const SENSITIVE_KEYS = new Set([
    "token",
    "accesstoken",
    "refreshtoken",
    "otp",
    "secret",
    "password",
    "code",
  ]);

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      sanitized[key] = String(value);
    }
  }

  return sanitized;
}
