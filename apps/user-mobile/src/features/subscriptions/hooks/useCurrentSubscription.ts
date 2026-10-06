/**
 * Current User Subscription Hook (Step 9A)
 *
 * Enforces:
 * 1. Fails safely when unauthenticated or when backend returns null.
 * 2. NO local calculation of subscription status or billing dates.
 * 3. Query cache integration and logout cleanup.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { useAuthStore } from "@/services/auth";
import { subscriptionRepository } from "../api/subscription-adapter";
import type { UserSubscription } from "../types/subscription.types";

interface UseCurrentSubscriptionOptions {
  enabled?: boolean;
}

export function useCurrentSubscription(options: UseCurrentSubscriptionOptions = {}) {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const { enabled = true } = options;

  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchSubscription = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isAuthenticated) {
        setIsLoading(false);
        setIsRefreshing(false);
        setSubscription(null);
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

      const cacheKey = QUERY_KEYS.subscriptions.current();
      if (!isRefresh) {
        const cached = queryCache.get<UserSubscription | null>(cacheKey);
        if (cached !== undefined && isMountedRef.current) {
          setSubscription(cached);
          setIsLoading(false);
          inFlightRef.current = false;
          return;
        }
      }

      try {
        const result = await subscriptionRepository.getCurrentSubscription();
        if (!isMountedRef.current) return;

        setSubscription(result);
        queryCache.set(cacheKey, result);

        trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CURRENT_VIEWED, {
          hasActiveSubscription: Boolean(result),
          planId: result?.planId ?? "none",
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
    [enabled, isAuthenticated],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchSubscription();

    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.subscriptions.current(),
      () => {
        if (isMountedRef.current) {
          fetchSubscription(true);
        }
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [fetchSubscription]);

  const refresh = useCallback(() => {
    return fetchSubscription(true);
  }, [fetchSubscription]);

  return {
    subscription,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refresh,
  };
}
