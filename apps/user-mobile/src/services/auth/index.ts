export {
  clearAuthCredentials,
  deleteAccessToken,
  deleteRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "./secure-storage";

export { useAuthStore } from "./auth-store";

export type {
  AuthState,
  AuthStatus,
  AuthUser,
} from "./auth.types";

export type {
  AuthStore,
} from "./auth-store";

export {
  hasAuthError,
  isAuthenticated,
  isAuthInitializing,
  isGuest,
  isLoggingOut,
  isOtpRequesting,
  isOtpRequired,
  isRestoringSession,
  isSessionExpired,
  isVerifying,
  requiresOnboarding,
} from "./auth-selectors";

export { bootstrapAuth } from "./auth-bootstrap";