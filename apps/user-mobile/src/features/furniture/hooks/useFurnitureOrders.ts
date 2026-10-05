/**
 * Furniture Orders History Hook
 *
 * Enforces:
 * 1. Account isolation (clears list if unauthenticated).
 * 2. Status filtering & query cache invalidation.
 * 3. Request deduplication.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/services/auth";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { furnitureRepository } from "../api/furniture-adapter";
import type { FurnitureHistoryFilterCategory, FurnitureOrder } from "../types/furniture.types";

interface UseFurnitureOrdersOptions {
  statusFilter?: FurnitureHistoryFilterCategory;
  enabled?: boolean;
}

export function useFurnitureOrders(options: UseFurnitureOrdersOptions = {}) {
  const { statusFilter = "ALL", enabled = true } = options;

  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = authStatus === "AUTHENTICATED";
  const userId = user?.id || "fixture-user-00000000-0000-4000-8000-000000000001";

  const [orders, setOrders] = useState<readonly FurnitureOrder[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isAuthenticated) {
        setOrders([]);
        setTotal(0);
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

      const cacheKey = QUERY_KEYS.furniture.orders({ statusFilter });

      try {
        if (!isRefresh) {
          const cached = queryCache.get<{
            orders: readonly FurnitureOrder[];
            total: number;
          }>(cacheKey);

          if (cached && isMountedRef.current) {
            setOrders(cached.orders);
            setTotal(cached.total);
            setIsLoading(false);
            inFlightRef.current = false;
            return;
          }
        }

        const response = await furnitureRepository.getOrders(userId);

        if (!isMountedRef.current) return;

        let filtered = response.items;
        if (statusFilter === "ACTIVE_RENTAL") {
          filtered = filtered.filter(
            (o) =>
              o.status === "ACTIVE_RENTAL" ||
              (o.mode === "RENTAL" && o.status === "DELIVERED"),
          );
        } else if (statusFilter === "PURCHASE") {
          filtered = filtered.filter((o) => o.mode === "SALE");
        } else if (statusFilter === "PENDING") {
          filtered = filtered.filter(
            (o) =>
              o.status === "REQUESTED" ||
              o.status === "PAYMENT_PENDING" ||
              o.status === "PREPARING" ||
              o.status === "DISPATCHED" ||
              o.paymentStatus === "PENDING" ||
              o.paymentStatus === "ACTION_REQUIRED",
          );
        } else if (statusFilter === "COMPLETED") {
          filtered = filtered.filter((o) => o.status === "COMPLETED");
        } else if (statusFilter === "RETURNS") {
          filtered = filtered.filter(
            (o) =>
              o.status === "RETURN_REQUESTED" ||
              o.status === "RETURN_SCHEDULED" ||
              o.status === "RETURNED",
          );
        } else if (statusFilter === "CANCELLED") {
          filtered = filtered.filter((o) => o.status === "CANCELLED");
        } else if (statusFilter === "FAILED") {
          filtered = filtered.filter(
            (o) =>
              o.status === "FAILED" ||
              o.paymentStatus === "FAILED" ||
              o.status === "REJECTED" ||
              o.status === "EXPIRED",
          );
        } else if (statusFilter === "CLAIMS") {
          filtered = filtered.filter(
            (o) =>
              Boolean(o.claimStatus && o.claimStatus !== "NONE") ||
              o.status === "CLAIM_UNDER_REVIEW",
          );
        }

        setOrders(filtered);
        setTotal(filtered.length);

        queryCache.set(cacheKey, {
          orders: filtered,
          total: filtered.length,
        });
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
    [enabled, isAuthenticated, statusFilter, userId],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchOrders();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrders]);

  const refetch = useCallback(() => fetchOrders(true), [fetchOrders]);

  return {
    orders,
    total,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch,
    isAuthenticated,
  };
}
