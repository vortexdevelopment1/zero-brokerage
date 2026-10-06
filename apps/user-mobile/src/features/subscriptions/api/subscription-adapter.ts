/**
 * Subscription & Financial API Adapter Boundary (Step 9A)
 *
 * Current Backend Reality:
 * The Shared Core Backend contracts for payments and subscriptions are not yet mounted.
 *
 * Safe Implementation Policy:
 * 1. This adapter implements the SubscriptionApiPort, PaymentHistoryApiPort, and EntitlementApiPort.
 * 2. It fails safely and transparently by returning honest empty/unavailable states.
 * 3. It NEVER fabricates completed payment transactions, successful webhooks, or fake entitlement grants.
 * 4. Ready to be replaced by RealSubscriptionApiAdapter once backend contracts are live.
 */

import { ApiError } from "@/services/api/errors";
import type {
  SubscriptionPlan,
  UserSubscription,
  EntitlementItem,
  PaymentHistoryResponse,
} from "../types/subscription.types";
import type {
  SubscriptionApiPort,
  PaymentHistoryApiPort,
  EntitlementApiPort,
} from "./subscription-api";

export class PendingFinancialApiAdapter
  implements SubscriptionApiPort, PaymentHistoryApiPort, EntitlementApiPort
{
  /**
   * Plans: Returns empty list until backend plan endpoint is live.
   * Transparently informs the UI that no plans are published yet.
   */
  async getPlans(): Promise<readonly SubscriptionPlan[]> {
    // When real backend is attached, this will call client.get(SUBSCRIPTION_BACKEND_ROUTES.PLANS)
    return [];
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    if (!planId) return null;
    return null;
  }

  /**
   * Current Subscription: Returns null (no active subscription found).
   */
  async getCurrentSubscription(): Promise<UserSubscription | null> {
    return null;
  }

  /**
   * Payment History: Returns empty history response.
   */
  async getPaymentHistory(_params?: {
    page?: number;
    limit?: number;
  }): Promise<PaymentHistoryResponse> {
    return {
      items: [],
      hasMore: false,
      total: 0,
      page: _params?.page ?? 1,
    };
  }

  /**
   * Entitlements: Returns empty list (fails closed).
   */
  async getEntitlements(): Promise<readonly EntitlementItem[]> {
    return [];
  }
}

/**
 * Singleton repository holding the active adapter boundary.
 * Allows transparent injection of RealSubscriptionApiAdapter once backend is available.
 */
class SubscriptionRepository
  implements SubscriptionApiPort, PaymentHistoryApiPort, EntitlementApiPort
{
  private adapter: SubscriptionApiPort &
    PaymentHistoryApiPort &
    EntitlementApiPort = new PendingFinancialApiAdapter();

  setAdapter(
    newAdapter: SubscriptionApiPort &
      PaymentHistoryApiPort &
      EntitlementApiPort,
  ): void {
    this.adapter = newAdapter;
  }

  async getPlans(): Promise<readonly SubscriptionPlan[]> {
    return this.adapter.getPlans();
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return this.adapter.getPlanById(planId);
  }

  async getCurrentSubscription(): Promise<UserSubscription | null> {
    return this.adapter.getCurrentSubscription();
  }

  async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaymentHistoryResponse> {
    return this.adapter.getPaymentHistory(params);
  }

  async getEntitlements(): Promise<readonly EntitlementItem[]> {
    return this.adapter.getEntitlements();
  }
}

export const subscriptionRepository = new SubscriptionRepository();
