import "./setup";

import assert from "node:assert/strict";
import test from "node:test";

import { bootstrapAuth } from "../src/services/auth/auth-bootstrap";
import {
  logout,
  requestOtp,
  verifyOtp,
} from "../src/services/auth/auth-service";
import { useAuthStore } from "../src/services/auth/auth-store";
import {
  clearAuthCredentials,
  getAccessToken,
  getRefreshToken,
} from "../src/services/auth/secure-storage";

// Setup mock global fetch
const originalFetch = global.fetch;

test("auth-service: requestOtp success flow", async () => {
  useAuthStore.getState().reset();

  global.fetch = (async (url: any, init?: any) => {
    assert.match(String(url), /\/api\/v1\/auth\/request-otp$/);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.phone, "+919876543210");
    assert.equal(body.purpose, "AUTHENTICATION");

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          challengeId: "mock-challenge-123",
          expiresInSeconds: 300,
          resendCooldownSeconds: 60,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as any;

  const success = await requestOtp("9876543210");
  assert.equal(success, true);

  const state = useAuthStore.getState();
  assert.equal(state.status, "OTP_REQUIRED");
  assert.equal(state.phoneNumber, "+919876543210");
  assert.equal(state.challenge?.challengeId, "mock-challenge-123");
  assert.equal(state.challenge?.expiresInSeconds, 300);
});

test("auth-service: requestOtp rate-limited flow", async () => {
  useAuthStore.getState().reset();

  global.fetch = (async () => {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait.",
        },
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }) as any;

  const success = await requestOtp("9876543210");
  assert.equal(success, false);

  const state = useAuthStore.getState();
  assert.equal(state.status, "GUEST");
  assert.match(state.errorMessage || "", /too many attempts/i);
});

test("auth-service: verifyOtp existing user success", async () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().otpRequired({
    challengeId: "mock-challenge-123",
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
    requestedAt: Date.now(),
  });

  global.fetch = (async (url: any) => {
    const urlStr = String(url);
    if (urlStr.endsWith("/api/v1/auth/verify-otp")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: "user-existing-1",
              phone: "+919876543210",
              role: "USER",
              status: "ACTIVE",
            },
            tokens: {
              accessToken: "mock-access-token-123",
              refreshToken: "mock-refresh-token-123",
              expiresInSeconds: 900,
              tokenType: "Bearer",
            },
            isNewUser: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (urlStr.endsWith("/api/v1/auth/me")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: "user-existing-1",
              phone: "+919876543210",
              role: "USER",
              status: "ACTIVE",
              createdAt: "2026-09-01T00:00:00.000Z",
            },
            profile: {
              fullName: "John Doe",
              email: "john@example.com",
              avatarUrl: null,
              preferences: {},
            },
            permissions: [],
            agencyMemberships: [],
            brokerVerification: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unexpected URL: ${urlStr}`);
  }) as any;

  const success = await verifyOtp("123456");
  assert.equal(success, true);

  const state = useAuthStore.getState();
  assert.equal(state.status, "AUTHENTICATED");
  assert.equal(state.user?.id, "user-existing-1");
  assert.equal(state.user?.fullName, "John Doe");

  const storedAccess = await getAccessToken();
  const storedRefresh = await getRefreshToken();
  assert.equal(storedAccess, "mock-access-token-123");
  assert.equal(storedRefresh, "mock-refresh-token-123");
});

test("auth-service: verifyOtp new user routes to ONBOARDING_REQUIRED", async () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().otpRequired({
    challengeId: "mock-challenge-123",
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
    requestedAt: Date.now(),
  });

  global.fetch = (async (url: any) => {
    const urlStr = String(url);
    if (urlStr.endsWith("/api/v1/auth/verify-otp")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: "user-new-2",
              phone: "+919876543210",
              role: "USER",
              status: "ACTIVE",
            },
            tokens: {
              accessToken: "mock-access-token-new",
              refreshToken: "mock-refresh-token-new",
              expiresInSeconds: 900,
              tokenType: "Bearer",
            },
            isNewUser: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error(`Unexpected URL: ${urlStr}`);
  }) as any;

  const success = await verifyOtp("123456");
  assert.equal(success, true);

  const state = useAuthStore.getState();
  assert.equal(state.status, "ONBOARDING_REQUIRED");
  assert.equal(state.user?.id, "user-new-2");
});

test("auth-service: verifyOtp invalid code returns false and keeps OTP_REQUIRED", async () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().otpRequired({
    challengeId: "mock-challenge-123",
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
    requestedAt: Date.now(),
  });

  global.fetch = (async () => {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid verification code",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }) as any;

  const success = await verifyOtp("000000");
  assert.equal(success, false);

  const state = useAuthStore.getState();
  assert.equal(state.status, "OTP_REQUIRED");
  assert.match(state.errorMessage || "", /invalid verification code/i);
});

test("auth-service: logout clears credentials and state even if backend fails", async () => {
  useAuthStore.getState().authenticationSuccess({
    id: "user-123",
  });

  global.fetch = (async () => {
    throw new Error("Network failure");
  }) as any;

  await logout();

  const state = useAuthStore.getState();
  assert.equal(state.status, "GUEST");
  assert.equal(state.user, null);

  const storedAccess = await getAccessToken();
  const storedRefresh = await getRefreshToken();
  assert.equal(storedAccess, null);
  assert.equal(storedRefresh, null);
});

test("auth-service: bootstrapAuth restores as guest when no tokens stored", async () => {
  await clearAuthCredentials();
  useAuthStore.getState().initialize();

  await bootstrapAuth();

  const state = useAuthStore.getState();
  assert.equal(state.status, "GUEST");
  assert.equal(state.user, null);
});

test("cleanup", () => {
  global.fetch = originalFetch;
});
