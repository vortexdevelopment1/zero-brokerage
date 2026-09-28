import { create } from "zustand";

import type { AuthChallenge, AuthState, AuthUser } from "./auth.types";

type AuthActions = {
  initialize: () => void;
  startSessionRestore: () => void;
  restoreAsGuest: () => void;
  restoreAuthenticated: (user: AuthUser) => void;
  requireOnboarding: (user: AuthUser) => void;

  startOtpRequest: (phoneNumber: string) => void;
  otpRequired: (challenge: AuthChallenge) => void;
  startVerification: () => void;
  verificationFailed: (message: string) => void;
  authenticationSuccess: (user: AuthUser) => void;

  changePhoneNumber: () => void;

  sessionExpired: () => void;

  startLogout: () => void;
  logoutComplete: () => void;

  setAuthError: (message: string) => void;
  setErrorMessage: (message: string | null) => void;

  reset: () => void;
};

export type AuthStore = AuthState & AuthActions;

const initialAuthState: AuthState = {
  status: "INITIALIZING",
  user: null,
  phoneNumber: null,
  challenge: null,
  errorMessage: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialAuthState,

  initialize: () => {
    set({
      status: "INITIALIZING",
      errorMessage: null,
    });
  },

  startSessionRestore: () => {
    set({
      status: "RESTORING_SESSION",
      errorMessage: null,
    });
  },

  restoreAsGuest: () => {
    set({
      status: "GUEST",
      user: null,
      challenge: null,
      errorMessage: null,
    });
  },

  restoreAuthenticated: (user) => {
    set({
      status: "AUTHENTICATED",
      user,
      challenge: null,
      errorMessage: null,
    });
  },

  requireOnboarding: (user) => {
    set({
      status: "ONBOARDING_REQUIRED",
      user,
      challenge: null,
      errorMessage: null,
    });
  },

  startOtpRequest: (phoneNumber) => {
    set({
      status: "OTP_REQUESTING",
      phoneNumber,
      errorMessage: null,
    });
  },

  otpRequired: (challenge) => {
    set({
      status: "OTP_REQUIRED",
      challenge,
      errorMessage: null,
    });
  },

  startVerification: () => {
    set({
      status: "VERIFYING",
      errorMessage: null,
    });
  },

  verificationFailed: (message) => {
    set({
      status: "OTP_REQUIRED",
      errorMessage: message,
    });
  },

  authenticationSuccess: (user) => {
    set({
      status: "AUTHENTICATED",
      user,
      challenge: null,
      errorMessage: null,
    });
  },

  changePhoneNumber: () => {
    set({
      status: "GUEST",
      challenge: null,
      errorMessage: null,
    });
  },

  sessionExpired: () => {
    set({
      status: "SESSION_EXPIRED",
      user: null,
      challenge: null,
      errorMessage: "Your session has expired. Please sign in again.",
    });
  },

  startLogout: () => {
    set({
      status: "LOGGING_OUT",
      errorMessage: null,
    });
  },

  logoutComplete: () => {
    set({
      status: "GUEST",
      user: null,
      phoneNumber: null,
      challenge: null,
      errorMessage: null,
    });
  },

  setAuthError: (message) => {
    set({
      status: "AUTH_ERROR",
      errorMessage: message,
    });
  },

  setErrorMessage: (message) => {
    set({
      errorMessage: message,
    });
  },

  reset: () => {
    set(initialAuthState);
  },
}));
