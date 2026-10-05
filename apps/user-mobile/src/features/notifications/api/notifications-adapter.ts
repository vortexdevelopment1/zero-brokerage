/**
 * Notifications API Adapter & Repository Architecture
 *
 * Enforces:
 * 1. Single Centralized API Client (apiRequest).
 * 2. Strict adherence to Fastify notification routes.
 * 3. Never swallows or converts 4xx/5xx errors into fixture fallbacks.
 * 4. Transparent port interface for testability and offline fixtures.
 */

import { apiRequest } from "@/services/api/client";
import { fixtureNotificationStore } from "../fixtures/notifications-fixtures";
import { NOTIFICATIONS_ROUTES } from "./notifications-api";
import type {
  GetNotificationsParams,
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationListResponse,
  UnreadCountResponse,
} from "../types/notifications.types";

export interface NotificationsApiPort {
  getNotifications(
    params?: GetNotificationsParams,
    signal?: AbortSignal,
  ): Promise<NotificationListResponse>;
  getUnreadCount(signal?: AbortSignal): Promise<UnreadCountResponse>;
  markAsRead(
    notificationId: string,
    signal?: AbortSignal,
  ): Promise<MarkReadResponse>;
  markAllAsRead(signal?: AbortSignal): Promise<MarkAllReadResponse>;
}

/**
 * Real Fastify HTTP API Adapter for Notifications
 */
export class RealNotificationsApiAdapter implements NotificationsApiPort {
  async getNotifications(
    params?: GetNotificationsParams,
    signal?: AbortSignal,
  ): Promise<NotificationListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.category && params.category !== "ALL") {
      queryParams.category = params.category;
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }
    if (params?.limit) {
      queryParams.limit = String(params.limit);
    }

    const searchParams = new URLSearchParams(queryParams).toString();
    const url = searchParams
      ? `${NOTIFICATIONS_ROUTES.LIST}?${searchParams}`
      : NOTIFICATIONS_ROUTES.LIST;

    const res = await apiRequest<NotificationListResponse>(url, {
      method: "GET",
      signal,
    });
    return res.data;
  }

  async getUnreadCount(signal?: AbortSignal): Promise<UnreadCountResponse> {
    const res = await apiRequest<UnreadCountResponse>(
      NOTIFICATIONS_ROUTES.UNREAD_COUNT,
      {
        method: "GET",
        signal,
      },
    );
    return res.data;
  }

  async markAsRead(
    notificationId: string,
    signal?: AbortSignal,
  ): Promise<MarkReadResponse> {
    const res = await apiRequest<MarkReadResponse>(
      NOTIFICATIONS_ROUTES.MARK_READ(notificationId),
      {
        method: "POST",
        signal,
      },
    );
    return res.data;
  }

  async markAllAsRead(signal?: AbortSignal): Promise<MarkAllReadResponse> {
    const res = await apiRequest<MarkAllReadResponse>(
      NOTIFICATIONS_ROUTES.MARK_ALL_READ,
      {
        method: "POST",
        signal,
      },
    );
    return res.data;
  }
}

/**
 * Fixture-Backed Notifications Adapter
 */
export class FixtureNotificationsApiAdapter implements NotificationsApiPort {
  async getNotifications(
    params?: GetNotificationsParams,
  ): Promise<NotificationListResponse> {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 30));
    return fixtureNotificationStore.getList(params?.category);
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    await new Promise((resolve) => setTimeout(resolve, 15));
    return { unreadCount: fixtureNotificationStore.getUnreadCount() };
  }

  async markAsRead(notificationId: string): Promise<MarkReadResponse> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const result = fixtureNotificationStore.markAsRead(notificationId);
    return {
      success: result.success,
      id: notificationId,
      isRead: true,
      unreadCount: result.unreadCount,
    };
  }

  async markAllAsRead(): Promise<MarkAllReadResponse> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const result = fixtureNotificationStore.markAllAsRead();
    return {
      success: result.success,
      updatedCount: result.updatedCount,
      unreadCount: 0,
    };
  }
}

/**
 * Notifications Repository
 * Selects between real HTTP adapter and fixture adapter.
 */
export class NotificationsRepository implements NotificationsApiPort {
  private readonly realAdapter: NotificationsApiPort;
  private readonly fixtureAdapter: NotificationsApiPort;
  private explicitUseFixtures?: boolean;

  constructor(options?: {
    realAdapter?: NotificationsApiPort;
    fixtureAdapter?: NotificationsApiPort;
    useFixtures?: boolean;
  }) {
    this.realAdapter = options?.realAdapter ?? new RealNotificationsApiAdapter();
    this.fixtureAdapter =
      options?.fixtureAdapter ?? new FixtureNotificationsApiAdapter();
    this.explicitUseFixtures = options?.useFixtures;
  }

  private resolveAdapter(): NotificationsApiPort {
    if (this.explicitUseFixtures !== undefined) {
      return this.explicitUseFixtures ? this.fixtureAdapter : this.realAdapter;
    }
    const envUseFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES;
    // The shared backend does NOT yet expose production notification APIs.
    // Default to fixture adapter unless explicitly set to false.
    if (envUseFixtures === "false" || envUseFixtures === "0") {
      return this.realAdapter;
    }
    return this.fixtureAdapter;
  }

  async getNotifications(
    params?: GetNotificationsParams,
    signal?: AbortSignal,
  ): Promise<NotificationListResponse> {
    return this.resolveAdapter().getNotifications(params, signal);
  }

  async getUnreadCount(signal?: AbortSignal): Promise<UnreadCountResponse> {
    return this.resolveAdapter().getUnreadCount(signal);
  }

  async markAsRead(
    notificationId: string,
    signal?: AbortSignal,
  ): Promise<MarkReadResponse> {
    return this.resolveAdapter().markAsRead(notificationId, signal);
  }

  async markAllAsRead(signal?: AbortSignal): Promise<MarkAllReadResponse> {
    return this.resolveAdapter().markAllAsRead(signal);
  }
}

export const notificationsRepository = new NotificationsRepository();
