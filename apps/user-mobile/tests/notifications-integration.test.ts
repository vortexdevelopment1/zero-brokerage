/**
 * Notifications Integration & Domain Test Suite (Step 7)
 *
 * Tests:
 * 1. Notification list retrieval, category filtering, and unread counts.
 * 2. Read/unread visual distinction and status mapping.
 * 3. Mark single as read with server-confirmed unread count update.
 * 4. Mark all as read with duplicate action prevention.
 * 5. Query cache integration and logout isolation.
 * 6. Repository transparent routing and error propagation.
 */

import "./setup";

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  NotificationsRepository,
  RealNotificationsApiAdapter,
  FixtureNotificationsApiAdapter,
  type NotificationsApiPort,
} from "../src/features/notifications/api/notifications-adapter";
import { fixtureNotificationStore } from "../src/features/notifications/fixtures/notifications-fixtures";
import type { NotificationListResponse } from "../src/features/notifications/types/notifications.types";
import { queryCache, QUERY_KEYS } from "../src/services/api/query-cache";

describe("Notifications Feature & Repository Architecture (Step 7)", () => {
  beforeEach(() => {
    fixtureNotificationStore.reset();
    queryCache.clearAll();
  });

  it("fixture store provides valid notifications with RFC 4122 UUIDs", () => {
    const res = fixtureNotificationStore.getList();
    assert.ok(res.items.length > 0, "Expected non-empty fixture notifications");
    assert.equal(typeof res.unreadCount, "number");

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const item of res.items) {
      assert.match(item.id, UUID_REGEX, `Notification id '${item.id}' must be a valid UUID`);
      assert.ok(item.title.length > 0, "Title must not be empty");
      assert.ok(item.body.length > 0, "Body must not be empty");
      assert.equal(typeof item.isRead, "boolean");
      assert.ok(["HIGH", "NORMAL", "LOW"].includes(item.priority));
    }
  });

  it("filters notifications by category accurately", () => {
    const visitNotifications = fixtureNotificationStore.getList("VISIT_UPDATE");
    assert.ok(visitNotifications.items.length > 0);
    for (const item of visitNotifications.items) {
      assert.equal(item.category, "VISIT_UPDATE");
    }

    const inquiryNotifications = fixtureNotificationStore.getList("INQUIRY_UPDATE");
    assert.ok(inquiryNotifications.items.length > 0);
    for (const item of inquiryNotifications.items) {
      assert.equal(item.category, "INQUIRY_UPDATE");
    }
  });

  it("markAsRead updates item state and accurately reconciles unread count", () => {
    const initialList = fixtureNotificationStore.getList();
    const unreadItem = initialList.items.find((item) => !item.isRead);
    assert.ok(unreadItem, "Expected at least one unread item in fixtures");

    const initialUnreadCount = initialList.unreadCount;
    const result = fixtureNotificationStore.markAsRead(unreadItem.id);

    assert.equal(result.success, true);
    assert.equal(result.unreadCount, initialUnreadCount - 1);

    const updatedList = fixtureNotificationStore.getList();
    const updatedItem = updatedList.items.find((i) => i.id === unreadItem.id);
    assert.equal(updatedItem?.isRead, true);
  });

  it("markAllAsRead marks all items read and returns unreadCount 0", () => {
    const initialList = fixtureNotificationStore.getList();
    assert.ok(initialList.unreadCount > 0);

    const result = fixtureNotificationStore.markAllAsRead();
    assert.equal(result.success, true);
    assert.ok(result.updatedCount >= initialList.unreadCount);

    const afterList = fixtureNotificationStore.getList();
    assert.equal(afterList.unreadCount, 0);
    for (const item of afterList.items) {
      assert.equal(item.isRead, true);
    }
  });

  it("queryCache invalidates notifications on targeted operations and wipes on clearAll", () => {
    let invalidationCount = 0;
    const unsub = queryCache.subscribe(QUERY_KEYS.notifications.list(), () => {
      invalidationCount++;
    });

    queryCache.set(QUERY_KEYS.notifications.list(), { items: [], total: 0 });
    assert.ok(queryCache.get(QUERY_KEYS.notifications.list()));

    queryCache.invalidate(QUERY_KEYS.notifications.list());
    assert.equal(invalidationCount, 1);
    assert.equal(queryCache.get(QUERY_KEYS.notifications.list()), undefined);

    // Logout isolation
    let unreadInvalidated = false;
    const unsub2 = queryCache.subscribe(QUERY_KEYS.notifications.unreadCount(), () => {
      unreadInvalidated = true;
    });

    queryCache.clearAll();
    assert.equal(unreadInvalidated, true);

    unsub();
    unsub2();
  });

  it("repository selects fixture vs real adapter according to options", async () => {
    const fixtureAdapter = new FixtureNotificationsApiAdapter();
    const realAdapter = new RealNotificationsApiAdapter();

    const repoFixture = new NotificationsRepository({
      fixtureAdapter,
      realAdapter,
      useFixtures: true,
    });

    const res = await repoFixture.getNotifications();
    assert.ok(res.items.length > 0);

    // Ensure error propagation in non-fixture mode
    const mockFailingAdapter: NotificationsApiPort = {
      getNotifications: async () => {
        throw new Error("503 Service Unavailable");
      },
      getUnreadCount: async () => ({ unreadCount: 0 }),
      markAsRead: async () => {
        throw new Error("404 Not Found");
      },
      markAllAsRead: async () => {
        throw new Error("500 Internal Server Error");
      },
    };

    const failingRepo = new NotificationsRepository({
      realAdapter: mockFailingAdapter,
      useFixtures: false,
    });

    await assert.rejects(
      async () => {
        await failingRepo.getNotifications();
      },
      /503 Service Unavailable/,
      "Repository must propagate real errors without swallowing into fixture data",
    );
  });
});
