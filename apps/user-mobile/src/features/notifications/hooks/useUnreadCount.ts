/**
 * Notification Unread Count Hook
 *
 * Provides shared badge state across tabs and headers with queryCache integration.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/services/auth";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { notificationsRepository } from "../api/notifications-adapter";

export function useUnreadCount(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCount = useCallback(async () => {
    if (!enabled || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const res = await notificationsRepository.getUnreadCount();
      setUnreadCount(res.unreadCount);
      queryCache.set(QUERY_KEYS.notifications.unreadCount(), res.unreadCount);
    } catch {
      // In case of error, preserve cached or zero count
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isAuthenticated]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Subscribe to unread count invalidations
  useEffect(() => {
    const unsub = queryCache.subscribe(
      QUERY_KEYS.notifications.unreadCount(),
      () => {
        fetchCount();
      },
    );
    return () => {
      unsub();
    };
  }, [fetchCount]);

  return {
    unreadCount,
    isLoading,
    refresh: fetchCount,
  };
}
