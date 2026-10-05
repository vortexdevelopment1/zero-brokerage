/**
 * Centralized Route Definitions and Navigation Helpers for Zero Brokerage User Mobile.
 *
 * Strict Rules:
 * 1. Use stable public resource identifiers (RFC 4122 UUIDs).
 * 2. Never pass complete listing, user, or financial objects in route parameters.
 * 3. Never pass tokens, secrets, OTPs, or passwords in route parameters.
 * 4. Never use client route parameters as an authorization mechanism.
 */

// Canonical UUID v4/RFC 4122 validation pattern (permitting optional domain/fixture prefixes like inq-, v-, fixture-)
export const UUID_REGEX =
  /^(?:(?:inq|v|fixture)-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const FIXTURE_ID_REGEX = /^(?:inq|v)-fixture-\d+$/i;

export function isValidUuid(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed) || FIXTURE_ID_REGEX.test(trimmed);
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
  LISTING_SCHEDULE: "/listing/[id]/schedule",

  // Activity Sub-journeys (M05)
  ACTIVITY_VISIT_DETAIL: "/activity/visits/[visitId]",
  ACTIVITY_INQUIRY_DETAIL: "/activity/inquiries/[inquiryId]",

  // Notifications & Support (Step 7)
  NOTIFICATIONS: "/notifications",
  SUPPORT: "/support",
  SUPPORT_REQUEST: "/support/request",

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
 * Route Builder for Schedule Private Visit
 */
export function getListingScheduleRoute(listingId: string): string {
  const sanitizedId = listingId.trim();
  if (!isValidUuid(sanitizedId)) {
    throw new Error(
      `Invalid listing identifier: '${listingId}'. Navigation requires a valid UUID.`,
    );
  }
  return `/listing/${sanitizedId}/schedule`;
}

/**
 * Route Builder for Visit Detail
 */
export function getVisitDetailRoute(visitId: string): string {
  const sanitizedId = visitId.trim();
  if (!isValidUuid(sanitizedId)) {
    throw new Error(
      `Invalid visit identifier: '${visitId}'. Navigation requires a valid UUID.`,
    );
  }
  return `/activity/visits/${sanitizedId}`;
}

/**
 * Route Builder for Inquiry Detail
 */
export function getInquiryDetailRoute(inquiryId: string): string {
  const sanitizedId = inquiryId.trim();
  if (!isValidUuid(sanitizedId)) {
    throw new Error(
      `Invalid inquiry identifier: '${inquiryId}'. Navigation requires a valid UUID.`,
    );
  }
  return `/activity/inquiries/${sanitizedId}`;
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
