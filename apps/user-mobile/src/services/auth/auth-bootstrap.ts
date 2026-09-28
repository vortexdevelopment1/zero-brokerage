import { apiRequest, type CurrentUserProfileResponse } from "../api";

import { refreshSession } from "./auth-service";
import { useAuthStore } from "./auth-store";
import {
  clearAuthCredentials,
  getAccessToken,
  getRefreshToken,
} from "./secure-storage";

export async function bootstrapAuth(): Promise<void> {
  const {
    startSessionRestore,
    restoreAsGuest,
    restoreAuthenticated,
    requireOnboarding,
  } = useAuthStore.getState();

  startSessionRestore();

  try {
    const [accessToken, refreshToken] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
    ]);

    if (!accessToken && !refreshToken) {
      restoreAsGuest();
      return;
    }

    let validToken = accessToken;

    // If access token is missing but refresh token exists, attempt refresh first
    if (!validToken && refreshToken) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        restoreAsGuest();
        return;
      }
      validToken = await getAccessToken();
    }

    if (!validToken) {
      restoreAsGuest();
      return;
    }

    // Validate token by fetching current user profile
    try {
      const profileResult = await apiRequest<CurrentUserProfileResponse>(
        "/api/v1/auth/me",
        {
          method: "GET",
          token: validToken,
        },
      );

      const { user, profile } = profileResult.data;

      const authUser = {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
        fullName: profile?.fullName,
        email: profile?.email,
      };

      if (!profile || !profile.fullName) {
        requireOnboarding(authUser);
      } else {
        restoreAuthenticated(authUser);
      }
    } catch (profileError) {
      // If 401 Unauthorized, attempt refresh once
      if (
        profileError &&
        typeof profileError === "object" &&
        "status" in profileError &&
        profileError.status === 401 &&
        refreshToken
      ) {
        const refreshed = await refreshSession();
        if (refreshed) {
          const newToken = await getAccessToken();
          if (newToken) {
            const retryProfile = await apiRequest<CurrentUserProfileResponse>(
              "/api/v1/auth/me",
              {
                method: "GET",
                token: newToken,
                skipAuthRefresh: true,
              },
            );

            const { user, profile } = retryProfile.data;
            const authUser = {
              id: user.id,
              phone: user.phone,
              role: user.role,
              status: user.status,
              fullName: profile?.fullName,
              email: profile?.email,
            };

            if (!profile || !profile.fullName) {
              requireOnboarding(authUser);
            } else {
              restoreAuthenticated(authUser);
            }
            return;
          }
        }
      }

      // If invalid or refresh failed, clear credentials and enter guest mode
      await clearAuthCredentials();
      restoreAsGuest();
    }
  } catch {
    await clearAuthCredentials();
    restoreAsGuest();
  }
}
