/**
 * Contract-Neutral Server-State Query Hook
 *
 * Manages request lifecycle (idle, loading, success, error, unavailable, offline),
 * cancellation tokens, pull-to-refresh, and error mapping without external dependencies.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, mapApiErrorToUserMessage } from "@/services/api/errors";

export type QueryStatus =
  "idle" | "loading" | "success" | "error" | "unavailable" | "offline";

export interface QueryState<T> {
  readonly status: QueryStatus;
  readonly data: T | null;
  readonly error: Error | null;
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly isUnavailable: boolean;
  readonly isOffline: boolean;
  readonly refetch: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useQueryState<T>(
  queryFn: (signal?: AbortSignal) => Promise<T>,
  options?: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (err: unknown) => void;
  },
): QueryState<T> {
  const enabled = options?.enabled ?? true;
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const execute = useCallback(
    async (isRefresh = false) => {
      // Cancel previous in-flight query
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setStatus("loading");
      }
      setError(null);
      setErrorMessage(null);

      try {
        const result = await queryFnRef.current(controller.signal);
        setData(result);
        setStatus("success");
        options?.onSuccess?.(result);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        const standardError =
          err instanceof Error ? err : new Error(String(err));
        setError(standardError);

        if (err instanceof ApiError) {
          if (err.code === "NETWORK_ERROR") {
            setStatus("offline");
            setErrorMessage(
              "Unable to connect to service. Please check your internet connection.",
            );
          } else if (
            err.status === 404 ||
            err.status === 503 ||
            err.code === "NOT_FOUND"
          ) {
            // Endpoint not registered or service not mounted
            setStatus("unavailable");
            setErrorMessage(
              "Discovery services are currently initializing. Please check back shortly.",
            );
          } else {
            setStatus("error");
            setErrorMessage(mapApiErrorToUserMessage(err));
          }
        } else {
          setStatus("error");
          setErrorMessage(mapApiErrorToUserMessage(err));
        }

        options?.onError?.(err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [options],
  );

  useEffect(() => {
    if (enabled) {
      execute(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, execute]);

  const refetch = useCallback(() => execute(false), [execute]);
  const refresh = useCallback(() => execute(true), [execute]);

  return {
    status,
    data,
    error,
    errorMessage,
    isLoading: status === "loading",
    isRefreshing,
    isUnavailable: status === "unavailable",
    isOffline: status === "offline",
    refetch,
    refresh,
  };
}
