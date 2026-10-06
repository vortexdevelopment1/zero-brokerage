/**
 * Centralized Query Cache & Invalidation Hub
 *
 * Enforces:
 * 1. Centralized query keys across all domains.
 * 2. Targeted invalidation after mutations (e.g. invalidate visits.list, visits.detail on cancel/reschedule).
 * 3. Logout isolation: clearAll() wipes all cached data and notifies subscribers so private data never survives logout.
 */

export const QUERY_KEYS = {
  visits: {
    list: () => "visits.list",
    detail: (id: string) => `visits.detail:${id}`,
    availability: (listingId: string) => `visits.availability:${listingId}`,
  },
  inquiries: {
    list: () => "inquiries.list",
    detail: (id: string) => `inquiries.detail:${id}`,
  },
  listings: {
    detail: (id: string) => `listings.detail:${id}`,
  },
  notifications: {
    list: () => "notifications.list",
    unreadCount: () => "notifications.unreadCount",
    detail: (id: string) => `notifications.detail:${id}`,
  },
  support: {
    list: () => "support.list",
    detail: (id: string) => `support.detail:${id}`,
  },
  furniture: {
    catalog: (params?: Record<string, unknown>) =>
      params ? `furniture.catalog:${JSON.stringify(params)}` : "furniture.catalog",
    detail: (id: string) => `furniture.detail:${id}`,
    orders: (params?: Record<string, unknown>) =>
      params ? `furniture.orders:${JSON.stringify(params)}` : "furniture.orders",
    orderDetail: (orderId: string) => `furniture.orderDetail:${orderId}`,
    checkoutSummary: (params?: Record<string, unknown>) =>
      params ? `furniture.checkoutSummary:${JSON.stringify(params)}` : "furniture.checkoutSummary",
  },
  subscriptions: {
    plans: () => "subscriptions.plans",
    planDetail: (id: string) => `subscriptions.planDetail:${id}`,
    current: () => "subscriptions.current",
    entitlements: () => "subscriptions.entitlements",
    paymentHistory: (params?: Record<string, unknown>) =>
      params ? `subscriptions.paymentHistory:${JSON.stringify(params)}` : "subscriptions.paymentHistory",
  },
} as const;

type InvalidationListener = () => void;

class QueryCacheManager {
  private readonly listeners = new Map<string, Set<InvalidationListener>>();
  private readonly dataCache = new Map<string, unknown>();

  subscribe(key: string, listener: InvalidationListener): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);

    return () => {
      set?.delete(listener);
      if (set?.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  invalidate(keyOrPrefix: string): void {
    // Delete exact and prefix-matched cached data
    for (const cachedKey of Array.from(this.dataCache.keys())) {
      if (
        cachedKey === keyOrPrefix ||
        cachedKey.startsWith(`${keyOrPrefix}:`)
      ) {
        this.dataCache.delete(cachedKey);
      }
    }

    // Trigger exact matches
    const exactListeners = this.listeners.get(keyOrPrefix);
    if (exactListeners) {
      exactListeners.forEach((fn) => {
        try {
          fn();
        } catch {
          // Ignore listener errors
        }
      });
    }

    // Trigger prefix matches
    for (const [key, listeners] of this.listeners.entries()) {
      if (key !== keyOrPrefix && key.startsWith(`${keyOrPrefix}:`)) {
        listeners.forEach((fn) => {
          try {
            fn();
          } catch {
            // Ignore listener errors
          }
        });
      }
    }
  }

  set<T>(key: string, data: T): void {
    this.dataCache.set(key, data);
  }

  get<T>(key: string): T | undefined {
    return this.dataCache.get(key) as T | undefined;
  }

  clearAll(): void {
    this.dataCache.clear();
    // Notify all active listeners to refresh/reset
    for (const listeners of this.listeners.values()) {
      listeners.forEach((fn) => {
        try {
          fn();
        } catch {
          // Ignore listener errors
        }
      });
    }
  }
}

export const queryCache = new QueryCacheManager();
