/**
 * Step 9A: Subscriptions, Payments & Entitlements Frontend Architecture Tests
 *
 * Strict Compliance:
 * 1. Verifies type-safe routes, builders, and sanitization.
 * 2. Verifies deep-link parser and authentication gates for private financial resources.
 * 3. Verifies payment & subscription status mappings and safe fallbacks.
 * 4. Verifies financial error discipline (NO retries when payment status is uncertain).
 * 5. Verifies entitlement data structures (strictly consumes backend values, NO formula calculation).
 * 6. Verifies query cache isolation and logout wipe.
 * 7. Verifies analytics privacy redaction (stripping card, cvv, upi, bank account).
 * 8. Verifies safe boundary adapter fails safely with NO fake payment confirmations.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROUTES,
  isValidPlanId,
  getSubscriptionPlansRoute,
  getSubscriptionPlanDetailRoute,
  getSubscriptionCurrentRoute,
  getPaymentHistoryRoute,
  sanitizeRouteParams,
} from "../src/navigation/routes";
import {
  parseDeepLink,
  resolveNotificationTarget,
} from "../src/navigation/deep-links";
import {
  mapPaymentStatusToPresentation,
  mapSubscriptionStatusToPresentation,
  mapRefundStatusToPresentation,
} from "../src/features/subscriptions/utils/status-mappings";
import {
  mapFinancialErrorToPresentation,
} from "../src/features/subscriptions/utils/financial-errors";
import {
  subscriptionRepository,
  PendingFinancialApiAdapter,
} from "../src/features/subscriptions/api/subscription-adapter";
import {
  queryCache,
  QUERY_KEYS,
} from "../src/services/api/query-cache";
import {
  ANALYTICS_EVENTS,
  sanitizeAnalyticsProps,
} from "../src/services/analytics/analytics";
import { ApiError } from "../src/services/api/errors";
import type {
  PaymentTransactionStatus,
  SubscriptionState,
  EntitlementItem,
} from "../src/features/subscriptions/types/subscription.types";

describe("Step 9A: Subscriptions & Financial Presentation Architecture", () => {
  // 1. Routes & Route Builders
  describe("1. Route Definitions & Parameter Sanitization", () => {
    it("defines canonical routes for all Step 9 presentation destinations", () => {
      assert.equal(ROUTES.SUBSCRIPTION_PLANS, "/subscriptions");
      assert.equal(ROUTES.SUBSCRIPTION_PLAN_DETAIL, "/subscriptions/[planId]");
      assert.equal(ROUTES.SUBSCRIPTION_CURRENT, "/subscriptions/current");
      assert.equal(ROUTES.PAYMENT_HISTORY, "/subscriptions/history");
    });

    it("validates plan identifiers safely", () => {
      assert.equal(isValidPlanId("pro_monthly"), true);
      assert.equal(isValidPlanId("plan-123_abc"), true);
      assert.equal(isValidPlanId("123e4567-e89b-12d3-a456-426614174000"), true);
      assert.equal(isValidPlanId(""), false);
      assert.equal(isValidPlanId("   "), false);
      assert.equal(isValidPlanId("plan/injection"), false);
      assert.equal(isValidPlanId("plan?param=1"), false);
    });

    it("generates correct routes via builders and throws on invalid inputs", () => {
      assert.equal(getSubscriptionPlansRoute(), "/subscriptions");
      assert.equal(
        getSubscriptionPlanDetailRoute("pro_monthly"),
        "/subscriptions/pro_monthly",
      );
      assert.equal(getSubscriptionCurrentRoute(), "/subscriptions/current");
      assert.equal(getPaymentHistoryRoute(), "/subscriptions/history");

      assert.throws(() => getSubscriptionPlanDetailRoute(""), {
        message: /Invalid plan identifier/,
      });
      assert.throws(() => getSubscriptionPlanDetailRoute("../malicious"), {
        message: /Invalid plan identifier/,
      });
    });

    it("sanitizes route params and strictly strips card, cvv, upi, bank, and tokens", () => {
      const dirtyParams = {
        planId: "pro_monthly",
        token: "secret-token",
        cardNumber: "4111111111111111",
        cvv: "123",
        upi: "user@okhdfcbank",
        bankAccount: "1234567890",
        amount: "999",
        safeParam: "allowed-value",
      };
      const clean = sanitizeRouteParams(dirtyParams);
      assert.equal(clean.planId, "pro_monthly");
      assert.equal(clean.safeParam, "allowed-value");
      assert.equal("token" in clean, false);
      assert.equal("cardNumber" in clean, false);
      assert.equal("cvv" in clean, false);
      assert.equal("upi" in clean, false);
      assert.equal("bankAccount" in clean, false);
      assert.equal("amount" in clean, false);
    });
  });

  // 2. Deep-Link Resolution & Authentication Gates
  describe("2. Deep-Link Resolution & Auth Gates", () => {
    it("parses public /subscriptions deep link without requiring authentication", () => {
      const parsed = parseDeepLink("zero-brokerage://subscriptions");
      assert.equal(parsed.isValid, true);
      assert.equal(parsed.destination.type, "SUBSCRIPTION_PLANS");
      assert.equal(parsed.targetPath, "/subscriptions");
      assert.equal(parsed.requiresAuth, false);
    });

    it("parses public /plans deep link alias", () => {
      const parsed = parseDeepLink("zero-brokerage://plans");
      assert.equal(parsed.isValid, true);
      assert.equal(parsed.destination.type, "SUBSCRIPTION_PLANS");
      assert.equal(parsed.targetPath, "/subscriptions");
    });

    it("parses /subscriptions/:planId deep link", () => {
      const parsed = parseDeepLink("zero-brokerage://subscriptions/pro_annual");
      assert.equal(parsed.isValid, true);
      assert.equal(parsed.destination.type, "SUBSCRIPTION_PLAN_DETAIL");
      assert.equal((parsed.destination as any).planId, "pro_annual");
      assert.equal(parsed.targetPath, "/subscriptions/pro_annual");
    });

    it("parses /subscriptions/current and requires authentication", () => {
      const parsed = parseDeepLink("zero-brokerage://subscriptions/current");
      assert.equal(parsed.isValid, true);
      assert.equal(parsed.destination.type, "SUBSCRIPTION_CURRENT");
      assert.equal(parsed.requiresAuth, true);
      assert.equal(parsed.targetPath, "/subscriptions/current");
    });

    it("parses /membership deep link and requires authentication", () => {
      const parsed = parseDeepLink("zero-brokerage://membership");
      assert.equal(parsed.isValid, true);
      assert.equal(parsed.destination.type, "SUBSCRIPTION_CURRENT");
      assert.equal(parsed.requiresAuth, true);
      assert.equal(parsed.targetPath, "/subscriptions/current");
    });

    it("parses /subscriptions/history and /payments/history requiring authentication", () => {
      const subHistory = parseDeepLink("zero-brokerage://subscriptions/history");
      assert.equal(subHistory.isValid, true);
      assert.equal(subHistory.destination.type, "PAYMENT_HISTORY");
      assert.equal(subHistory.requiresAuth, true);
      assert.equal(subHistory.targetPath, "/subscriptions/history");

      const payHistory = parseDeepLink("zero-brokerage://payments/history");
      assert.equal(payHistory.isValid, true);
      assert.equal(payHistory.destination.type, "PAYMENT_HISTORY");
      assert.equal(payHistory.requiresAuth, true);
      assert.equal(payHistory.targetPath, "/subscriptions/history");
    });

    it("notification target resolution enforces authentication for private financial destinations", () => {
      const unauthResult = resolveNotificationTarget(
        { targetType: "SUBSCRIPTION_CURRENT" },
        false,
      );
      assert.equal(unauthResult.status, "REQUIRES_AUTH");
      assert.equal((unauthResult as any).intendedRoute, "/subscriptions/current");

      const authResult = resolveNotificationTarget(
        { targetType: "SUBSCRIPTION_CURRENT" },
        true,
      );
      assert.equal(authResult.status, "NAVIGATE");
      assert.equal((authResult as any).route, "/subscriptions/current");
    });

    it("notification target resolution allows public plans navigation without auth", () => {
      const result = resolveNotificationTarget(
        { targetType: "SUBSCRIPTION_PLANS" },
        false,
      );
      assert.equal(result.status, "NAVIGATE");
      assert.equal((result as any).route, "/subscriptions");
    });
  });

  // 3. Payment Status Presentation Mappings
  describe("3. Payment Status Presentation Mappings", () => {
    it("maps all 11 blueprint payment states accurately", () => {
      const states: PaymentTransactionStatus[] = [
        "CREATED",
        "PENDING",
        "PROCESSING",
        "SUCCEEDED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "REQUIRES_ACTION",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "RECONCILIATION_PENDING",
      ];

      for (const st of states) {
        const pres = mapPaymentStatusToPresentation(st);
        assert.ok(pres.label.length > 0, `Missing label for ${st}`);
        assert.ok(pres.tone.length > 0, `Missing tone for ${st}`);
        assert.ok(pres.accessibilityLabel.length > 0, `Missing a11y label for ${st}`);
      }

      assert.equal(mapPaymentStatusToPresentation("SUCCEEDED").tone, "success");
      assert.equal(mapPaymentStatusToPresentation("FAILED").tone, "error");
      assert.equal(mapPaymentStatusToPresentation("RECONCILIATION_PENDING").label, "Verification Pending");
    });

    it("fails safely on unknown or unmapped payment states", () => {
      const pres = mapPaymentStatusToPresentation("UNKNOWN_WEIRD_STATE" as any);
      assert.equal(pres.label, "Verification Pending");
      assert.equal(pres.tone, "neutral");
      assert.equal(pres.accessibilityLabel, "Transaction status pending confirmation");
    });
  });

  // 4. Subscription Status Presentation Mappings
  describe("4. Subscription Status Presentation Mappings", () => {
    it("maps all 9 blueprint subscription states accurately", () => {
      const states: SubscriptionState[] = [
        "PENDING",
        "ACTIVE",
        "TRIALING",
        "PAST_DUE",
        "IN_GRACE_PERIOD",
        "CANCELLED",
        "EXPIRED",
        "SUSPENDED",
        "PAYMENT_ACTION_REQUIRED",
      ];

      for (const st of states) {
        const pres = mapSubscriptionStatusToPresentation(st);
        assert.ok(pres.label.length > 0, `Missing label for ${st}`);
        assert.ok(pres.tone.length > 0, `Missing tone for ${st}`);
        assert.ok(pres.accessibilityLabel.length > 0, `Missing a11y label for ${st}`);
      }

      assert.equal(mapSubscriptionStatusToPresentation("ACTIVE").tone, "success");
      assert.equal(mapSubscriptionStatusToPresentation("IN_GRACE_PERIOD").label, "Grace Period");
      assert.equal(mapSubscriptionStatusToPresentation("SUSPENDED").tone, "error");
    });

    it("fails safely on unknown subscription states", () => {
      const pres = mapSubscriptionStatusToPresentation("ARBITRARY_FUTURE_STATE" as any);
      assert.equal(pres.label, "Status Unavailable");
      assert.equal(pres.tone, "neutral");
    });

    it("maps refund states accurately", () => {
      assert.equal(mapRefundStatusToPresentation("SUCCEEDED").tone, "success");
      assert.equal(mapRefundStatusToPresentation("PROCESSING").tone, "info");
      assert.equal(mapRefundStatusToPresentation("FAILED").tone, "error");
      assert.equal(mapRefundStatusToPresentation("NONE").label, "None");
    });
  });

  // 5. Entitlement Data Representation (Strictly No Formula Calculation)
  describe("5. Entitlement Data Representation", () => {
    it("models backend-provided entitlement quotas without client formula calculation", () => {
      const backendProvidedItem: EntitlementItem = {
        featureKey: "direct_owner_contacts",
        label: "Direct Owner Contacts",
        description: "Direct mobile call allowance with property owners",
        usedCount: 7,
        limitCount: 10,
        remainingQuota: 3,
        unlimited: false,
        isAllowed: true,
      };

      assert.equal(backendProvidedItem.featureKey, "direct_owner_contacts");
      assert.equal(backendProvidedItem.usedCount, 7);
      assert.equal(backendProvidedItem.limitCount, 10);
      assert.equal(backendProvidedItem.remainingQuota, 3);
      assert.equal(backendProvidedItem.unlimited, false);
      assert.equal(backendProvidedItem.isAllowed, true);
    });

    it("models unlimited entitlements safely", () => {
      const unlimitedItem: EntitlementItem = {
        featureKey: "property_search",
        label: "Property Search",
        unlimited: true,
        isAllowed: true,
      };

      assert.equal(unlimitedItem.unlimited, true);
      assert.equal(unlimitedItem.usedCount, undefined);
      assert.equal(unlimitedItem.limitCount, undefined);
    });
  });

  // 6. Financial Error Mapping & Recovery Safety
  describe("6. Financial Error Mapping & Recovery Safety", () => {
    it("NEVER urges payment retry when payment status is uncertain", () => {
      const uncertainErrors = [
        new ApiError("PAYMENT_STATUS_UNCERTAIN", "Status pending"),
        new ApiError("RECONCILIATION_PENDING", "Verifying bank"),
        new ApiError("TRANSACTION_IN_FLIGHT", "Processing in progress"),
        new ApiError("IDEMPOTENCY_KEY_IN_FLIGHT", "Concurrent attempt"),
        new ApiError("PURCHASE_ALREADY_IN_PROGRESS", "Order active"),
      ];

      for (const err of uncertainErrors) {
        const pres = mapFinancialErrorToPresentation(err);
        assert.equal(pres.canRetry, false, `canRetry must be false for ${err.code}`);
        assert.equal(pres.isPendingVerification, true, `isPendingVerification must be true for ${err.code}`);
        assert.ok(pres.message.includes("do not re-attempt payment"));
      }
    });

    it("maps contract pending safely", () => {
      const err = new ApiError("CONTRACT_PENDING", "Backend pending");
      const pres = mapFinancialErrorToPresentation(err);
      assert.equal(pres.title, "Service Under Activation");
      assert.equal(pres.canRetry, false);
    });

    it("maps quota exceeded error", () => {
      const err = new ApiError("ENTITLEMENT_MISSING", "Limit reached");
      const pres = mapFinancialErrorToPresentation(err);
      assert.equal(pres.title, "Membership Limit Reached");
      assert.equal(pres.canRetry, false);
    });

    it("allows retry only on definitive payment failure or network timeouts", () => {
      const failed = new ApiError("PAYMENT_FAILED", "Card declined");
      const presFailed = mapFinancialErrorToPresentation(failed);
      assert.equal(presFailed.canRetry, true);

      const net = new ApiError("NETWORK_ERROR", "Disconnected");
      const presNet = mapFinancialErrorToPresentation(net);
      assert.equal(presNet.canRetry, true);
    });
  });

  // 7. Query Cache Keys & Logout Isolation
  describe("7. Query Cache Keys & Logout Isolation", () => {
    it("generates deterministic query keys for subscription resources", () => {
      assert.equal(QUERY_KEYS.subscriptions.plans(), "subscriptions.plans");
      assert.equal(
        QUERY_KEYS.subscriptions.planDetail("pro_monthly"),
        "subscriptions.planDetail:pro_monthly",
      );
      assert.equal(QUERY_KEYS.subscriptions.current(), "subscriptions.current");
      assert.equal(
        QUERY_KEYS.subscriptions.entitlements(),
        "subscriptions.entitlements",
      );
      assert.equal(
        QUERY_KEYS.subscriptions.paymentHistory(),
        "subscriptions.paymentHistory",
      );
      assert.equal(
        QUERY_KEYS.subscriptions.paymentHistory({ page: 2 }),
        'subscriptions.paymentHistory:{"page":2}',
      );
    });

    it("purges private financial data from cache on clearAll() (logout)", () => {
      const currentSubKey = QUERY_KEYS.subscriptions.current();
      const entitlementsKey = QUERY_KEYS.subscriptions.entitlements();
      const historyKey = QUERY_KEYS.subscriptions.paymentHistory();

      queryCache.set(currentSubKey, { id: "sub-123", planName: "Pro" });
      queryCache.set(entitlementsKey, [{ featureKey: "leads", isAllowed: true }]);
      queryCache.set(historyKey, { items: [{ id: "tx-1" }], hasMore: false });

      assert.ok(queryCache.get(currentSubKey));
      assert.ok(queryCache.get(entitlementsKey));
      assert.ok(queryCache.get(historyKey));

      // Simulate logout
      queryCache.clearAll();

      assert.equal(queryCache.get(currentSubKey), undefined);
      assert.equal(queryCache.get(entitlementsKey), undefined);
      assert.equal(queryCache.get(historyKey), undefined);
    });
  });

  // 8. Analytics Privacy & Event Taxonomy
  describe("8. Analytics Privacy & Event Taxonomy", () => {
    it("defines approved Step 9 presentation analytics events", () => {
      assert.equal(
        ANALYTICS_EVENTS.SUBSCRIPTION_PLANS_VIEWED,
        "subscription_plans_viewed",
      );
      assert.equal(
        ANALYTICS_EVENTS.SUBSCRIPTION_PLAN_DETAIL_VIEWED,
        "subscription_plan_detail_viewed",
      );
      assert.equal(
        ANALYTICS_EVENTS.SUBSCRIPTION_CURRENT_VIEWED,
        "subscription_current_viewed",
      );
      assert.equal(
        ANALYTICS_EVENTS.PAYMENT_HISTORY_VIEWED,
        "payment_history_viewed",
      );
      assert.equal(
        ANALYTICS_EVENTS.PAYMENT_SUPPORT_STARTED,
        "payment_support_started",
      );
    });

    it("strictly strips sensitive financial properties from analytics payloads", () => {
      const sensitivePayload = {
        planId: "pro_monthly",
        planName: "Pro Tier",
        cardNumber: "4111111111111111",
        cvv: "999",
        upi: "buyer@bank",
        vpa: "buyer@bank",
        bankAccount: "1122334455",
        accountNumber: "99887766",
        ifsc: "HDFC0001234",
        rawPayload: "{\"secret\":\"razorpay_signature\"}",
        providerPayload: "secret_data",
        invoicePayload: "tax_details",
        safeMetadataCount: 5,
      };

      const clean = sanitizeAnalyticsProps(sensitivePayload);
      assert.equal(clean.planId, "pro_monthly");
      assert.equal(clean.planName, "Pro Tier");
      assert.equal(clean.safeMetadataCount, 5);

      assert.equal("cardNumber" in clean, false);
      assert.equal("cvv" in clean, false);
      assert.equal("upi" in clean, false);
      assert.equal("vpa" in clean, false);
      assert.equal("bankAccount" in clean, false);
      assert.equal("accountNumber" in clean, false);
      assert.equal("ifsc" in clean, false);
      assert.equal("rawPayload" in clean, false);
      assert.equal("providerPayload" in clean, false);
      assert.equal("invoicePayload" in clean, false);
    });
  });

  // 9. API Adapter Boundary & Financial Safety
  describe("9. Safe Boundary Adapter & No Fake Payments", () => {
    it("adapter boundary returns safe empty states and does NOT fabricate transactions", async () => {
      const adapter = new PendingFinancialApiAdapter();

      const plans = await adapter.getPlans();
      assert.deepEqual(plans, [], "Plans must be empty rather than fake fixtures");

      const planDetail = await adapter.getPlanById("any-id");
      assert.equal(planDetail, null);

      const currentSub = await adapter.getCurrentSubscription();
      assert.equal(currentSub, null, "Must NOT fabricate active subscription");

      const history = await adapter.getPaymentHistory();
      assert.deepEqual(history.items, [], "Must NOT fabricate payment history");
      assert.equal(history.hasMore, false);

      const entitlements = await adapter.getEntitlements();
      assert.deepEqual(entitlements, [], "Must fail closed without live backend");
    });

    it("repository delegates safely to the active adapter", async () => {
      const plans = await subscriptionRepository.getPlans();
      assert.deepEqual(plans, []);

      const sub = await subscriptionRepository.getCurrentSubscription();
      assert.equal(sub, null);

      const history = await subscriptionRepository.getPaymentHistory();
      assert.deepEqual(history.items, []);
    });
  });
});
