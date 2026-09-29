import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeAnalyticsProps,
  trackEvent,
  registerAnalyticsHandler,
} from "../src/services/analytics/analytics";

describe("analytics: privacy sanitization & event dispatching", () => {
  it("strictly strips PII, passwords, tokens, and precise coordinates", () => {
    const rawProps = {
      listingId: "550e8400-e29b-41d4-a716-446655440000",
      queryLength: 12,
      isSponsored: false,
      accessToken: "eyJhbGciOi...",
      refreshToken: "f4b6...",
      otp: "987654",
      password: "secret_password",
      secret: "super_secret",
      latitude: 12.9716,
      longitude: 77.5946,
      coords: "12.9716,77.5946",
      phone: "+919876543210",
      email: "user@example.com",
    };

    const sanitized = sanitizeAnalyticsProps(rawProps);

    // Allowed telemetry
    assert.equal(sanitized.listingId, "550e8400-e29b-41d4-a716-446655440000");
    assert.equal(sanitized.queryLength, 12);
    assert.equal(sanitized.isSponsored, false);

    // Stripped sensitive values
    assert.equal(sanitized.accessToken, undefined);
    assert.equal(sanitized.refreshToken, undefined);
    assert.equal(sanitized.otp, undefined);
    assert.equal(sanitized.password, undefined);
    assert.equal(sanitized.secret, undefined);
    assert.equal(sanitized.latitude, undefined);
    assert.equal(sanitized.longitude, undefined);
    assert.equal(sanitized.coords, undefined);
    assert.equal(sanitized.phone, undefined);
    assert.equal(sanitized.email, undefined);
  });

  it("dispatches sanitized telemetry event to registered handler", () => {
    let capturedEvent: string | null = null;
    let capturedProps: Record<string, string | number | boolean> | null = null;

    registerAnalyticsHandler((event, props) => {
      capturedEvent = event;
      capturedProps = props;
    });

    trackEvent("listing_opened", {
      listingId: "550e8400-e29b-41d4-a716-446655440000",
      isSponsored: true,
      otp: "123456", // Must be stripped
    });

    assert.equal(capturedEvent, "listing_opened");
    assert.notEqual(capturedProps, null);
    assert.equal(
      capturedProps?.listingId,
      "550e8400-e29b-41d4-a716-446655440000",
    );
    assert.equal(capturedProps?.isSponsored, true);
    assert.equal(capturedProps?.otp, undefined);

    registerAnalyticsHandler(null);
  });
});
