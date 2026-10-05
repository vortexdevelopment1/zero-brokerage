/**
 * Notification Center API Routes & Endpoints
 *
 * Strict Compliance:
 * Uses centralized fastify route constants matching canonical API conventions.
 */

export const NOTIFICATIONS_ROUTES = {
  LIST: "/api/v1/notifications",
  UNREAD_COUNT: "/api/v1/notifications/unread-count",
  MARK_READ: (notificationId: string) =>
    `/api/v1/notifications/${encodeURIComponent(notificationId.trim())}/read`,
  MARK_ALL_READ: "/api/v1/notifications/read-all",
} as const;
