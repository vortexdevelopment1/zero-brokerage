/**
 * Furniture Detail Hook
 *
 * Retrieves an individual asset or packaged office setup.
 * Integrates query cache and tracking.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { furnitureRepository } from "../api/furniture-adapter";
import type { FurnitureAsset } from "../types/furniture.types";

export function useFurnitureDetail(furnitureId: string | null | undefined) {
  const [item, setItem] = useState<FurnitureAsset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchDetail = useCallback(
    async (isRefresh = false) => {
      if (!furnitureId) {
        setItem(null);
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

      const cacheKey = QUERY_KEYS.furniture.detail(furnitureId);

      try {
        if (!isRefresh) {
          const cached = queryCache.get<FurnitureAsset>(cacheKey);
          if (cached && isMountedRef.current) {
            setItem(cached);
            setIsLoading(false);
            inFlightRef.current = false;
            return;
          }
        }

        const data = await furnitureRepository.getAssetById(furnitureId);

        if (!isMountedRef.current) return;

        if (data) {
          setItem(data);
          queryCache.set(cacheKey, data);

          if (data.type === "PACKAGE") {
            trackEvent(ANALYTICS_EVENTS.FURNITURE_PACKAGE_VIEWED, {
              item_id: data.id,
              category: data.category,
            });
          } else {
            trackEvent(ANALYTICS_EVENTS.FURNITURE_ITEM_VIEWED, {
              item_id: data.id,
              category: data.category,
            });
          }
        } else {
          setError(new Error("Furniture item not found."));
          setErrorMessage("Furniture item not found.");
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
    [furnitureId],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchDetail();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchDetail]);

  const refetch = useCallback(() => fetchDetail(true), [fetchDetail]);

  return {
    item,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch,
  };
}
