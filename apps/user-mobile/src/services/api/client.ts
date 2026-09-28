import { appConfig } from "../../lib/config";
import {
  clearAuthCredentials,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "../auth/secure-storage";

import { ApiError, parseApiErrorEnvelope } from "./errors";
import type {
  ApiRequestOptions,
  ApiRequestResult,
  ApiSuccessEnvelope,
} from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;

function createTimeoutController(
  timeoutMs: number,
  signal?: AbortSignal,
): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const abortHandler = () => {
    controller.abort();
  };

  signal?.addEventListener("abort", abortHandler, {
    once: true,
  });

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortHandler);
    },
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      throw new ApiError(
        "INVALID_RESPONSE",
        "The server returned an invalid JSON response.",
        {
          cause: error,
        },
      );
    }
  }

  return response.text();
}

/**
 * Concurrency-safe single-flight refresh lock to prevent concurrent refresh storms.
 */
let activeRefreshPromise: Promise<string | null> | null = null;

async function executeSingleFlightRefresh(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearAuthCredentials();
        return null;
      }

      const response = await fetch(
        `${appConfig.apiBaseUrl}/api/v1/auth/refresh-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        },
      );

      if (!response.ok) {
        await clearAuthCredentials();
        return null;
      }

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { accessToken: string; refreshToken?: string };
      };

      if (payload?.success && payload?.data?.accessToken) {
        const { accessToken, refreshToken: newRefreshToken } = payload.data;
        await setAccessToken(accessToken);
        if (newRefreshToken) {
          await setRefreshToken(newRefreshToken);
        }
        return accessToken;
      }

      await clearAuthCredentials();
      return null;
    } catch {
      await clearAuthCredentials();
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiRequestResult<T>> {
  const {
    method = "GET",
    body,
    headers = {},
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    token,
    skipAuthRefresh = false,
  } = options;

  const { controller, cleanup } = createTimeoutController(timeoutMs, signal);

  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Attach Bearer token if provided or stored
  const bearerToken = token !== undefined ? token : await getAccessToken();
  if (bearerToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${bearerToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    cleanup();

    if (controller.signal.aborted) {
      if (signal?.aborted) {
        throw new ApiError("ABORTED", "The API request was cancelled.", {
          cause: error,
        });
      }

      throw new ApiError("TIMEOUT", "The API request timed out.", {
        cause: error,
      });
    }

    throw new ApiError("NETWORK_ERROR", "Unable to connect to the server.", {
      cause: error,
    });
  }

  cleanup();

  // If 401 Unauthorized and not already retried or an auth route, attempt single-flight refresh
  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !path.includes("/auth/request-otp") &&
    !path.includes("/auth/verify-otp") &&
    !path.includes("/auth/refresh")
  ) {
    const newAccessToken = await executeSingleFlightRefresh();
    if (newAccessToken) {
      // Retry once with new token and skipAuthRefresh to prevent loops
      return apiRequest<T>(path, {
        ...options,
        token: newAccessToken,
        skipAuthRefresh: true,
      });
    }
  }

  const rawData = await parseResponseBody(response);

  if (!response.ok) {
    const errorEnvelope = parseApiErrorEnvelope(response.status, rawData);
    throw new ApiError(errorEnvelope.code, errorEnvelope.message, {
      status: response.status,
      details: rawData,
      errorDetails: errorEnvelope.details,
    });
  }

  // Unwrap backend `{ success: true, data: ... }` if present
  let unwrappedData = rawData as T;
  if (
    rawData &&
    typeof rawData === "object" &&
    "success" in rawData &&
    (rawData as ApiSuccessEnvelope<T>).success === true &&
    "data" in rawData
  ) {
    unwrappedData = (rawData as ApiSuccessEnvelope<T>).data;
  }

  return {
    data: unwrappedData,
    status: response.status,
    headers: response.headers,
  };
}
