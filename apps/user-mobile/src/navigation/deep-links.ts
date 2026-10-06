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

import { isValidUuid, isValidPlanId } from "./routes";

export type DeepLinkDestination =
  | { type: "DISCOVER" }
  | { type: "SAVED"; requiresAuth: true }
  | { type: "ACTIVITY"; requiresAuth: true }
  | { type: "ACCOUNT"; requiresAuth: true }
  | { type: "FURNITURE" }
  | { type: "FURNITURE_DETAIL"; furnitureId: string }
  | { type: "FURNITURE_CHECKOUT"; requiresAuth: true }
  | { type: "FURNITURE_ORDERS"; requiresAuth: true }
  | { type: "FURNITURE_ORDER_DETAIL"; orderId: string; requiresAuth: true }
  | { type: "LISTING_DETAIL"; listingId: string }
  | { type: "LISTING_SCHEDULE"; listingId: string; requiresAuth: true }
  | { type: "ACTIVITY_VISIT_DETAIL"; visitId: string; requiresAuth: true }
  | { type: "ACTIVITY_INQUIRY_DETAIL"; inquiryId: string; requiresAuth: true }
  | { type: "NOTIFICATIONS"; requiresAuth: true }
  | { type: "SUPPORT" }
  | { type: "SUPPORT_REQUEST" }
  | { type: "SUBSCRIPTION_PLANS" }
  | { type: "SUBSCRIPTION_PLAN_DETAIL"; planId: string }
  | { type: "SUBSCRIPTION_CURRENT"; requiresAuth: true }
  | { type: "PAYMENT_HISTORY"; requiresAuth: true }
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

  const isDev =
    (typeof __DEV__ !== "undefined" && Boolean(__DEV__)) ||
    process.env.NODE_ENV !== "production";

  // Strip scheme and host
  let path = cleanUrl;

  // Development compatibility: Support Expo Go URLs (`exp://<host>/--/<path>`)
  if (isDev && /^exp:\/\//i.test(cleanUrl)) {
    const expoMatch = cleanUrl.match(/^exp:\/\/[^/]+\/--\/(.*)$/i);
    if (expoMatch) {
      path = "/" + expoMatch[1];
    } else {
      return {
        destination: { type: "UNKNOWN" },
        originalUrl: cleanUrl,
        isValid: false,
        targetPath: "/(app)/discover",
        requiresAuth: false,
      };
    }
  } else {
    path = path
      .replace(/^zero-brokerage:\/\//i, "")
      .replace(
        /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*zerobrokerage\.(?:com|in)/i,
        "",
      );
  }

  path = path.split("?")[0].split("#")[0];

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

  // Match: /activity or /activity/visits/:visitId or /activity/inquiries/:inquiryId
  if (segments[0] === "activity") {
    if (segments.length === 1) {
      return {
        destination: { type: "ACTIVITY", requiresAuth: true },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/(app)/activity",
        requiresAuth: true,
      };
    }

    if (
      (segments[1] === "visits" || segments[1] === "visit") &&
      segments.length >= 3
    ) {
      const visitId = segments[2];
      if (isValidUuid(visitId)) {
        return {
          destination: {
            type: "ACTIVITY_VISIT_DETAIL",
            visitId,
            requiresAuth: true,
          },
          originalUrl: cleanUrl,
          isValid: true,
          targetPath: `/activity/visits/${visitId}`,
          requiresAuth: true,
        };
      }
    }

    if (
      (segments[1] === "inquiries" || segments[1] === "inquiry") &&
      segments.length >= 3
    ) {
      const inquiryId = segments[2];
      if (isValidUuid(inquiryId)) {
        return {
          destination: {
            type: "ACTIVITY_INQUIRY_DETAIL",
            inquiryId,
            requiresAuth: true,
          },
          originalUrl: cleanUrl,
          isValid: true,
          targetPath: `/activity/inquiries/${inquiryId}`,
          requiresAuth: true,
        };
      }
    }
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

  // Match: /notifications
  if (segments[0] === "notifications") {
    return {
      destination: { type: "NOTIFICATIONS", requiresAuth: true },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/notifications",
      requiresAuth: true,
    };
  }

  // Match: /support or /support/request
  if (segments[0] === "support") {
    if (segments.length >= 2 && segments[1] === "request") {
      return {
        destination: { type: "SUPPORT_REQUEST" },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/support/request",
        requiresAuth: false,
      };
    }
    return {
      destination: { type: "SUPPORT" },
      originalUrl: cleanUrl,
      isValid: true,
      targetPath: "/support",
      requiresAuth: false,
    };
  }

  // Match: /furniture, /furniture/orders, /furniture/orders/:orderId, /furniture/checkout, /furniture/:id
  if (segments[0] === "furniture") {
    if (segments.length === 1) {
      return {
        destination: { type: "FURNITURE" },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/furniture",
        requiresAuth: false,
      };
    }

    if (segments[1] === "orders") {
      if (segments.length >= 3) {
        const orderId = segments[2];
        if (isValidUuid(orderId)) {
          return {
            destination: {
              type: "FURNITURE_ORDER_DETAIL",
              orderId,
              requiresAuth: true,
            },
            originalUrl: cleanUrl,
            isValid: true,
            targetPath: `/furniture/orders/${orderId}`,
            requiresAuth: true,
          };
        }
      }
      return {
        destination: { type: "FURNITURE_ORDERS", requiresAuth: true },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/furniture/orders",
        requiresAuth: true,
      };
    }

    if (segments[1] === "checkout") {
      return {
        destination: { type: "FURNITURE_CHECKOUT", requiresAuth: true },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/furniture/checkout",
        requiresAuth: true,
      };
    }

    const rawId = segments[1];
    if (isValidUuid(rawId)) {
      return {
        destination: { type: "FURNITURE_DETAIL", furnitureId: rawId },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: `/furniture/${rawId}`,
        requiresAuth: false,
      };
    }
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

  // Match: /listing/:listingId or /listings/:listingId or /listing/:listingId/schedule
  if (
    (segments[0] === "listing" || segments[0] === "listings") &&
    segments.length >= 2
  ) {
    const rawId = segments[1];
    if (isValidUuid(rawId)) {
      if (segments.length >= 3 && segments[2] === "schedule") {
        return {
          destination: {
            type: "LISTING_SCHEDULE",
            listingId: rawId,
            requiresAuth: true,
          },
          originalUrl: cleanUrl,
          isValid: true,
          targetPath: `/listing/${rawId}/schedule`,
          requiresAuth: true,
        };
      }

      return {
        destination: { type: "LISTING_DETAIL", listingId: rawId },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: `/listing/${rawId}`,
        requiresAuth: false,
      };
    }
  }

  // Match: /subscriptions, /plans, /membership
  if (
    segments[0] === "subscriptions" ||
    segments[0] === "plans" ||
    segments[0] === "membership"
  ) {
    if (segments.length === 1) {
      if (segments[0] === "membership") {
        return {
          destination: { type: "SUBSCRIPTION_CURRENT", requiresAuth: true },
          originalUrl: cleanUrl,
          isValid: true,
          targetPath: "/subscriptions/current",
          requiresAuth: true,
        };
      }
      return {
        destination: { type: "SUBSCRIPTION_PLANS" },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/subscriptions",
        requiresAuth: false,
      };
    }

    if (segments[1] === "current") {
      return {
        destination: { type: "SUBSCRIPTION_CURRENT", requiresAuth: true },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/subscriptions/current",
        requiresAuth: true,
      };
    }

    if (segments[1] === "history") {
      return {
        destination: { type: "PAYMENT_HISTORY", requiresAuth: true },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/subscriptions/history",
        requiresAuth: true,
      };
    }

    const planId = segments[1];
    if (isValidPlanId(planId)) {
      return {
        destination: { type: "SUBSCRIPTION_PLAN_DETAIL", planId },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: `/subscriptions/${encodeURIComponent(planId)}`,
        requiresAuth: false,
      };
    }
  }

  // Match: /payments/history
  if (segments[0] === "payments") {
    if (segments.length >= 2 && segments[1] === "history") {
      return {
        destination: { type: "PAYMENT_HISTORY", requiresAuth: true },
        originalUrl: cleanUrl,
        isValid: true,
        targetPath: "/subscriptions/history",
        requiresAuth: true,
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

/**
 * Step 6 Notification Payload Resolution
 *
 * Rules:
 * 1. Validates destination & identifiers strictly.
 * 2. Requires authentication for private resources (Visits, Inquiries, Scheduling).
 * 3. Never trusts payload data (times, statuses) as authoritative.
 * 4. Resolves safe target navigation route or authenticated redirection.
 */
export interface NotificationPayload {
  readonly targetType?:
    "VISIT_DETAIL" | "INQUIRY_DETAIL" | "SCHEDULE_VISIT" | string;
  readonly visitId?: string;
  readonly inquiryId?: string;
  readonly listingId?: string;
  readonly deepLinkUrl?: string;
  readonly [key: string]: unknown;
}

export type NotificationResolutionResult =
  | {
      readonly status: "NAVIGATE";
      readonly route: string;
      readonly targetType:
        | "VISIT_DETAIL"
        | "INQUIRY_DETAIL"
        | "SCHEDULE_VISIT"
        | "LISTING_DETAIL"
        | "NOTIFICATIONS"
        | "SUPPORT"
        | "SUPPORT_REQUEST"
        | "ACCOUNT"
        | "FURNITURE"
        | "FURNITURE_DETAIL"
        | "FURNITURE_ORDERS"
        | "FURNITURE_ORDER_DETAIL"
        | "SUBSCRIPTION_PLANS"
        | "SUBSCRIPTION_PLAN_DETAIL"
        | "SUBSCRIPTION_CURRENT"
        | "PAYMENT_HISTORY";
      readonly resourceId: string;
    }
  | {
      readonly status: "REQUIRES_AUTH";
      readonly redirectRoute: string;
      readonly intendedRoute: string;
    }
  | {
      readonly status: "INVALID";
      readonly fallbackRoute: string;
      readonly reason: string;
    };

export function resolveNotificationTarget(
  payload: NotificationPayload | null | undefined,
  isAuthenticated: boolean,
): NotificationResolutionResult {
  if (!payload || typeof payload !== "object") {
    return {
      status: "INVALID",
      fallbackRoute: "/(app)/discover",
      reason: "Missing or invalid notification payload.",
    };
  }

  // If a deepLinkUrl is provided, parse via deepLink parser
  if (payload.deepLinkUrl) {
    const parsed = parseDeepLink(payload.deepLinkUrl);
    if (!parsed.isValid) {
      return {
        status: "INVALID",
        fallbackRoute: "/(app)/discover",
        reason: "Malformed deep link in notification payload.",
      };
    }
    if (parsed.requiresAuth && !isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: parsed.targetPath,
      };
    }
    if (parsed.destination.type === "ACTIVITY_VISIT_DETAIL") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "VISIT_DETAIL",
        resourceId: parsed.destination.visitId,
      };
    }
    if (parsed.destination.type === "ACTIVITY_INQUIRY_DETAIL") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "INQUIRY_DETAIL",
        resourceId: parsed.destination.inquiryId,
      };
    }
    if (parsed.destination.type === "LISTING_SCHEDULE") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "SCHEDULE_VISIT",
        resourceId: parsed.destination.listingId,
      };
    }
    if (parsed.destination.type === "LISTING_DETAIL") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "LISTING_DETAIL",
        resourceId: parsed.destination.listingId,
      };
    }
    if (parsed.destination.type === "NOTIFICATIONS") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "NOTIFICATIONS",
        resourceId: "notifications",
      };
    }
    if (parsed.destination.type === "SUPPORT") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "SUPPORT",
        resourceId: "support",
      };
    }
    if (parsed.destination.type === "SUPPORT_REQUEST") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "SUPPORT_REQUEST",
        resourceId: "support-request",
      };
    }
    if (parsed.destination.type === "FURNITURE") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "FURNITURE",
        resourceId: "furniture",
      };
    }
    if (parsed.destination.type === "FURNITURE_DETAIL") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "FURNITURE_DETAIL",
        resourceId: parsed.destination.furnitureId,
      };
    }
    if (parsed.destination.type === "FURNITURE_ORDERS") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "FURNITURE_ORDERS",
        resourceId: "furniture-orders",
      };
    }
    if (parsed.destination.type === "FURNITURE_ORDER_DETAIL") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "FURNITURE_ORDER_DETAIL",
        resourceId: parsed.destination.orderId,
      };
    }
    if (parsed.destination.type === "SUBSCRIPTION_PLANS") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "SUBSCRIPTION_PLANS",
        resourceId: "plans",
      };
    }
    if (parsed.destination.type === "SUBSCRIPTION_PLAN_DETAIL") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "SUBSCRIPTION_PLAN_DETAIL",
        resourceId: parsed.destination.planId,
      };
    }
    if (parsed.destination.type === "SUBSCRIPTION_CURRENT") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "SUBSCRIPTION_CURRENT",
        resourceId: "current",
      };
    }
    if (parsed.destination.type === "PAYMENT_HISTORY") {
      return {
        status: "NAVIGATE",
        route: parsed.targetPath,
        targetType: "PAYMENT_HISTORY",
        resourceId: "history",
      };
    }
  }

  const targetType = String(payload.targetType || "").toUpperCase();

  if (targetType === "NOTIFICATIONS") {
    const targetRoute = "/notifications";
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "NOTIFICATIONS",
      resourceId: "notifications",
    };
  }

  if (targetType === "SUPPORT") {
    return {
      status: "NAVIGATE",
      route: "/support",
      targetType: "SUPPORT",
      resourceId: "support",
    };
  }

  if (targetType === "SUPPORT_REQUEST") {
    return {
      status: "NAVIGATE",
      route: "/support/request",
      targetType: "SUPPORT_REQUEST",
      resourceId: "support-request",
    };
  }

  if (targetType === "ACCOUNT") {
    const targetRoute = "/(app)/account";
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "ACCOUNT",
      resourceId: "account",
    };
  }

  if (targetType === "LISTING_DETAIL") {
    const listingId = payload.listingId;
    if (!listingId || !isValidUuid(listingId)) {
      return {
        status: "INVALID",
        fallbackRoute: "/(app)/discover",
        reason: "Invalid listingId in notification payload.",
      };
    }
    return {
      status: "NAVIGATE",
      route: `/listing/${listingId}`,
      targetType: "LISTING_DETAIL",
      resourceId: listingId,
    };
  }

  if (targetType === "VISIT_DETAIL") {
    const visitId = payload.visitId;
    if (!visitId || !isValidUuid(visitId)) {
      return {
        status: "INVALID",
        fallbackRoute: "/(app)/discover",
        reason: "Invalid visitId in notification payload.",
      };
    }
    const targetRoute = `/activity/visits/${visitId}`;
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "VISIT_DETAIL",
      resourceId: visitId,
    };
  }

  if (targetType === "INQUIRY_DETAIL") {
    const inquiryId = payload.inquiryId;
    if (!inquiryId || !isValidUuid(inquiryId)) {
      return {
        status: "INVALID",
        fallbackRoute: "/(app)/discover",
        reason: "Invalid inquiryId in notification payload.",
      };
    }
    const targetRoute = `/activity/inquiries/${inquiryId}`;
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "INQUIRY_DETAIL",
      resourceId: inquiryId,
    };
  }

  if (targetType === "SCHEDULE_VISIT") {
    const listingId = payload.listingId;
    if (!listingId || !isValidUuid(listingId)) {
      return {
        status: "INVALID",
        fallbackRoute: "/(app)/discover",
        reason: "Invalid listingId in notification payload.",
      };
    }
    const targetRoute = `/listing/${listingId}/schedule`;
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "SCHEDULE_VISIT",
      resourceId: listingId,
    };
  }

  if (targetType === "FURNITURE") {
    return {
      status: "NAVIGATE",
      route: "/furniture",
      targetType: "FURNITURE",
      resourceId: "furniture",
    };
  }

  if (targetType === "FURNITURE_ORDERS") {
    const targetRoute = "/furniture/orders";
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "FURNITURE_ORDERS",
      resourceId: "furniture-orders",
    };
  }

  if (targetType === "FURNITURE_ORDER_DETAIL") {
    const orderId = String(payload.orderId || payload.resourceId || "");
    if (!orderId || !isValidUuid(orderId)) {
      return {
        status: "INVALID",
        fallbackRoute: "/furniture/orders",
        reason: "Invalid orderId in notification payload.",
      };
    }
    const targetRoute = `/furniture/orders/${orderId}`;
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "FURNITURE_ORDER_DETAIL",
      resourceId: orderId,
    };
  }

  if (targetType === "FURNITURE_DETAIL") {
    const furnitureId = String(payload.furnitureId || payload.resourceId || "");
    if (!furnitureId || !isValidUuid(furnitureId)) {
      return {
        status: "INVALID",
        fallbackRoute: "/furniture",
        reason: "Invalid furnitureId in notification payload.",
      };
    }
    return {
      status: "NAVIGATE",
      route: `/furniture/${furnitureId}`,
      targetType: "FURNITURE_DETAIL",
      resourceId: furnitureId,
    };
  }

  if (targetType === "SUBSCRIPTION_PLANS") {
    return {
      status: "NAVIGATE",
      route: "/subscriptions",
      targetType: "SUBSCRIPTION_PLANS",
      resourceId: "plans",
    };
  }

  if (targetType === "SUBSCRIPTION_CURRENT") {
    const targetRoute = "/subscriptions/current";
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "SUBSCRIPTION_CURRENT",
      resourceId: "current",
    };
  }

  if (targetType === "PAYMENT_HISTORY") {
    const targetRoute = "/subscriptions/history";
    if (!isAuthenticated) {
      return {
        status: "REQUIRES_AUTH",
        redirectRoute: "/(auth)/sign-in",
        intendedRoute: targetRoute,
      };
    }
    return {
      status: "NAVIGATE",
      route: targetRoute,
      targetType: "PAYMENT_HISTORY",
      resourceId: "history",
    };
  }

  return {
    status: "INVALID",
    fallbackRoute: "/(app)/discover",
    reason: "Unrecognized notification destination.",
  };
}
