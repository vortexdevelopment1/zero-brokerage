import {
  apiRequest,
  mapApiErrorToUserMessage,
  type CurrentUserProfileResponse,
  type LogoutResponse,
  type RefreshSessionRequest,
  type RefreshSessionResponse,
  type RequestOtpRequest,
  type RequestOtpResponse,
  type VerifyOtpRequest,
  type VerifyOtpResponse,
} from "../api";

import { useAuthStore } from "./auth-store";
import {
  clearAuthCredentials,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "./secure-storage";

/**
 * Normalizes phone number to canonical E.164. Defaults to India (+91) if 10-digit number.
 */
export function normalizePhoneForApi(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "").trim();
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  return cleaned;
}

/**
 * Request an OTP from the backend for authentication.
 */
export async function requestOtp(phone: string): Promise<boolean> {
  const store = useAuthStore.getState();
  const normalizedPhone = normalizePhoneForApi(phone);

  store.startOtpRequest(normalizedPhone);

  try {
    const result = await apiRequest<RequestOtpResponse>(
      "/api/v1/auth/request-otp",
      {
        method: "POST",
        body: {
          phone: normalizedPhone,
          purpose: "AUTHENTICATION",
        } satisfies RequestOtpRequest,
      },
    );

    store.otpRequired({
      challengeId: result.data.challengeId,
      expiresInSeconds: result.data.expiresInSeconds,
      resendCooldownSeconds: result.data.resendCooldownSeconds,
      requestedAt: Date.now(),
    });

    return true;
  } catch (error) {
    const message = mapApiErrorToUserMessage(error);
    store.setErrorMessage(message);
    useAuthStore.setState({ status: "GUEST", errorMessage: message });
    return false;
  }
}

/**
 * Resend OTP using the stored phone number.
 */
export async function resendOtp(): Promise<boolean> {
  const store = useAuthStore.getState();
  const phone = store.phoneNumber;
  if (!phone) {
    store.setErrorMessage(
      "Phone number missing. Please enter your phone number again.",
    );
    store.restoreAsGuest();
    return false;
  }

  return requestOtp(phone);
}

/**
 * Verify OTP entered by the user.
 */
export async function verifyOtp(code: string): Promise<boolean> {
  const store = useAuthStore.getState();
  const challenge = store.challenge;

  if (!challenge) {
    store.setErrorMessage(
      "Verification session expired. Please request a new code.",
    );
    store.restoreAsGuest();
    return false;
  }

  store.startVerification();

  try {
    const result = await apiRequest<VerifyOtpResponse>(
      "/api/v1/auth/verify-otp",
      {
        method: "POST",
        body: {
          challengeId: challenge.challengeId,
          code,
        } satisfies VerifyOtpRequest,
      },
    );

    const { user, tokens, isNewUser } = result.data;

    // Securely persist tokens
    await Promise.all([
      setAccessToken(tokens.accessToken),
      setRefreshToken(tokens.refreshToken),
    ]);

    const authUser = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    // If new user or profile incomplete, transition to onboarding required
    if (isNewUser) {
      store.requireOnboarding(authUser);
    } else {
      // Check current profile
      try {
        const profileResult = await apiRequest<CurrentUserProfileResponse>(
          "/api/v1/auth/me",
          {
            method: "GET",
            token: tokens.accessToken,
          },
        );

        const profileData = profileResult.data;
        if (!profileData.profile || !profileData.profile.fullName) {
          store.requireOnboarding({
            ...authUser,
            fullName: profileData.profile?.fullName,
            email: profileData.profile?.email,
          });
        } else {
          store.authenticationSuccess({
            ...authUser,
            fullName: profileData.profile.fullName,
            email: profileData.profile.email,
          });
        }
      } catch {
        store.authenticationSuccess(authUser);
      }
    }

    return true;
  } catch (error) {
    const message = mapApiErrorToUserMessage(error);
    store.verificationFailed(message);
    return false;
  }
}

/**
 * Log out current session, revocating on backend and clearing local private state.
 */
export async function logout(): Promise<void> {
  const store = useAuthStore.getState();
  store.startLogout();

  try {
    const token = await getAccessToken();
    if (token) {
      await apiRequest<LogoutResponse>("/api/v1/auth/logout", {
        method: "POST",
        token,
        skipAuthRefresh: true,
      });
    }
  } catch {
    // Network/backend failure must NOT prevent local cleanup
  } finally {
    await clearAuthCredentials();
    store.logoutComplete();
  }
}

/**
 * Attempts session refresh using stored refresh token.
 */
export async function refreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearAuthCredentials();
    useAuthStore.getState().sessionExpired();
    return false;
  }

  try {
    const result = await apiRequest<RefreshSessionResponse>(
      "/api/v1/auth/refresh-session",
      {
        method: "POST",
        body: { refreshToken } satisfies RefreshSessionRequest,
        skipAuthRefresh: true,
      },
    );

    await Promise.all([
      setAccessToken(result.data.accessToken),
      setRefreshToken(result.data.refreshToken),
    ]);

    return true;
  } catch {
    await clearAuthCredentials();
    useAuthStore.getState().sessionExpired();
    return false;
  }
}
