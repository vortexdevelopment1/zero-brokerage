/**
 * Subscription, Payment & Entitlement API Port Definitions (Step 9A)
 *
 * Rules:
 * 1. Interface contracts describe WHAT the presentation UI requires, not HOW the backend implements it.
 * 2. NO raw fetch calls directly in screens or components.
 * 3. NO fake provider adapters or simulated financial success.
 */

import type {
  SubscriptionPlan,
  UserSubscription,
  EntitlementItem,
  PaymentHistoryResponse,
} from "../types/subscription.types";

/**
 * Canonical Backend Routes (to be mounted by Step 9 Backend implementation)
 */
export const SUBSCRIPTION_BACKEND_ROUTES = {
  PLANS: "/api/v1/plans",
  PLAN_DETAIL: (id: string) => `/api/v1/plans/${encodeURIComponent(id.trim())}`,
  CURRENT_SUBSCRIPTION: "/api/v1/subscriptions/me",
  CANCEL_SUBSCRIPTION: (id: string) =>
    `/api/v1/subscriptions/${encodeURIComponent(id.trim())}/cancel`,
  RENEW_SUBSCRIPTION: (id: string) =>
    `/api/v1/subscriptions/${encodeURIComponent(id.trim())}/renew`,
  PAYMENT_ORDERS: "/api/v1/payments/orders",
  PAYMENT_STATUS: (id: string) =>
    `/api/v1/payments/orders/${encodeURIComponent(id.trim())}`,
  PAYMENT_HISTORY: "/api/v1/payments/history",
  ENTITLEMENTS: "/api/v1/entitlements/me",
  INVOICE: (id: string) => `/api/v1/invoices/${encodeURIComponent(id.trim())}`,
  REFUND_STATUS: (id: string) =>
    `/api/v1/refunds/${encodeURIComponent(id.trim())}`,
} as const;

export interface SubscriptionApiPort {
  getPlans(): Promise<readonly SubscriptionPlan[]>;
  getPlanById(planId: string): Promise<SubscriptionPlan | null>;
  getCurrentSubscription(): Promise<UserSubscription | null>;
}

export interface PaymentHistoryApiPort {
  getPaymentHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaymentHistoryResponse>;
}

export interface EntitlementApiPort {
  getEntitlements(): Promise<readonly EntitlementItem[]>;
}
