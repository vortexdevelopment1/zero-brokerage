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
  // Step 6 Approved Events (Taxonomy from Blueprint Section 16)
  VISIT_FLOW_STARTED: "visit_flow_started",
  VISIT_AVAILABILITY_VIEWED: "visit_availability_viewed",
  VISIT_SLOT_SELECTED: "visit_slot_selected",
  VISIT_REQUEST_SUBMITTED: "visit_request_submitted",
  VISIT_REQUEST_CONFIRMED: "visit_request_confirmed",
  VISIT_RESCHEDULE_REQUESTED: "visit_reschedule_requested",
  VISIT_CANCELLED: "visit_cancelled",
  INQUIRY_STARTED: "inquiry_started",
  INQUIRY_SUBMITTED: "inquiry_submitted",
  CONTACT_ACTION_INITIATED: "contact_action_initiated",
  COMMUNICATION_ACTION_COMPLETED: "communication_action_completed",
  // Step 7 Approved Events (Taxonomy from Blueprint Section 15)
  NOTIFICATION_CENTER_VIEWED: "notification_center_viewed",
  NOTIFICATION_OPENED: "notification_opened",
  NOTIFICATION_MARKED_READ: "notification_marked_read",
  NOTIFICATIONS_MARKED_ALL_READ: "notifications_marked_all_read",
  NOTIFICATION_DEEP_LINK_ATTEMPTED: "notification_deep_link_attempted",
  NOTIFICATION_DEEP_LINK_FAILED: "notification_deep_link_failed",
  SUPPORT_FLOW_STARTED: "support_flow_started",
  SUPPORT_REQUEST_SUBMITTED: "support_request_submitted",
  PUSH_PERMISSION_PROMPT_SHOWN: "push_permission_prompt_shown",
  PUSH_PERMISSION_RESULT: "push_permission_result",
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
  "body",
  "notificationbody",
  "description",
  "message",
  "ticketmessage",
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
