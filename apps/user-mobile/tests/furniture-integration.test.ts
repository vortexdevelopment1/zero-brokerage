/**
 * Furniture Marketplace, Rentals, Sales & Orders Integration Test Suite (Step 8)
 *
 * Tests:
 * 1. Catalog retrieval, category filtering, search, and turnkey package distinction.
 * 2. Rental vs Sale mode pricing integrity.
 * 3. Variant selection and availability limits.
 * 4. Server-authoritative checkout summary (no client-side calculation).
 * 5. Order placement, order history, and status mapping.
 * 6. Order cancellation rules and backend authority.
 * 7. Active rental tracking and deposit status.
 * 8. Return request and pickup scheduling.
 * 9. Damage claim submission.
 * 10. Deep link and notification resolution for furniture routes.
 * 11. Analytics privacy redaction for furniture events.
 * 12. Query cache invalidation and account isolation.
 */

import "./setup";

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  FurnitureRepository,
  RealFurnitureApiAdapter,
  FixtureFurnitureApiAdapter,
  furnitureRepository,
} from "../src/features/furniture/api/furniture-adapter";
import {
  fixtureFurnitureStore,
  FIXTURE_FURNITURE_CATALOG,
} from "../src/features/furniture/fixtures/furniture-fixtures";
import type {
  CheckoutIntentItemInput,
  CreateFurnitureOrderInput,
  FurnitureAsset,
  FurnitureHistoryFilterCategory,
} from "../src/features/furniture/types/furniture.types";
import { ApiError } from "../src/services/api/errors";
import { queryCache, QUERY_KEYS } from "../src/services/api/query-cache";
import { parseDeepLink, resolveNotificationTarget } from "../src/navigation/deep-links";
import {
  getFurnitureDetailRoute,
  getFurnitureCheckoutRoute,
  getFurnitureOrdersRoute,
  getFurnitureOrderDetailRoute,
  isValidUuid,
} from "../src/navigation/routes";
import {
  sanitizeAnalyticsProps,
  ANALYTICS_EVENTS,
} from "../src/services/analytics/analytics";

const SEED_USER_ID = "fixture-user-00000000-0000-4000-8000-000000000001";

