/**
 * Notification Center Fixtures & Mock State
 *
 * Provides realistic, typed notifications with valid RFC 4122 UUIDs.
 * Used for offline mode and when backend notification routes are not yet available.
 */

import type {
  NotificationCategory,
  NotificationItem,
  NotificationListResponse,
} from "../types/notifications.types";

export const FIXTURE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "a1111111-3333-4444-9999-111111111111",
    category: "VISIT_UPDATE",
    title: "Visit Confirmed",
    body: "Your private tour for Sea Breeze Residences, Bandra West has been confirmed for tomorrow at 11:00 AM.",
    isRead: false,
    priority: "HIGH",
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 mins ago
    relatedEntityType: "VISIT",
    relatedEntityId: "77777777-1111-4444-8888-111111111111",
    deepLinkUrl: "zero-brokerage://activity/visits/77777777-1111-4444-8888-111111111111",
  },
  {
    id: "b2222222-3333-4444-9999-222222222222",
    category: "INQUIRY_UPDATE",
    title: "Agent Responded to Inquiry",
    body: "The designated verified representative answered your questions regarding maintenance charges for Skyline Towers.",
    isRead: false,
    priority: "HIGH",
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 hours ago
    relatedEntityType: "INQUIRY",
    relatedEntityId: "88888888-1111-4444-8888-111111111111",
    deepLinkUrl: "zero-brokerage://activity/inquiries/88888888-1111-4444-8888-111111111111",
  },
  {
    id: "c3333333-3333-4444-9999-333333333333",
    category: "LISTING_UPDATE",
    title: "Price Revision on Saved Property",
    body: "Lodha Park Luxury Suite, Worli has been updated with a revised monthly rent of ₹2,35,000.",
    isRead: false,
    priority: "NORMAL",
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), // 14 hours ago
    relatedEntityType: "LISTING",
    relatedEntityId: "22222222-2222-4444-8888-222222222222",
    deepLinkUrl: "zero-brokerage://listing/22222222-2222-4444-8888-222222222222",
  },
  {
    id: "d4444444-3333-4444-9999-444444444444",
    category: "ACCOUNT_SECURITY",
    title: "New Session Authenticated",
    body: "Your Zero Brokerage account was signed into from a new Android device. If this was not you, review active sessions.",
    isRead: true,
    priority: "HIGH",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago
    relatedEntityType: "ACCOUNT",
    relatedEntityId: "account",
    deepLinkUrl: "zero-brokerage://account",
  },
  {
    id: "e5555555-3333-4444-9999-555555555555",
    category: "SYSTEM_ANNOUNCEMENT",
    title: "Zero Brokerage Direct Verification Active",
    body: "100% verified architectural listings in Bandra and Worli now include structural floor plans and verified tax certificates.",
    isRead: true,
    priority: "LOW",
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), // 4 days ago
    relatedEntityType: null,
    relatedEntityId: null,
    deepLinkUrl: "zero-brokerage://discover",
  },
];

/**
 * In-memory state manager for fixture-backed simulations.
 */
class FixtureNotificationStore {
  private items: NotificationItem[] = [...FIXTURE_NOTIFICATIONS];

  getList(category?: NotificationCategory | "ALL"): NotificationListResponse {
    let filtered = this.items;
    if (category && category !== "ALL") {
      filtered = this.items.filter((item) => item.category === category);
    }

    const unreadCount = this.items.filter((item) => !item.isRead).length;

    return {
      items: [...filtered],
      total: filtered.length,
      unreadCount,
      nextCursor: null,
    };
  }

  getUnreadCount(): number {
    return this.items.filter((item) => !item.isRead).length;
  }

  markAsRead(id: string): { success: boolean; unreadCount: number } {
    const item = this.items.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
    }
    return {
      success: true,
      unreadCount: this.getUnreadCount(),
    };
  }

  markAllAsRead(): { success: boolean; updatedCount: number } {
    let updatedCount = 0;
    this.items.forEach((item) => {
      if (!item.isRead) {
        item.isRead = true;
        updatedCount++;
      }
    });
    return {
      success: true,
      updatedCount,
    };
  }

  reset(): void {
    this.items = FIXTURE_NOTIFICATIONS.map((item) => ({ ...item }));
  }
}

export const fixtureNotificationStore = new FixtureNotificationStore();
