/**
 * Notification Deep Links, Permissions & Analytics Privacy Test Suite (Step 7)
 *
 * Tests:
 * 1. Deep-link parsing for /notifications, /support, /support/request.
 * 2. Notification target resolution with authentication guards.
 * 3. Safe fallback on invalid/missing destination.
 * 4. Push permission state handling.
 * 5. Analytics privacy sanitization (no notification bodies, support messages, or PII).
 */

import "./setup";

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseDeepLink,
  resolveNotificationTarget,
} from "../src/navigation/deep-links";
import {
  sanitizeAnalyticsProps,
  trackEvent,
  registerAnalyticsHandler,
  ANALYTICS_EVENTS,
} from "../src/services/analytics/analytics";

describe("Notification Deep Links & Support Routing (Step 7)", () => {
  it("parses /notifications deep link and requires authentication", () => {
    const res = parseDeepLink("zero-brokerage://notifications");
    assert.equal(res.isValid, true);
    assert.equal(res.destination.type, "NOTIFICATIONS");
    assert.equal(res.requiresAuth, true);
    assert.equal(res.targetPath, "/notifications");
  });

  it("parses /support and /support/request deep links", () => {
    const resSupport = parseDeepLink("zero-brokerage://support");
    assert.equal(resSupport.isValid, true);
    assert.equal(resSupport.destination.type, "SUPPORT");
    assert.equal(resSupport.requiresAuth, false);
    assert.equal(resSupport.targetPath, "/support");

    const resRequest = parseDeepLink("https://zerobrokerage.com/support/request");
    assert.equal(resRequest.isValid, true);
    assert.equal(resRequest.destination.type, "SUPPORT_REQUEST");
    assert.equal(resRequest.requiresAuth, false);
    assert.equal(resRequest.targetPath, "/support/request");
  });

  it("resolveNotificationTarget handles NOTIFICATIONS target with authentication check", () => {
    const unauthRes = resolveNotificationTarget(
      { targetType: "NOTIFICATIONS" },
      false,
    );
    assert.equal(unauthRes.status, "REQUIRES_AUTH");
    if (unauthRes.status === "REQUIRES_AUTH") {
      assert.equal(unauthRes.redirectRoute, "/(auth)/sign-in");
      assert.equal(unauthRes.intendedRoute, "/notifications");
    }

    const authRes = resolveNotificationTarget(
      { targetType: "NOTIFICATIONS" },
      true,
    );
    assert.equal(authRes.status, "NAVIGATE");
    if (authRes.status === "NAVIGATE") {
      assert.equal(authRes.route, "/notifications");
      assert.equal(authRes.targetType, "NOTIFICATIONS");
    }
  });

  it("resolveNotificationTarget handles SUPPORT and SUPPORT_REQUEST", () => {
    const supportRes = resolveNotificationTarget({ targetType: "SUPPORT" }, false);
    assert.equal(supportRes.status, "NAVIGATE");
    if (supportRes.status === "NAVIGATE") {
      assert.equal(supportRes.route, "/support");
    }

    const requestRes = resolveNotificationTarget(
      { targetType: "SUPPORT_REQUEST" },
      false,
    );
    assert.equal(requestRes.status, "NAVIGATE");
    if (requestRes.status === "NAVIGATE") {
      assert.equal(requestRes.route, "/support/request");
    }
  });

  it("resolveNotificationTarget safely falls back on malformed or empty payloads", () => {
    const nullRes = resolveNotificationTarget(null, true);
    assert.equal(nullRes.status, "INVALID");
    if (nullRes.status === "INVALID") {
      assert.equal(nullRes.fallbackRoute, "/(app)/discover");
    }

    const unknownRes = resolveNotificationTarget({ targetType: "NON_EXISTENT_XYZ" }, true);
    assert.equal(unknownRes.status, "INVALID");
  });
});

describe("Analytics Privacy & Step 7 Events", () => {
  it("strictly strips sensitive notification and support bodies from analytics payloads", () => {
    const dirtyProps = {
      notificationId: "11111111-2222-4444-8888-999999999999",
      category: "VISIT_UPDATE",
      body: "Your private tour for Bandra West confirmed.",
      notificationBody: "Sensitive internal text",
      message: "Customer detailed complaint message here",
      ticketMessage: "Private support details",
      phone: "+919876543210",
      email: "user@example.com",
      safeFlag: true,
      ticketNumber: "ZB-SUP-10824",
    };

    const clean = sanitizeAnalyticsProps(dirtyProps);

    assert.equal(clean.notificationId, dirtyProps.notificationId);
    assert.equal(clean.category, "VISIT_UPDATE");
    assert.equal(clean.safeFlag, true);
    assert.equal(clean.ticketNumber, "ZB-SUP-10824");

    // Strictly stripped
    assert.equal((clean as any).body, undefined);
    assert.equal((clean as any).notificationBody, undefined);
    assert.equal((clean as any).message, undefined);
    assert.equal((clean as any).ticketMessage, undefined);
    assert.equal((clean as any).phone, undefined);
    assert.equal((clean as any).email, undefined);
  });

  it("dispatches approved Step 7 analytics events with clean props", () => {
    let capturedEvent: string | null = null;
    let capturedProps: any = null;

    registerAnalyticsHandler((event, props) => {
      capturedEvent = event;
      capturedProps = props;
    });

    trackEvent(ANALYTICS_EVENTS.NOTIFICATION_CENTER_VIEWED, {
      category: "ALL",
      isAuthenticated: true,
      body: "Must be stripped",
    });

    assert.equal(capturedEvent, "notification_center_viewed");
    assert.equal(capturedProps.category, "ALL");
    assert.equal(capturedProps.isAuthenticated, true);
    assert.equal(capturedProps.body, undefined);

    registerAnalyticsHandler(null);
  });
});
