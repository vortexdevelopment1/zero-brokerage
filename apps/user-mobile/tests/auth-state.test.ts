import assert from "node:assert/strict";
import test from "node:test";

import { useAuthStore } from "../src/services/auth/auth-store";

test("auth-state: initial state is INITIALIZING", () => {
  useAuthStore.getState().reset();
  const state = useAuthStore.getState();
  assert.equal(state.status, "INITIALIZING");
  assert.equal(state.user, null);
  assert.equal(state.phoneNumber, null);
  assert.equal(state.challenge, null);
  assert.equal(state.errorMessage, null);
});

test("auth-state: startSessionRestore transitions to RESTORING_SESSION", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().startSessionRestore();
  assert.equal(useAuthStore.getState().status, "RESTORING_SESSION");
});

test("auth-state: restoreAsGuest transitions to GUEST with null user", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().restoreAsGuest();
  const state = useAuthStore.getState();
  assert.equal(state.status, "GUEST");
  assert.equal(state.user, null);
});

test("auth-state: startOtpRequest transitions to OTP_REQUESTING and stores phone", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().startOtpRequest("+919876543210");
  const state = useAuthStore.getState();
  assert.equal(state.status, "OTP_REQUESTING");
  assert.equal(state.phoneNumber, "+919876543210");
});

test("auth-state: otpRequired transitions to OTP_REQUIRED with challenge metadata", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().startOtpRequest("+919876543210");
  useAuthStore.getState().otpRequired({
    challengeId: "test-challenge-uuid",
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
    requestedAt: Date.now(),
  });

  const state = useAuthStore.getState();
  assert.equal(state.status, "OTP_REQUIRED");
  assert.equal(state.challenge?.challengeId, "test-challenge-uuid");
  assert.equal(state.challenge?.expiresInSeconds, 300);
});

test("auth-state: startVerification and verificationFailed transitions", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().otpRequired({
    challengeId: "test-challenge-uuid",
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
    requestedAt: Date.now(),
  });

  useAuthStore.getState().startVerification();
  assert.equal(useAuthStore.getState().status, "VERIFYING");

  useAuthStore.getState().verificationFailed("Invalid verification code");
  const state = useAuthStore.getState();
  assert.equal(state.status, "OTP_REQUIRED");
  assert.equal(state.errorMessage, "Invalid verification code");
  // Challenge preserved so user can retry entering OTP
  assert.equal(state.challenge?.challengeId, "test-challenge-uuid");
});

test("auth-state: authenticationSuccess transitions to AUTHENTICATED and clears challenge", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().otpRequired({
    challengeId: "test-challenge-uuid",
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
    requestedAt: Date.now(),
  });

  const mockUser = {
    id: "user-123",
    phone: "+919876543210",
    role: "USER",
    status: "ACTIVE",
  };

  useAuthStore.getState().authenticationSuccess(mockUser);
  const state = useAuthStore.getState();
  assert.equal(state.status, "AUTHENTICATED");
  assert.deepEqual(state.user, mockUser);
  assert.equal(state.challenge, null);
});

test("auth-state: requireOnboarding transitions to ONBOARDING_REQUIRED", () => {
  useAuthStore.getState().reset();
  const mockUser = {
    id: "user-new",
    phone: "+919876543210",
    role: "USER",
    status: "ACTIVE",
  };

  useAuthStore.getState().requireOnboarding(mockUser);
  const state = useAuthStore.getState();
  assert.equal(state.status, "ONBOARDING_REQUIRED");
  assert.deepEqual(state.user, mockUser);
});

test("auth-state: changePhoneNumber transitions back to GUEST while preserving phone number", () => {
  useAuthStore.getState().reset();
  useAuthStore.getState().startOtpRequest("+919876543210");
  useAuthStore.getState().changePhoneNumber();

  const state = useAuthStore.getState();
  assert.equal(state.status, "GUEST");
  assert.equal(state.phoneNumber, "+919876543210");
  assert.equal(state.challenge, null);
});

test("auth-state: logoutComplete resets to GUEST with null user and phone", () => {
  useAuthStore.getState().authenticationSuccess({
    id: "user-123",
  });
  useAuthStore.getState().startLogout();
  assert.equal(useAuthStore.getState().status, "LOGGING_OUT");

  useAuthStore.getState().logoutComplete();
  const state = useAuthStore.getState();
  assert.equal(state.status, "GUEST");
  assert.equal(state.user, null);
  assert.equal(state.phoneNumber, null);
  assert.equal(state.challenge, null);
});
