/**
 * Furniture Marketplace Catalog Hook
 *
 * Enforces:
 * 1. Single-flight request deduplication.
 * 2. Query cache integration with TTL.
 * 3. Filter/search reactivity without duplicate requests.
 * 4. Graceful handling of loading, error, empty, and refreshing states.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { furnitureRepository } from "../api/furniture-adapter";
import type {
  FurnitureAsset,
  FurnitureCatalogFilterParams,
  FurnitureCatalogResponse,
} from "../types/furniture.types";

interface UseFurnitureCatalogOptions {
  params?: FurnitureCatalogFilterParams;
  enabled?: boolean;
}

export function useFurnitureCatalog(options: UseFurnitureCatalogOptions = {}) {
  const { params, enabled = true } = options;

  const [items, setItems] = useState<readonly FurnitureAsset[]>([]);
  const [categories, setCategories] = useState<FurnitureCatalogResponse["categories"]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const paramsKey = JSON.stringify(params || {});

  const fetchCatalog = useCallback(
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

      const cacheKey = QUERY_KEYS.furniture.catalog(params as Record<string, unknown>);

      try {
        if (!isRefresh) {
          const cached = queryCache.get<FurnitureCatalogResponse>(cacheKey);

          if (cached && isMountedRef.current) {
            setItems(cached.items);
            setTotal(cached.total);
            setCategories(cached.categories);
            setIsLoading(false);
            inFlightRef.current = false;
            return;
          }
        }

        const response = await furnitureRepository.getCatalog(params);

        if (!isMountedRef.current) return;

        setItems(response.items);
        setTotal(response.total);
        setCategories(response.categories);

        queryCache.set(cacheKey, response);

        if (params?.query) {
          trackEvent(ANALYTICS_EVENTS.FURNITURE_SEARCH_PERFORMED, {
            query_length: params.query.length,
            result_count: response.total,
          });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, paramsKey],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchCatalog();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchCatalog]);

  const refetch = useCallback(() => fetchCatalog(true), [fetchCatalog]);

  return {
    items,
    total,
    categories,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch,
  };
}
