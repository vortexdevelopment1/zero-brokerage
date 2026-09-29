/**
 * Centralized Analytics Abstraction for Zero Brokerage User Mobile
 *
 * Privacy Rules:
 * - Strictly strips: access tokens, refresh tokens, OTPs, passwords, precise GPS coordinates, phone numbers.
 * - Restricts event names to approved taxonomy.
 * - Does not introduce unapproved third-party tracking SDKs.
 */

export const ANALYTICS_EVENTS = {
  HOME_VIEWED: "home_viewed",
  SEARCH_STARTED: "search_started",
  SEARCH_SUBMITTED: "search_submitted",
  FILTER_APPLIED: "filter_applied",
  FILTER_RESET: "filter_reset",
  LOCATION_SELECTED: "location_selected",
  LISTING_CARD_VIEWED: "listing_card_viewed",
  LISTING_OPENED: "listing_opened",
  SPONSORED_LISTING_IMPRESSION: "sponsored_listing_impression",
  SPONSORED_LISTING_OPENED: "sponsored_listing_opened",
  EMPTY_RESULTS_DISPLAYED: "empty_results_displayed",
  FURNITURE_BANNER_CLICKED: "furniture_banner_clicked",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const FORBIDDEN_PROPERTIES = new Set([
  "accesstoken",
  "refreshtoken",
  "token",
  "otp",
  "password",
  "secret",
  "latitude",
  "longitude",
  "coords",
  "coordinates",
  "phone",
  "phonenumber",
  "email",
]);

/**
 * Sanitizes event properties to eliminate PII and security tokens.
 */
export function sanitizeAnalyticsProps(
  props?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  if (!props) return {};

  const clean: Record<string, string | number | boolean> = {};

  for (const [key, val] of Object.entries(props)) {
    if (FORBIDDEN_PROPERTIES.has(key.toLowerCase())) {
      continue;
    }
    if (val === null || val === undefined) {
      continue;
    }
    if (
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean"
    ) {
      clean[key] = val;
    }
  }

  return clean;
}

export type AnalyticsHandler = (
  event: AnalyticsEventName,
  props: Record<string, string | number | boolean>,
) => void;

let customHandler: AnalyticsHandler | null = null;

export function registerAnalyticsHandler(handler: AnalyticsHandler | null) {
  customHandler = handler;
}

/**
 * Dispatches an analytics event with sanitized telemetry payload.
 */
export function trackEvent(
  event: AnalyticsEventName,
  props?: Record<string, unknown>,
): void {
  const sanitized = sanitizeAnalyticsProps(props);

  if (customHandler) {
    customHandler(event, sanitized);
  } else if (__DEV__) {
    // In development mode, log clean telemetry event
    // console.log(`[Telemetry] ${event}`, sanitized);
  }
}
