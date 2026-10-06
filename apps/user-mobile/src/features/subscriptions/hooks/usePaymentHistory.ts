/**
 * Payment History Hook (Step 9A)
 *
 * Enforces:
 * 1. Safe pagination integration.
 * 2. NO local calculation of payment amounts or transaction statuses.
 * 3. Query cache integration.
 * 4. Analytics tracking for presentation event.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { useAuthStore } from "@/services/auth";
import { subscriptionRepository } from "../api/subscription-adapter";
import type { PaymentHistoryItem } from "../types/subscription.types";

interface UsePaymentHistoryOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function usePaymentHistory(options: UsePaymentHistoryOptions = {}) {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const { page = 1, limit = 20, enabled = true } = options;

  const [items, setItems] = useState<readonly PaymentHistoryItem[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const fetchHistory = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isAuthenticated) {
        setIsLoading(false);
        setIsRefreshing(false);
        setItems([]);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setErrorMessage(null);

      const params = { page, limit };
      const cacheKey = QUERY_KEYS.subscriptions.paymentHistory(params);
      if (!isRefresh) {
        const cached = queryCache.get<{
          items: readonly PaymentHistoryItem[];
          hasMore: boolean;
          total?: number;
        }>(cacheKey);
        if (cached && isMountedRef.current) {
          setItems(cached.items);
          setHasMore(cached.hasMore);
          setTotal(cached.total ?? cached.items.length);
          setIsLoading(false);
          return;
        }
      }

      try {
        const result = await subscriptionRepository.getPaymentHistory(params);
        if (!isMountedRef.current) return;

        setItems(result.items);
        setHasMore(result.hasMore);
        setTotal(result.total ?? result.items.length);
        queryCache.set(cacheKey, result);

        trackEvent(ANALYTICS_EVENTS.PAYMENT_HISTORY_VIEWED, {
          itemCount: result.items.length,
          page,
        });
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
    [page, limit, enabled, isAuthenticated],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchHistory();

    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.subscriptions.paymentHistory(),
      () => {
        if (isMountedRef.current) {
          fetchHistory(true);
        }
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchHistory]);

  const refresh = useCallback(() => {
    return fetchHistory(true);
  }, [fetchHistory]);

  return {
    items,
    hasMore,
    total,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refresh,
  };
}
