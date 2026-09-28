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
  phone?: string;
  role?: string;
  status?: string;
  fullName?: string | null;
  email?: string | null;
};

export type AuthChallenge = {
  challengeId: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  requestedAt: number;
};

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  phoneNumber: string | null;
  challenge: AuthChallenge | null;
  errorMessage: string | null;
};
