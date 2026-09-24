import type { AuthState } from "./auth.types";

export function isAuthInitializing(state: AuthState): boolean {
  return state.status === "INITIALIZING";
}

export function isRestoringSession(state: AuthState): boolean {
  return state.status === "RESTORING_SESSION";
}

export function isGuest(state: AuthState): boolean {
  return state.status === "GUEST";
}

export function isAuthenticated(state: AuthState): boolean {
  return state.status === "AUTHENTICATED";
}

export function requiresOnboarding(state: AuthState): boolean {
  return state.status === "ONBOARDING_REQUIRED";
}

export function isOtpRequesting(state: AuthState): boolean {
  return state.status === "OTP_REQUESTING";
}

export function isOtpRequired(state: AuthState): boolean {
  return state.status === "OTP_REQUIRED";
}

export function isVerifying(state: AuthState): boolean {
  return state.status === "VERIFYING";
}

export function isSessionExpired(state: AuthState): boolean {
  return state.status === "SESSION_EXPIRED";
}

export function isLoggingOut(state: AuthState): boolean {
  return state.status === "LOGGING_OUT";
}

export function hasAuthError(state: AuthState): boolean {
  return state.status === "AUTH_ERROR";
}