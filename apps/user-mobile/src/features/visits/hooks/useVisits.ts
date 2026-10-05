/**
 * useVisits Hook
 * Fetches and manages user's visits list with cache subscription and auto-refetch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { getVisits } from "../api/visits-api";
import type { VisitRecord } from "../types/visits.types";

export interface UseVisitsResult {
  readonly visits: VisitRecord[];
  readonly total: number;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly error: Error | null;
  readonly errorMessage: string | null;
  readonly refetch: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useVisits(options?: { enabled?: boolean }): UseVisitsResult {
  const enabled = options?.enabled ?? true;
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVisits = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setErrorMessage(null);

    try {
      const res = await getVisits(controller.signal);
      setVisits(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const stdErr = err instanceof Error ? err : new Error(String(err));
      setError(stdErr);
      setErrorMessage(mapApiErrorToUserMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchVisits(false);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchVisits]);

  // Subscribe to visits.list cache invalidation
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = queryCache.subscribe(QUERY_KEYS.visits.list(), () => {
      fetchVisits(false);
    });
    return unsubscribe;
  }, [enabled, fetchVisits]);

  const refetch = useCallback(() => fetchVisits(false), [fetchVisits]);
  const refresh = useCallback(() => fetchVisits(true), [fetchVisits]);

  return {
    visits,
    total,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch,
    refresh,
  };
}
