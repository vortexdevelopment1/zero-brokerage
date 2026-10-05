/**
 * useVisitAvailability Hook
 * Fetches server-generated availability slots and eligibility signal for a listing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidUuid } from "@/navigation/routes";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { getVisitAvailability } from "../api/visits-api";
import type { VisitAvailabilityResponse } from "../types/visits.types";

export interface UseVisitAvailabilityResult {
  readonly availability: VisitAvailabilityResponse | null;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly isInvalidListingId: boolean;
  readonly error: Error | null;
  readonly errorMessage: string | null;
  readonly refetch: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useVisitAvailability(
  listingId: string | undefined | null,
  options?: { enabled?: boolean },
): UseVisitAvailabilityResult {
  const isIdValid = !!listingId && isValidUuid(listingId);
  const enabled = (options?.enabled ?? true) && isIdValid;

  const [availability, setAvailability] =
    useState<VisitAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAvailability = useCallback(
    async (isRefresh = false) => {
      if (!listingId || !isIdValid) return;

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
        const res = await getVisitAvailability(listingId, controller.signal);
        setAvailability(res);
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
    [listingId, isIdValid],
  );

  useEffect(() => {
    if (enabled) {
      fetchAvailability(false);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchAvailability]);

  // Subscribe to availability invalidations
  useEffect(() => {
    if (!enabled || !listingId) return;
    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.visits.availability(listingId),
      () => {
        fetchAvailability(false);
      },
    );
    return unsubscribe;
  }, [enabled, listingId, fetchAvailability]);

  const refetch = useCallback(
    () => fetchAvailability(false),
    [fetchAvailability],
  );
  const refresh = useCallback(
    () => fetchAvailability(true),
    [fetchAvailability],
  );

  return {
    availability,
    isLoading,
    isRefreshing,
    isInvalidListingId: !isIdValid,
    error,
    errorMessage,
    refetch,
    refresh,
  };
}
