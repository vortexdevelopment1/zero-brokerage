import { useAuthStore } from "./auth-store";
import {
  getAccessToken,
  getRefreshToken,
} from "./secure-storage";

export async function bootstrapAuth(): Promise<void> {
  const { startSessionRestore, restoreAsGuest, setAuthError } =
    useAuthStore.getState();

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

    /**
     * The backend authentication contract is not finalized yet.
     *
     * Do not attempt to validate, refresh, or construct a user from
     * stored credentials until the real auth endpoints and response
     * contracts are available.
     */
    restoreAsGuest();
  } catch {
  setAuthError("We couldn't restore your session. Please try again.");
}
}