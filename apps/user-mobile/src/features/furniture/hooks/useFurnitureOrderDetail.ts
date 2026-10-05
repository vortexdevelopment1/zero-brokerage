/**
 * Furniture Order Detail Hook
 *
 * Retrieves an authoritative order record with item breakdown,
 * rental terms, delivery status, returns, and claims.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/services/auth";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { furnitureRepository } from "../api/furniture-adapter";
import type { FurnitureOrder } from "../types/furniture.types";

export function useFurnitureOrderDetail(orderId: string | null | undefined) {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = authStatus === "AUTHENTICATED";
  const userId = user?.id || "fixture-user-00000000-0000-4000-8000-000000000001";

  const [order, setOrder] = useState<FurnitureOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchOrderDetail = useCallback(
    async (isRefresh = false) => {
      if (!orderId || !isAuthenticated) {
        setOrder(null);
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

      const cacheKey = QUERY_KEYS.furniture.orderDetail(orderId);

      try {
        if (!isRefresh) {
          const cached = queryCache.get<FurnitureOrder>(cacheKey);
          if (cached && isMountedRef.current) {
            setOrder(cached);
            setIsLoading(false);
            inFlightRef.current = false;
            return;
          }
        }

        const data = await furnitureRepository.getOrderById(orderId, userId);

        if (!isMountedRef.current) return;

        if (data) {
          setOrder(data);
          queryCache.set(cacheKey, data);

          trackEvent(ANALYTICS_EVENTS.FURNITURE_ORDER_DETAIL_VIEWED, {
            order_id: data.id,
            status: data.status,
            mode: data.mode,
          });
        } else {
          setError(new Error("Furniture order not found."));
          setErrorMessage("Furniture order not found.");
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const mapped = mapApiErrorToUserMessage(err);
        setError(err instanceof Error ? err : new Error(mapped));
        setErrorMessage(mapped);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          inFlightRef.current = false;
        }
      }
    },
    [isAuthenticated, orderId, userId],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchOrderDetail();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrderDetail]);

  const refetch = useCallback(() => fetchOrderDetail(true), [fetchOrderDetail]);

  return {
    order,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch,
    isAuthenticated,
  };
}
