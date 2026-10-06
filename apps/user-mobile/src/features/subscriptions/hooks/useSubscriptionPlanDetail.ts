/**
 * Subscription Plan Detail Hook (Step 9A)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { subscriptionRepository } from "../api/subscription-adapter";
import type { SubscriptionPlan } from "../types/subscription.types";

interface UseSubscriptionPlanDetailOptions {
  planId: string;
  enabled?: boolean;
}

export function useSubscriptionPlanDetail({
  planId,
  enabled = true,
}: UseSubscriptionPlanDetailOptions) {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const fetchDetail = useCallback(async () => {
    if (!enabled || !planId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorMessage(null);

    const cacheKey = QUERY_KEYS.subscriptions.planDetail(planId);
    const cached = queryCache.get<SubscriptionPlan>(cacheKey);
    if (cached && isMountedRef.current) {
      setPlan(cached);
      setIsLoading(false);
      return;
    }

    try {
      const result = await subscriptionRepository.getPlanById(planId);
      if (!isMountedRef.current) return;

      setPlan(result);
      if (result) {
        queryCache.set(cacheKey, result);
        trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PLAN_DETAIL_VIEWED, {
          planId: result.id,
          planName: result.name,
        });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const mappedMessage = mapApiErrorToUserMessage(err);
      setError(err instanceof Error ? err : new Error(mappedMessage));
      setErrorMessage(mappedMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [planId, enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDetail();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchDetail]);

  return {
    plan,
    isLoading,
    error,
    errorMessage,
    refetch: fetchDetail,
  };
}
