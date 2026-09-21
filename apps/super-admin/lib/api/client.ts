import { apiEndpoints } from "./endpoints";
import { ApiError } from "@/types/common";

/**
 * Thin, centralized HTTP client. Every real network call in the app should
 * eventually go through here, so auth headers, error handling, and the base
 * URL live in exactly one place.
 *
 * Today (Phase 1 — no backend yet) the service layer under /services calls
 * mock data generators directly and does not invoke this client. It is wired
 * up and ready so that swapping a service's implementation from
 * "return mockData()" to "return apiClient.get(...)" is the only change
 * needed when the Fastify backend goes live — no UI/component changes.
 */

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("vc_admin_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiEndpoints.base}${path}`;
  const token = getAuthToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new ApiError("Unauthorized — session expired.", 401);
  }
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status} ${res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Simulated latency + occasional isolated failure for mock services, so
// loading/error states in the UI are exercised honestly during development.
export async function simulateNetwork<T>(factory: () => T, opts?: { delayMs?: number }): Promise<T> {
  const delay = opts?.delayMs ?? 380 + Math.random() * 260;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return factory();
}
