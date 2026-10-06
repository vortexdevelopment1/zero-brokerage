/**
 * Subscription Plans Hook (Step 9A)
 *
 * Enforces:
 * 1. Single-flight request deduplication.
 * 2. Query cache integration.
 * 3. Graceful handling of loading, error, empty, and refreshing states.
 * 4. Analytics tracking for presentation event.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { subscriptionRepository } from "../api/subscription-adapter";
import type { SubscriptionPlan } from "../types/subscription.types";

interface UseSubscriptionPlansOptions {
  enabled?: boolean;
}

export function useSubscriptionPlans(options: UseSubscriptionPlansOptions = {}) {
  const { enabled = true } = options;

  const [plans, setPlans] = useState<readonly SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchPlans = useCallback(
    async (isRefresh = false) => {
      if (!enabled) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setErrorMessage(null);

      const cacheKey = QUERY_KEYS.subscriptions.plans();
      if (!isRefresh) {
        const cached = queryCache.get<readonly SubscriptionPlan[]>(cacheKey);
        if (cached && isMountedRef.current) {
          setPlans(cached);
          setIsLoading(false);
          inFlightRef.current = false;
          return;
        }
      }

      try {
        const result = await subscriptionRepository.getPlans();
        if (!isMountedRef.current) return;

        setPlans(result);
        queryCache.set(cacheKey, result);

        trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PLANS_VIEWED, {
          planCount: result.length,
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
        inFlightRef.current = false;
      }
    },
    [enabled],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchPlans();

    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.subscriptions.plans(),
      () => {
        if (isMountedRef.current) {
          fetchPlans(true);
        }
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchPlans]);

  const refresh = useCallback(() => {
    return fetchPlans(true);
  }, [fetchPlans]);

  return {
    plans,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refresh,
  };
}
