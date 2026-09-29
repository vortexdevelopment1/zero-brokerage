/**
 * Listing Search & Pagination Hook
 *
 * Implements:
 * - Debounced query string
 * - Stale-request cancellation & timestamp protection
 * - Cursor pagination with stable UUID deduplication
 * - Pull-to-refresh
 * - Filter reset without polluting account preferences
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { searchListings } from "../api/discovery-api";
import type {
  ListingSummaryDto,
  SearchFilterParams,
} from "../types/discovery.types";
import { ApiError, mapApiErrorToUserMessage } from "@/services/api/errors";

export interface UseListingSearchResult {
  readonly items: readonly ListingSummaryDto[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly isRefreshing: boolean;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly filters: SearchFilterParams;
  readonly setFilters: (
    updater:
      SearchFilterParams | ((prev: SearchFilterParams) => SearchFilterParams),
  ) => void;
  readonly resetFilters: () => void;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

const DEFAULT_FILTERS: SearchFilterParams = {
  query: "",
  intent: "RENT",
};

export function useListingSearch(
  initialFilters: SearchFilterParams = DEFAULT_FILTERS,
  debounceMs: number = 400,
): UseListingSearchResult {
  const [filters, setFiltersState] =
    useState<SearchFilterParams>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] =
    useState<SearchFilterParams>(initialFilters);

  const [items, setItems] = useState<readonly ListingSummaryDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRequestTimestampRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  // Execute primary query when debounced filters change
  const executeSearch = useCallback(
    async (isRefresh = false) => {
      const requestTimestamp = Date.now();
      activeRequestTimestampRef.current = requestTimestamp;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await searchListings(
          debouncedFilters,
          null,
          20,
          controller.signal,
        );

        // Guard against stale response out of order
        if (requestTimestamp < activeRequestTimestampRef.current) {
          return;
        }

        // Deduplicate items by stable UUID
        const seenIds = new Set<string>();
        const uniqueItems: ListingSummaryDto[] = [];
        for (const item of response.items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueItems.push(item);
          }
        }

        setItems(uniqueItems);
        setNextCursor(response.nextCursor ?? null);
        setHasMore(response.hasMore);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        if (err instanceof ApiError) {
          if (err.status === 404 || err.code === "NOT_FOUND") {
            // Unmounted backend endpoint
            setItems([]);
            setHasMore(false);
          } else {
            setError(mapApiErrorToUserMessage(err));
          }
        } else {
          setError(mapApiErrorToUserMessage(err));
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedFilters],
  );

  useEffect(() => {
    executeSearch(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeSearch]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await searchListings(
        debouncedFilters,
        nextCursor,
        20,
        undefined,
      );

      setItems((prevItems) => {
        const seenIds = new Set(prevItems.map((item) => item.id));
        const newUnique: ListingSummaryDto[] = [];
        for (const item of response.items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            newUnique.push(item);
          }
        }
        return [...prevItems, ...newUnique];
      });

      setNextCursor(response.nextCursor ?? null);
      setHasMore(response.hasMore);
    } catch (err: unknown) {
      setError(mapApiErrorToUserMessage(err));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextCursor, debouncedFilters]);

  const refresh = useCallback(() => executeSearch(true), [executeSearch]);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const setFilters = useCallback(
    (
      updater:
        SearchFilterParams | ((prev: SearchFilterParams) => SearchFilterParams),
    ) => {
      setFiltersState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );

  return {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    filters,
    setFilters,
    resetFilters,
    loadMore,
    refresh,
  };
}
