import { appConfig } from "@/lib/config";

import { ApiError } from "./errors";
import type {
  ApiRequestOptions,
  ApiRequestResult,
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

async function parseResponseBody(
  response: Response,
): Promise<unknown> {
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
  } = options;

  const { controller, cleanup } = createTimeoutController(
    timeoutMs,
    signal,
  );

  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
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
    if (controller.signal.aborted) {
      cleanup();

      if (signal?.aborted) {
        throw new ApiError(
          "ABORTED",
          "The API request was cancelled.",
          {
            cause: error,
          },
        );
      }

      throw new ApiError(
        "TIMEOUT",
        "The API request timed out.",
        {
          cause: error,
        },
      );
    }

    cleanup();

    throw new ApiError(
      "NETWORK_ERROR",
      "Unable to connect to the server.",
      {
        cause: error,
      },
    );
  }

  cleanup();

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      "HTTP_ERROR",
      "The API request failed.",
      {
        status: response.status,
        details: data,
      },
    );
  }

  return {
    data: data as T,
    status: response.status,
    headers: response.headers,
  };
}