/**
 * useVisitDetail Hook
 * Authoritative single visit detail query with strict UUID validation and cache invalidation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidUuid } from "@/navigation/routes";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { getVisitById } from "../api/visits-api";
import type { VisitRecord } from "../types/visits.types";

export interface UseVisitDetailResult {
  readonly visit: VisitRecord | null;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly isInvalidId: boolean;
  readonly error: Error | null;
  readonly errorMessage: string | null;
  readonly refetch: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useVisitDetail(
  visitId: string | undefined | null,
  options?: { enabled?: boolean },
): UseVisitDetailResult {
  const isIdValid = !!visitId && isValidUuid(visitId);
  const enabled = (options?.enabled ?? true) && isIdValid;

  const [visit, setVisit] = useState<VisitRecord[] | null | any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDetail = useCallback(
    async (isRefresh = false) => {
      if (!visitId || !isIdValid) return;

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
        const res = await getVisitById(visitId, controller.signal);
        setVisit(res);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const stdErr = err instanceof Error ? err : new Error(String(err));
        setError(stdErr);
        setErrorMessage(mapApiErrorToUserMessage(err));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [visitId, isIdValid],
  );

  useEffect(() => {
    if (enabled) {
      fetchDetail(false);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchDetail]);

  // Subscribe to visits.detail cache invalidation for this specific ID
  useEffect(() => {
    if (!enabled || !visitId) return;
    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.visits.detail(visitId),
      () => {
        fetchDetail(false);
      },
    );
    return unsubscribe;
  }, [enabled, visitId, fetchDetail]);

  const refetch = useCallback(() => fetchDetail(false), [fetchDetail]);
  const refresh = useCallback(() => fetchDetail(true), [fetchDetail]);

  return {
    visit,
    isLoading,
    isRefreshing,
    isInvalidId: !isIdValid,
    error,
    errorMessage,
    refetch,
    refresh,
  };
}
