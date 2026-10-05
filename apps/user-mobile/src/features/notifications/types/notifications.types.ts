/**
 * Notification Center Domain Types & API Contracts
 *
 * Strict Compliance:
 * 1. Blueprint Step 7: Notifications, Activity, and Support.
 * 2. Uses approved fields: id, category, title, body, isRead, createdAt, expiresAt,
 *    relatedEntityType, relatedEntityId, deepLinkUrl, priority.
 * 3. Never exposes internal queue IDs, provider responses, or administrative notes.
 */

export type NotificationCategory =
  | "VISIT_UPDATE"
  | "INQUIRY_UPDATE"
  | "LISTING_UPDATE"
  | "ACCOUNT_SECURITY"
  | "PAYMENT_UPDATE"
  | "SYSTEM_ANNOUNCEMENT";

export type NotificationPriority = "HIGH" | "NORMAL" | "LOW";

export type RelatedEntityType =
  | "VISIT"
  | "INQUIRY"
  | "LISTING"
  | "ACCOUNT"
  | "SUPPORT";

export interface NotificationItem {
  id: string; // RFC 4122 UUID
  category: NotificationCategory;
  title: string;
  body: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string; // ISO 8601
  expiresAt?: string | null;
  relatedEntityType?: RelatedEntityType | null;
  relatedEntityId?: string | null;
  deepLinkUrl?: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  nextCursor: string | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkReadResponse {
  success: boolean;
  id: string;
  isRead: true;
  unreadCount: number;
}

export interface MarkAllReadResponse {
  success: boolean;
  updatedCount: number;
  unreadCount: 0;
}

export interface GetNotificationsParams {
  category?: NotificationCategory | "ALL";
  cursor?: string | null;
  limit?: number;
}
