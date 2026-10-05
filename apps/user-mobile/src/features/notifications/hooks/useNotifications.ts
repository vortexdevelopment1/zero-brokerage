/**
 * Notification Center List Hook
 *
 * Enforces:
 * 1. Single-flight request deduplication.
 * 2. Targeted queryCache subscription and cache invalidation.
 * 3. Pull-to-refresh & category filtering.
 * 4. Account-scoped isolation: clears/disables when unauthenticated.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/services/auth";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent } from "@/services/analytics/analytics";
import { notificationsRepository } from "../api/notifications-adapter";
import type {
  NotificationCategory,
  NotificationItem,
} from "../types/notifications.types";

interface UseNotificationsOptions {
  category?: NotificationCategory | "ALL";
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { category: initialCategory = "ALL", enabled = true } = options;

  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const [category, setCategory] = useState<NotificationCategory | "ALL">(
    initialCategory,
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const activeAbortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        setTotal(0);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Prevent duplicate fetches while request is in flight
      if (inFlightRef.current && !isRefresh) {
        return;
      }

      inFlightRef.current = true;

      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setErrorMessage(null);

      try {
        const response = await notificationsRepository.getNotifications(
          { category },
          controller.signal,
        );

        if (!isMountedRef.current) return;

        setNotifications(response.items);
        setUnreadCount(response.unreadCount);
        setTotal(response.total);

        // Populate query cache
        queryCache.set(QUERY_KEYS.notifications.list(), response);
        queryCache.set(QUERY_KEYS.notifications.unreadCount(), response.unreadCount);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setErrorMessage(mapApiErrorToUserMessage(err));
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          inFlightRef.current = false;
        }
      }
    },
    [category, enabled, isAuthenticated],
  );

  // Initial fetch and category change
  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();

    trackEvent("notification_center_viewed", {
      category,
      isAuthenticated,
    });

    return () => {
      isMountedRef.current = false;
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
    };
  }, [fetchNotifications, category, user?.id]);

  // Subscribe to query cache invalidations
  useEffect(() => {
    const unsubList = queryCache.subscribe(
      QUERY_KEYS.notifications.list(),
      () => {
        fetchNotifications(false);
      },
    );
    return () => {
      unsubList();
    };
  }, [fetchNotifications]);

  const refresh = useCallback(() => {
    return fetchNotifications(true);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    total,
    category,
    setCategory,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch: () => fetchNotifications(false),
    refresh,
  };
}
