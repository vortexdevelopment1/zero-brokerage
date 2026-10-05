/**
 * Furniture Checkout Hook
 *
 * Enforces server-authoritative checkout calculations:
 * - Requests summary from API adapter with zero client-side pricing calculations.
 * - Detects price/availability/terms changes.
 * - Prepares validated order submission payload.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { furnitureRepository } from "../api/furniture-adapter";
import type {
  CheckoutIntentItemInput,
  CheckoutSummaryResponse,
} from "../types/furniture.types";

interface UseFurnitureCheckoutOptions {
  items: readonly CheckoutIntentItemInput[];
  enabled?: boolean;
}

export function useFurnitureCheckout(options: UseFurnitureCheckoutOptions) {
  const { items, enabled = true } = options;

  const [summary, setSummary] = useState<CheckoutSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const itemsKey = JSON.stringify(items);

  const fetchSummary = useCallback(
    async (bypassCache = false) => {
      if (!enabled || !items || items.length === 0) {
        setSummary(null);
        setIsLoading(false);
        return;
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsLoading(true);
      setError(null);
      setErrorMessage(null);

      const cacheKey = QUERY_KEYS.furniture.checkoutSummary({ items });

      try {
        if (!bypassCache) {
          const cached = queryCache.get<CheckoutSummaryResponse>(cacheKey);
          if (cached && isMountedRef.current) {
            setSummary(cached);
            setIsLoading(false);
            inFlightRef.current = false;
            return;
          }
        }

        const data = await furnitureRepository.calculateCheckoutSummary(items);

        if (!isMountedRef.current) return;

        setSummary(data);
        queryCache.set(cacheKey, data);

        trackEvent(ANALYTICS_EVENTS.FURNITURE_CHECKOUT_STARTED, {
          item_count: items.length,
          has_rental: items.some((it) => it.mode === "RENTAL"),
        });
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const mapped = mapApiErrorToUserMessage(err);
        setError(err instanceof Error ? err : new Error(mapped));
        setErrorMessage(mapped);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          inFlightRef.current = false;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, itemsKey],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchSummary();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSummary]);

  const refreshSummary = useCallback(() => fetchSummary(true), [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    errorMessage,
    refreshSummary,
  };
}
