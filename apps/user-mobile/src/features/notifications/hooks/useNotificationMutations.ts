/**
 * Notification Mutation Operations Hook
 *
 * Implements:
 * 1. Mark single notification as read (with duplicate action prevention).
 * 2. Mark all notifications as read (with progress and duplicate prevention).
 * 3. Cache invalidation on successful server-confirmed response.
 * 4. Privacy-safe analytics tracking.
 */

import { useCallback, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent } from "@/services/analytics/analytics";
import { notificationsRepository } from "../api/notifications-adapter";
import type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationCategory,
} from "../types/notifications.types";

export function useNotificationMutations() {
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set());
  const [isMarkingAllRead, setIsMarkingAllRead] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const markAsRead = useCallback(
    async (
      notificationId: string,
      category?: NotificationCategory,
    ): Promise<MarkReadResponse | null> => {
      if (activeActions.has(notificationId)) {
        return null; // Prevent duplicate action
      }

      setActiveActions((prev) => new Set(prev).add(notificationId));
      setMutationError(null);

      try {
        const response = await notificationsRepository.markAsRead(notificationId);

        // Targeted cache invalidation
        queryCache.invalidate(QUERY_KEYS.notifications.list());
        queryCache.invalidate(QUERY_KEYS.notifications.unreadCount());

        trackEvent("notification_marked_read", {
          notificationId,
          ...(category ? { category } : {}),
        });

        return response;
      } catch (err: unknown) {
        const message = mapApiErrorToUserMessage(err);
        setMutationError(message);
        return null;
      } finally {
        setActiveActions((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [activeActions],
  );

  const markAllAsRead = useCallback(async (): Promise<MarkAllReadResponse | null> => {
    if (isMarkingAllRead) {
      return null; // Prevent duplicate action
    }

    setIsMarkingAllRead(true);
    setMutationError(null);

    try {
      const response = await notificationsRepository.markAllAsRead();

      // Targeted cache invalidation
      queryCache.invalidate(QUERY_KEYS.notifications.list());
      queryCache.invalidate(QUERY_KEYS.notifications.unreadCount());

      trackEvent("notifications_marked_all_read", {
        updatedCount: response.updatedCount,
      });

      return response;
    } catch (err: unknown) {
      const message = mapApiErrorToUserMessage(err);
      setMutationError(message);
      return null;
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [isMarkingAllRead]);

  return {
    markAsRead,
    markAllAsRead,
    isMarkingRead: (id: string) => activeActions.has(id),
    isMarkingAllRead,
    mutationError,
    clearMutationError: () => setMutationError(null),
  };
}
