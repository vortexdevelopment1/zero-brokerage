import type { RateLimitPolicy } from "./types.js";

/**
 * Standard endpoint-specific rate limiting policies aligned with the Step 05 blueprint.
 * High-risk categories receive dedicated, multi-instance-safe sliding-window constraints.
 */
export const RATE_LIMIT_POLICIES = {
  // --- High-Risk Authentication & Identity Endpoints (Currently Implemented) ---
  AUTH_REQUEST_OTP: {
    id: "auth:request-otp",
    maxRequests: 5,
    windowSeconds: 60,
    scopeStrategy: "ip",
    errorMessage:
      "Too many OTP requests. Please wait before requesting another code.",
  },

  AUTH_VERIFY_OTP: {
    id: "auth:verify-otp",
    maxRequests: 5,
    windowSeconds: 60,
    scopeStrategy: "ip",
    errorMessage:
      "Too many verification attempts. Please wait before trying again.",
  },

  AUTH_REFRESH: {
    id: "auth:refresh",
    maxRequests: 10,
    windowSeconds: 60,
    scopeStrategy: "ip",
    errorMessage: "Too many session refresh requests. Please try again later.",
  },

  AUTH_LOGOUT: {
    id: "auth:logout",
    maxRequests: 20,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage: "Too many logout requests.",
  },

  AUTH_STEP_UP_REQUEST: {
    id: "auth:step-up:request",
    maxRequests: 3,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage:
      "Too many step-up challenge requests. Please wait before retrying.",
  },

  AUTH_STEP_UP_VERIFY: {
    id: "auth:step-up:verify",
    maxRequests: 5,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage: "Too many step-up verification attempts. Challenge locked.",
  },

  AUTH_CHANGE_PHONE: {
    id: "auth:change-phone",
    maxRequests: 3,
    windowSeconds: 300,
    scopeStrategy: "actor",
    errorMessage:
      "Too many phone change attempts. Please wait 5 minutes before retrying.",
  },

  AUTH_DELETE_ACCOUNT: {
    id: "auth:delete-account",
    maxRequests: 2,
    windowSeconds: 3600,
    scopeStrategy: "actor",
    errorMessage:
      "Too many account deletion attempts. Please contact customer support.",
  },

  // --- Step 05 Blueprint Placeholders for Future Domain Steps (Step 06+) ---
  SEARCH_QUERY: {
    id: "search:query",
    maxRequests: 30,
    windowSeconds: 60,
    scopeStrategy: "ip",
    errorMessage: "Search rate limit exceeded. Please slow down.",
  },

  LISTING_CREATE: {
    id: "listings:create",
    maxRequests: 20,
    windowSeconds: 3600,
    scopeStrategy: "agency_actor",
    errorMessage: "Listing creation rate limit exceeded for this agency.",
  },

  LEAD_CREATE: {
    id: "leads:create",
    maxRequests: 10,
    windowSeconds: 60,
    scopeStrategy: "ip",
    errorMessage:
      "Lead submission limit reached. Please wait before submitting another inquiry.",
  },

  VISIT_BOOK: {
    id: "visits:book",
    maxRequests: 5,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage:
      "Visit scheduling limit reached. Please wait before booking another visit.",
  },

  FILE_UPLOAD_INIT: {
    id: "files:upload-init",
    maxRequests: 10,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage:
      "Upload initiation limit reached. Please complete current uploads first.",
  },

  PAYMENT_ORDER_CREATE: {
    id: "payments:order-create",
    maxRequests: 10,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage:
      "Payment order creation limit reached. Please complete or cancel pending transactions.",
  },

  ADMIN_COMMAND: {
    id: "admin:command",
    maxRequests: 30,
    windowSeconds: 60,
    scopeStrategy: "actor",
    errorMessage: "Administrative command limit exceeded.",
  },

  EXPORT_GENERATE: {
    id: "export:generate",
    maxRequests: 3,
    windowSeconds: 300,
    scopeStrategy: "actor",
    errorMessage:
      "Report export rate limit reached. Please wait before requesting another export.",
  },
} as const satisfies Record<string, RateLimitPolicy>;