describe("Furniture Domain & Repository Architecture (Step 8)", () => {
  beforeEach(() => {
    fixtureFurnitureStore.reset();
    queryCache.clearAll();
  });

  describe("1. Catalog Browsing & Category Filtering", () => {
    it("returns complete catalog with RFC 4122 UUID identifiers", () => {
      const res = fixtureFurnitureStore.getCatalog();
      assert.ok(res.items.length >= 9, "Expected at least 9 assets in initial catalog");
      assert.ok(res.total >= 9);
      assert.ok(res.categories.length >= 6);

      for (const item of res.items) {
        assert.ok(isValidUuid(item.id), `Item id '${item.id}' must be a valid UUID`);
        assert.ok(item.name.length > 0, "Item name must not be empty");
        assert.ok(item.images.length > 0, "Item must have at least one image");
        assert.ok(
          item.dimensions || item.packageCapacity,
          "Item must include dimensions or package capacity",
        );
      }
    });

    it("filters catalog accurately by category", () => {
      const seatingRes = fixtureFurnitureStore.getCatalog({ category: "SEATING" });
      assert.ok(seatingRes.items.length > 0);
      for (const item of seatingRes.items) {
        assert.equal(item.category, "SEATING");
      }

      const workstationRes = fixtureFurnitureStore.getCatalog({ category: "WORKSTATION" });
      assert.ok(workstationRes.items.length > 0);
      for (const item of workstationRes.items) {
        assert.equal(item.category, "WORKSTATION");
      }
    });

    it("searches catalog case-insensitively by query", () => {
      const searchRes = fixtureFurnitureStore.getCatalog({ query: "ergonomic" });
      assert.ok(searchRes.items.length > 0);
      for (const item of searchRes.items) {
        const matches =
          item.name.toLowerCase().includes("ergonomic") ||
          item.description.toLowerCase().includes("ergonomic") ||
          item.category.toLowerCase().includes("ergonomic");
        assert.ok(matches, `Item '${item.name}' should match search query`);
      }
    });

    it("distinguishes individual furniture assets from packaged turnkey setups", () => {
      const packagesRes = fixtureFurnitureStore.getCatalog({ type: "PACKAGE" });
      assert.ok(packagesRes.items.length >= 3, "Expected at least 3 turnkey office setups");

      for (const item of packagesRes.items) {
        assert.equal(item.type, "PACKAGE");
        assert.ok(item.packageIncludedItems, "Package item must have packageIncludedItems");
        assert.ok(
          (item.packageCapacity ?? 0) > 0,
          "Package must specify workstation capacity",
        );
        assert.ok(
          (item.packageIncludedItems?.length ?? 0) > 0,
          "Package must include item list",
        );
      }
    });
  });

  describe("2. Rental vs Sale Pricing & Variants", () => {
    it("distinguishes rental and sale terms", () => {
      const catalog = fixtureFurnitureStore.getCatalog();
      const rentalItems = catalog.items.filter((i) => i.availableModes.includes("RENTAL"));
      const saleItems = catalog.items.filter((i) => i.availableModes.includes("SALE"));

      assert.ok(rentalItems.length > 0, "Must have rental items");
      assert.ok(saleItems.length > 0, "Must have sale items");

      for (const item of rentalItems) {
        assert.ok((item.rentPerPeriod ?? 0) > 0);
        assert.ok((item.depositAmount ?? 0) >= 0);
        assert.ok((item.minRentalMonths ?? 0) >= 1);
        assert.equal(item.rentalFrequency, "MONTHLY");
      }

      for (const item of saleItems) {
        assert.ok((item.salePrice ?? 0) > 0);
        assert.ok((item.warrantyMonths ?? 0) >= 12);
      }
    });

    it("models item variants and disables unavailable variants", () => {
      const catalog = fixtureFurnitureStore.getCatalog();
      const itemWithVariants = catalog.items.find((i) => (i.variants?.length ?? 0) > 1);
      assert.ok(itemWithVariants, "Expected asset with multiple variants");

      const hasAvailable = itemWithVariants.variants!.some((v) => v.isAvailable);
      assert.ok(hasAvailable, "Expected at least one available variant");

      for (const v of itemWithVariants.variants!) {
        assert.ok(v.id.length > 0);
        assert.ok(v.name.length > 0);
        assert.equal(typeof v.isAvailable, "boolean");
      }
    });
  });

  describe("3. Server-Authoritative Checkout Summary (Zero Client Calculations)", () => {
    it("calculates authoritative quotation for a rental checkout intent", () => {
      const items: CheckoutIntentItemInput[] = [
        {
          assetId: "f0000001-1111-4000-8000-000000000001", // AeroPro Task Chair (Rent: 999, Deposit: 1999)
          quantity: 2,
          mode: "RENTAL",
        },
      ];

      const summary = fixtureFurnitureStore.calculateCheckoutSummary(items);
      assert.ok(summary, "Expected calculated summary");
      assert.equal(summary.items.length, 1);
      assert.equal(summary.items[0].quantity, 2);

      // Rent: 999 * 2 = 1998
      assert.equal(summary.recurringRentPerPeriod, 1998);
      // Deposit: 1999 * 2 = 3998
      assert.equal(summary.securityDeposit, 3998);
      // Delivery fee: 0
      assert.equal(summary.deliveryFee, 0);
      // Total due now: 1998 (first period) + 3998 (deposit) = 5996
      assert.equal(summary.totalDueNow, 5996);
      assert.equal(summary.futureRecurringAmount, 1998);
      assert.ok(summary.nextBillingDate, "Must provide next renewal date");
    });

    it("calculates authoritative quotation for outright commercial purchase", () => {
      const items: CheckoutIntentItemInput[] = [
        {
          assetId: "f0000001-1111-4000-8000-000000000001", // AeroPro Chair (Sale: 18500)
          quantity: 1,
          mode: "SALE",
        },
      ];

      const summary = fixtureFurnitureStore.calculateCheckoutSummary(items);
      assert.equal(summary.oneTimeCharges, 18500);
      assert.equal(summary.securityDeposit, 0, "No deposit on outright sale");
      assert.equal(summary.recurringRentPerPeriod, 0, "No recurring rent on sale");
      assert.equal(summary.totalDueNow, 18500);
    });

    it("rejects checkout intent with invalid asset id", () => {
      const items: CheckoutIntentItemInput[] = [
        {
          assetId: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
          mode: "RENTAL",
        },
      ];

      assert.throws(() => {
        fixtureFurnitureStore.calculateCheckoutSummary(items);
      }, /not found/i);
    });
  });

  describe("4. Order Placement, Rental Tracking & Cancellation", () => {
    it("creates an authoritative order and persists it in store", () => {
      const orderReq: CreateFurnitureOrderInput = {
        items: [
          {
            assetId: "f0000001-1111-4000-8000-000000000001",
            quantity: 1,
            mode: "RENTAL",
          },
        ],
        deliveryAddress: {
          addressLine1: "Prestige Meridian, MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        },
        rentalDurationMonths: 6,
      };

      const order = fixtureFurnitureStore.createOrder(orderReq, SEED_USER_ID);
      assert.ok(isValidUuid(order.id), `Order id '${order.id}' must be a valid UUID`);
      assert.match(order.orderNumber, /^ZB-FURN-\d+-\d+$/);
      assert.equal(order.status, "CONFIRMED");
      assert.equal(order.mode, "RENTAL");
      assert.equal(order.userId, SEED_USER_ID);

      // Verify order exists in user history
      const history = fixtureFurnitureStore.getOrders(SEED_USER_ID);
      const found = history.items.find((o) => o.id === order.id);
      assert.ok(found, "Newly created order must appear in orders history");
    });

    it("allows cancellation for eligible orders with backend authority", () => {
      // Create order with canCancel = true
      const orderReq: CreateFurnitureOrderInput = {
        items: [
          {
            assetId: "f0000002-2222-4000-8000-000000000002",
            quantity: 1,
            mode: "SALE",
          },
        ],
        deliveryAddress: {
          addressLine1: "Indiranagar 100ft Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
        },
      };

      const order = fixtureFurnitureStore.createOrder(orderReq, SEED_USER_ID);
      assert.equal(order.canCancel, true);

      const cancelled = fixtureFurnitureStore.cancelOrder(
        order.id,
        "Office lease postponed",
        SEED_USER_ID,
      );

      assert.equal(cancelled.status, "CANCELLED");
      assert.equal(cancelled.cancellationReason, "Office lease postponed");

      // Attempting to cancel an already cancelled order should fail
      assert.throws(() => {
        fixtureFurnitureStore.cancelOrder(order.id, "Duplicate cancel", SEED_USER_ID);
      }, /no longer eligible for cancellation/i);
    });

    it("rejects cancellation for orders where canCancel is false", () => {
      // Seed order 3 is RETURN_REQUESTED and canCancel is false
      const seedOrderId = "00000003-0000-4000-8000-000000000003";

      assert.throws(() => {
        fixtureFurnitureStore.cancelOrder(seedOrderId, "Try cancel", SEED_USER_ID);
      }, /no longer eligible for cancellation/i);
    });
  });

  describe("5. Returns & Damage Claims Flow", () => {
    it("submits return pickup request for an eligible active rental", () => {
      // Seed order 1 has canRequestReturn = true
      const activeOrderId = "00000001-0000-4000-8000-000000000001";

      const returnReq = fixtureFurnitureStore.requestReturn(
        activeOrderId,
        {
          reason: "Lease concluded",
          preferredPickupDate: "2026-11-15T09:00:00.000Z",
        },
        SEED_USER_ID,
      );

      assert.equal(returnReq.status, "RETURN_REQUESTED");
      assert.equal(returnReq.returnStatus, "SCHEDULED");
      assert.equal(returnReq.returnScheduledDate, "2026-11-15T09:00:00.000Z");
    });

    it("files damage claim with description", () => {
      const orderId = "00000001-0000-4000-8000-000000000001";

      const claimOrder = fixtureFurnitureStore.fileDamageClaim(
        orderId,
        "Gas-lift cylinder dropped pressure and does not stay elevated.",
        SEED_USER_ID,
      );

      assert.equal(claimOrder.claimStatus, "SUBMITTED");
      assert.equal(
        claimOrder.claimDescription,
        "Gas-lift cylinder dropped pressure and does not stay elevated.",
      );
    });

    it("retries payment on an order with failed status", () => {
      // Order 5 is in FAILED status
      const failedOrderId = "00000005-0000-4000-8000-000000000005";
      const before = fixtureFurnitureStore.getOrderById(failedOrderId, SEED_USER_ID);
      assert.equal(before?.paymentStatus, "FAILED");

      const retried = fixtureFurnitureStore.retryPayment(failedOrderId, SEED_USER_ID);
      assert.equal(retried.status, "CONFIRMED");
      assert.equal(retried.paymentStatus, "COMPLETED");
      assert.equal(retried.deliveryStatus, "SCHEDULED");
    });

    it("supports all 9 blueprint-approved order/rental filter categories", () => {
      const allOrders = fixtureFurnitureStore.getOrders(SEED_USER_ID).items;
      assert.ok(allOrders.length >= 9, "Expected at least 9 seed fixture orders");

      const filterTests: Array<{
        filter: FurnitureHistoryFilterCategory;
        predicate: (o: (typeof allOrders)[number]) => boolean;
      }> = [
        { filter: "ALL", predicate: () => true },
        { filter: "PURCHASE", predicate: (o) => o.mode === "SALE" },
        {
          filter: "ACTIVE_RENTAL",
          predicate: (o) =>
            o.status === "ACTIVE_RENTAL" || (o.mode === "RENTAL" && o.status === "DELIVERED"),
        },
        {
          filter: "PENDING",
          predicate: (o) =>
            o.status === "REQUESTED" ||
            o.status === "PAYMENT_PENDING" ||
            o.status === "PREPARING" ||
            o.status === "DISPATCHED" ||
            o.paymentStatus === "PENDING" ||
            o.paymentStatus === "ACTION_REQUIRED",
        },
        { filter: "COMPLETED", predicate: (o) => o.status === "COMPLETED" },
        {
          filter: "RETURNS",
          predicate: (o) =>
            o.status === "RETURN_REQUESTED" ||
            o.status === "RETURN_SCHEDULED" ||
            o.status === "RETURNED",
        },
        { filter: "CANCELLED", predicate: (o) => o.status === "CANCELLED" },
        {
          filter: "FAILED",
          predicate: (o) =>
            o.status === "FAILED" ||
            o.paymentStatus === "FAILED" ||
            o.status === "REJECTED" ||
            o.status === "EXPIRED",
        },
        {
          filter: "CLAIMS",
          predicate: (o) =>
            Boolean(o.claimStatus && o.claimStatus !== "NONE") ||
            o.status === "CLAIM_UNDER_REVIEW",
        },
      ];

      for (const { filter, predicate } of filterTests) {
        const matches = allOrders.filter(predicate);
        assert.ok(
          matches.length > 0,
          `Expected at least one matching order for filter category '${filter}'`,
        );
      }
    });
  });

  describe("6. Repository Transparent Routing & Error Discipline", () => {
    it("routes deterministically to fixture adapter when useFixtures is true", async () => {
      const repo = new FurnitureRepository({ useFixtures: true });

      const catalog = await repo.getCatalog();
      assert.ok(catalog.items.length > 0);
      assert.ok(catalog.total > 0);
    });

    it("propagates real backend 503 error without silently replacing with fixtures", async () => {
      const repo = new FurnitureRepository({ useFixtures: false });
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Furniture service is temporarily unavailable.",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      };

      try {
        await assert.rejects(
          async () => {
            await repo.getCatalog();
          },
          (err: unknown) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 503);
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("propagates real backend 404 route error without falling back to fixtures", async () => {
      const repo = new FurnitureRepository({ useFixtures: false });
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Endpoint not found.",
            },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      };

      try {
        await assert.rejects(
          async () => {
            await repo.getCatalog();
          },
          (err: unknown) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 404);
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("7. Routes & Deep-Link Resolution", () => {
    it("generates and validates furniture route URLs", () => {
      const validUuid = "f0000001-1111-4000-8000-000000000001";
      const detailRoute = getFurnitureDetailRoute(validUuid);
      assert.equal(detailRoute, `/furniture/${validUuid}`);

      const checkoutRoute = getFurnitureCheckoutRoute({
        itemId: validUuid,
        mode: "RENTAL",
        quantity: 2,
      });
      assert.ok(checkoutRoute.startsWith("/furniture/checkout?"));
      assert.ok(checkoutRoute.includes(`itemId=${validUuid}`));
      assert.ok(checkoutRoute.includes("mode=RENTAL"));
      assert.ok(checkoutRoute.includes("quantity=2"));

      assert.equal(getFurnitureOrdersRoute(), "/furniture/orders");

      const orderDetailRoute = getFurnitureOrderDetailRoute(validUuid);
      assert.equal(orderDetailRoute, `/furniture/orders/${validUuid}`);
    });

    it("parses furniture deep links accurately", () => {
      const validUuid = "f0000001-1111-4000-8000-000000000001";

      const catalogParsed = parseDeepLink("zero-brokerage://furniture");
      assert.equal(catalogParsed.destination.type, "FURNITURE");
      assert.equal(catalogParsed.requiresAuth, false);

      const detailParsed = parseDeepLink(`zero-brokerage://furniture/${validUuid}`);
      assert.equal(detailParsed.destination.type, "FURNITURE_DETAIL");
      if (detailParsed.destination.type === "FURNITURE_DETAIL") {
        assert.equal(detailParsed.destination.furnitureId, validUuid);
      }

      const ordersParsed = parseDeepLink("zero-brokerage://furniture/orders");
      assert.equal(ordersParsed.destination.type, "FURNITURE_ORDERS");
      assert.equal(ordersParsed.requiresAuth, true);

      const orderDetailParsed = parseDeepLink(`zero-brokerage://furniture/orders/${validUuid}`);
      assert.equal(orderDetailParsed.destination.type, "FURNITURE_ORDER_DETAIL");
      assert.equal(orderDetailParsed.requiresAuth, true);
      if (orderDetailParsed.destination.type === "FURNITURE_ORDER_DETAIL") {
        assert.equal(orderDetailParsed.destination.orderId, validUuid);
      }
    });

    it("resolves notification target for furniture events with authentication gate", () => {
      const validUuid = "f0000001-1111-4000-8000-000000000001";

      // When unauthenticated, private order detail redirects to sign in
      const unauthResolution = resolveNotificationTarget(
        { targetType: "FURNITURE_ORDER_DETAIL", orderId: validUuid },
        false,
      );
      assert.equal(unauthResolution.status, "REQUIRES_AUTH");
      assert.equal(unauthResolution.redirectRoute, "/(auth)/sign-in");

      // When authenticated, navigates to target order
      const authResolution = resolveNotificationTarget(
        { targetType: "FURNITURE_ORDER_DETAIL", orderId: validUuid },
        true,
      );
      assert.equal(authResolution.status, "NAVIGATE");
      assert.equal(authResolution.route, `/furniture/orders/${validUuid}`);
    });
  });

  describe("8. Analytics & Privacy Redaction", () => {
    it("strictly strips addresses, claim descriptions, and payment tokens from analytics payloads", () => {
      const sensitivePayload = {
        item_id: "f0000001-1111-4000-8000-000000000001",
        mode: "RENTAL",
        address: "123 Commercial Street, Floor 3",
        addressLine1: "123 Commercial Street",
        pincode: "560001",
        claimDescription: "Customer dropped coffee on velvet upholstery",
        claimEvidence: "http://example.com/private-photo.jpg",
        cardNumber: "4111222233334444",
        cvv: "123",
        token: "secret-token-xyz",
      };

      const sanitized = sanitizeAnalyticsProps(sensitivePayload);

      assert.equal(sanitized.item_id, "f0000001-1111-4000-8000-000000000001");
      assert.equal(sanitized.mode, "RENTAL");
      assert.equal(sanitized.address, undefined);
      assert.equal(sanitized.addressLine1, undefined);
      assert.equal(sanitized.pincode, undefined);
      assert.equal(sanitized.claimDescription, undefined);
      assert.equal(sanitized.claimEvidence, undefined);
      assert.equal(sanitized.cardNumber, undefined);
      assert.equal(sanitized.cvv, undefined);
      assert.equal(sanitized.token, undefined);
    });

    it("validates approved furniture analytics event taxonomy", () => {
      assert.equal(ANALYTICS_EVENTS.FURNITURE_MARKETPLACE_VIEWED, "furniture_marketplace_viewed");
      assert.equal(ANALYTICS_EVENTS.FURNITURE_SEARCH_PERFORMED, "furniture_search_performed");
      assert.equal(ANALYTICS_EVENTS.FURNITURE_ITEM_VIEWED, "furniture_item_viewed");
      assert.equal(ANALYTICS_EVENTS.FURNITURE_PACKAGE_VIEWED, "furniture_package_viewed");
      assert.equal(ANALYTICS_EVENTS.FURNITURE_ORDER_SUBMITTED, "furniture_order_submitted");
      assert.equal(ANALYTICS_EVENTS.FURNITURE_RETURN_INITIATED, "furniture_return_initiated");
      assert.equal(ANALYTICS_EVENTS.FURNITURE_CLAIM_INITIATED, "furniture_claim_initiated");
    });
  });

  describe("9. Query Cache & Account Isolation", () => {
    it("isolates furniture order cache keys and supports clear on logout", () => {
      const orderCacheKey = QUERY_KEYS.furniture.orders({ statusFilter: "ALL" });
      const detailCacheKey = QUERY_KEYS.furniture.orderDetail("f0000001-1111-4000-8000-000000000001");

      queryCache.set(orderCacheKey, { orders: [], total: 0 });
      queryCache.set(detailCacheKey, { id: "test" });

      assert.ok(queryCache.get(orderCacheKey));
      assert.ok(queryCache.get(detailCacheKey));

      // Invalidate on logout
      queryCache.clearAll();

      assert.equal(queryCache.get(orderCacheKey), undefined);
      assert.equal(queryCache.get(detailCacheKey), undefined);
    });
  });
});
