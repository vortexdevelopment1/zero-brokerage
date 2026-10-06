/**
 * Entitlements Hook (Step 9A)
 *
 * Enforces:
 * 1. Consumes backend-provided values ONLY.
 * 2. NO local calculation of usage limits, quotas, or formulas.
 * 3. Query cache integration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { useAuthStore } from "@/services/auth";
import { subscriptionRepository } from "../api/subscription-adapter";
import type { EntitlementItem } from "../types/subscription.types";

interface UseEntitlementsOptions {
  enabled?: boolean;
}

export function useEntitlements(options: UseEntitlementsOptions = {}) {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const { enabled = true } = options;

  const [entitlements, setEntitlements] = useState<readonly EntitlementItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const fetchEntitlements = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isAuthenticated) {
        setIsLoading(false);
        setIsRefreshing(false);
        setEntitlements([]);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setErrorMessage(null);

      const cacheKey = QUERY_KEYS.subscriptions.entitlements();
      if (!isRefresh) {
        const cached = queryCache.get<readonly EntitlementItem[]>(cacheKey);
        if (cached && isMountedRef.current) {
          setEntitlements(cached);
          setIsLoading(false);
          return;
        }
      }

      try {
        const result = await subscriptionRepository.getEntitlements();
        if (!isMountedRef.current) return;

        setEntitlements(result);
        queryCache.set(cacheKey, result);
      } catch (err) {
        if (!isMountedRef.current) return;
        const mappedMessage = mapApiErrorToUserMessage(err);
        setError(err instanceof Error ? err : new Error(mappedMessage));
        setErrorMessage(mappedMessage);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [enabled, isAuthenticated],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchEntitlements();

    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.subscriptions.entitlements(),
      () => {
        if (isMountedRef.current) {
          fetchEntitlements(true);
        }
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchEntitlements]);

  const refresh = useCallback(() => {
    return fetchEntitlements(true);
  }, [fetchEntitlements]);

  return {
    entitlements,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refresh,
  };
}
