import { create } from "zustand";

import type {
  AuthState,
  AuthUser,
} from "./auth.types";

type AuthActions = {
  initialize: () => void;
  startSessionRestore: () => void;
  restoreAsGuest: () => void;
  restoreAuthenticated: (user: AuthUser) => void;
  requireOnboarding: (user: AuthUser) => void;

  startOtpRequest: (phoneNumber: string) => void;
  otpRequired: () => void;
  startVerification: () => void;
  authenticationSuccess: (user: AuthUser) => void;

  sessionExpired: () => void;

  startLogout: () => void;
  logoutComplete: () => void;

  setAuthError: (message: string) => void;

  reset: () => void;
};

export type AuthStore = AuthState & AuthActions;

const initialAuthState: AuthState = {
  status: "INITIALIZING",
  user: null,
  phoneNumber: null,
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
      errorMessage: null,
    });
  },

  restoreAuthenticated: (user) => {
    set({
      status: "AUTHENTICATED",
      user,
      errorMessage: null,
    });
  },

  requireOnboarding: (user) => {
    set({
      status: "ONBOARDING_REQUIRED",
      user,
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

  otpRequired: () => {
    set({
      status: "OTP_REQUIRED",
      errorMessage: null,
    });
  },

  startVerification: () => {
    set({
      status: "VERIFYING",
      errorMessage: null,
    });
  },

  authenticationSuccess: (user) => {
    set({
      status: "AUTHENTICATED",
      user,
      errorMessage: null,
    });
  },

  sessionExpired: () => {
    set({
      status: "SESSION_EXPIRED",
      user: null,
      errorMessage: null,
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
      errorMessage: null,
    });
  },

  setAuthError: (message) => {
    set({
      status: "AUTH_ERROR",
      errorMessage: message,
    });
  },

  reset: () => {
    set(initialAuthState);
  },
}));