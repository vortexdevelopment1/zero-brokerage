export type AuthStatus =
  | "INITIALIZING"
  | "RESTORING_SESSION"
  | "GUEST"
  | "OTP_REQUESTING"
  | "OTP_REQUIRED"
  | "VERIFYING"
  | "AUTHENTICATED"
  | "ONBOARDING_REQUIRED"
  | "SESSION_EXPIRED"
  | "LOGGING_OUT"
  | "AUTH_ERROR";

export type AuthUser = {
  id: string;
};

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  phoneNumber: string | null;
  errorMessage: string | null;
};