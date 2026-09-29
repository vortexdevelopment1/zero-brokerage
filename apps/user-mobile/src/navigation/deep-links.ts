/**
 * Centralized Deep-Link Parser & Handler Architecture
 *
 * Rules:
 * 1. Allowlist supported deep-link patterns.
 * 2. Validate UUID / parameters strictly.
 * 3. Never treat a deep link as authorization.
 * 4. Check whether destination requires authenticated session.
 * 5. Safely fallback to Discover for unrecognized or malformed deep links.
 */

import { isValidUuid } from "./routes";

export type DeepLinkDestination =
  | { type: "DISCOVER" }
  | { type: "SAVED"; requiresAuth: true }
  | { type: "ACTIVITY"; requiresAuth: true }
  | { type: "ACCOUNT"; requiresAuth: true }
  | { type: "FURNITURE" }
  | { type: "LISTING_DETAIL"; listingId: string }
  | { type: "AUTH_SIGN_IN" }
  | { type: "UNKNOWN" };

export interface ParsedDeepLink {
  readonly destination: DeepLinkDestination;
  readonly originalUrl: string;
  readonly isValid: boolean;
  readonly targetPath: string;
  readonly requiresAuth: boolean;
}

/**
 * Normalizes an incoming URI into a standard path and segments.
 * Supports schemes: `zero-brokerage://` and `https://*.zerobrokerage.com/`
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  if (!url || typeof url !== "string") {
    return {
      destination: { type: "UNKNOWN" },
      originalUrl: "",
      isValid: false,
      targetPath: "/(app)/discover",
      requiresAuth: false,
    };
  }

  const cleanUrl = url.trim();

  // Strip scheme and host
  let path = cleanUrl
    .replace(/^zero-brokerage:\/\//i, "")
    .replace(/^https?:\/\/(?:[a-zA-Z0-9-]+\.)*zerobrokerage\.(?:com|in)/i, "")
    .split("?")[0]
    .split("#")[0];

  // Ensure leading slash
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Remove trailing slashes (except root)
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  const segments = path.split("/").filter(Boolean);

  // Match: / or /discover
  if (segments.length === 0 || segments[0] === "discover") {
    return {
      destination: { type: "DISCOVER" },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/(app)/discover",
      requiresAuth: false,
    };
  }

  // Match: /saved
  if (segments[0] === "saved") {
    return {
      destination: { type: "SAVED", requiresAuth: true },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/(app)/saved",
      requiresAuth: true,
    };
  }

  // Match: /activity
  if (segments[0] === "activity") {
    return {
      destination: { type: "ACTIVITY", requiresAuth: true },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/(app)/activity",
      requiresAuth: true,
    };
  }

  // Match: /account
  if (segments[0] === "account") {
    return {
      destination: { type: "ACCOUNT", requiresAuth: true },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/(app)/account",
      requiresAuth: true,
    };
  }

  // Match: /furniture
  if (segments[0] === "furniture") {
    return {
      destination: { type: "FURNITURE" },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/furniture",
      requiresAuth: false,
    };
  }

  // Match: /auth or /sign-in
  if (segments[0] === "auth" || segments[0] === "sign-in") {
    return {
      destination: { type: "AUTH_SIGN_IN" },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/(auth)/sign-in",
      requiresAuth: false,
    };
  }

  // Match: /listing/:listingId or /listings/:listingId
  if (
    (segments[0] === "listing" || segments[0] === "listings") &&
    segments.length >= 2
  ) {
    const rawId = segments[1];
    if (isValidUuid(rawId)) {
      return {
        destination: { type: "LISTING_DETAIL", listingId: rawId },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: `/listing/${rawId}`,
        requiresAuth: false,
      };
    }
  }

  // Unrecognized deep link - safe fallback
  return {
    destination: { type: "UNKNOWN" },
    originalUrl: cleanUrl,
    isValid: false,
    targetPath: "/(app)/discover",
    requiresAuth: false,
  };
}
