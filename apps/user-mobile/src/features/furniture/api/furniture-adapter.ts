/**
 * Furniture Domain Port & Adapter Architecture (Step 8)
 *
 * Implements strict separation:
 * - FurnitureApiPort (abstract contract)
 * - RealFurnitureApiAdapter (calls centralized apiRequest)
 * - FixtureFurnitureApiAdapter (deterministic in-memory fixture store)
 * - FurnitureRepository (resolves real vs fixture seamlessly)
 */

import { apiRequest } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";
import { FURNITURE_ROUTES } from "./furniture-api";
import { fixtureFurnitureStore } from "../fixtures/furniture-fixtures";
import type {
  CancelFurnitureOrderInput,
  CheckoutIntentItemInput,
  CheckoutSummaryResponse,
  CreateFurnitureOrderInput,
  FileDamageClaimInput,
  FurnitureAsset,
  FurnitureCatalogFilterParams,
  FurnitureCatalogResponse,
  FurnitureOrder,
  FurnitureOrderListResponse,
  RequestFurnitureReturnInput,
} from "../types/furniture.types";

export interface FurnitureApiPort {
  getCatalog(
    filters?: FurnitureCatalogFilterParams,
    signal?: AbortSignal,
  ): Promise<FurnitureCatalogResponse>;
  getAssetById(id: string, signal?: AbortSignal): Promise<FurnitureAsset | null>;
  calculateCheckoutSummary(
    items: readonly CheckoutIntentItemInput[],
    signal?: AbortSignal,
  ): Promise<CheckoutSummaryResponse>;
  createOrder(
    input: CreateFurnitureOrderInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder>;
  getOrders(userId: string, signal?: AbortSignal): Promise<FurnitureOrderListResponse>;
  getOrderById(
    orderId: string,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder | null>;
  cancelOrder(
    orderId: string,
    input: CancelFurnitureOrderInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder>;
  requestReturn(
    orderId: string,
    input: RequestFurnitureReturnInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder>;
  fileDamageClaim(
    orderId: string,
    input: FileDamageClaimInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder>;
  retryPayment(
    orderId: string,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder>;
}

/**
 * Real API Adapter consuming shared backend endpoints
 */
export class RealFurnitureApiAdapter implements FurnitureApiPort {
  async getCatalog(
    filters?: FurnitureCatalogFilterParams,
    signal?: AbortSignal,
  ): Promise<FurnitureCatalogResponse> {
    const queryParams: Record<string, string> = {};
    if (filters?.query) queryParams.query = filters.query;
    if (filters?.category && filters.category !== "ALL") queryParams.category = filters.category;
    if (filters?.type && filters.type !== "ALL") queryParams.type = filters.type;
    if (filters?.mode && filters.mode !== "ALL") queryParams.mode = filters.mode;
    if (filters?.city && filters.city !== "All Locations" && filters.city !== "ALL") {
      queryParams.city = filters.city;
    }

    const searchParams = new URLSearchParams(queryParams).toString();
    const url = searchParams
      ? `${FURNITURE_ROUTES.CATALOG}?${searchParams}`
      : FURNITURE_ROUTES.CATALOG;

    const res = await apiRequest<FurnitureCatalogResponse>(url, {
      method: "GET",
      signal,
    });
    return res.data;
  }

  async getAssetById(id: string, signal?: AbortSignal): Promise<FurnitureAsset | null> {
    try {
      const res = await apiRequest<FurnitureAsset>(FURNITURE_ROUTES.DETAIL(id), {
        method: "GET",
        signal,
      });
      return res.data;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "NOT_FOUND")) {
        return null;
      }
      throw err;
    }
  }

  async calculateCheckoutSummary(
    items: readonly CheckoutIntentItemInput[],
    signal?: AbortSignal,
  ): Promise<CheckoutSummaryResponse> {
    const res = await apiRequest<CheckoutSummaryResponse>(FURNITURE_ROUTES.CHECKOUT_SUMMARY, {
      method: "POST",
      body: { items },
      signal,
    });
    return res.data;
  }

  async createOrder(
    input: CreateFurnitureOrderInput,
    _userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    const res = await apiRequest<FurnitureOrder>(FURNITURE_ROUTES.ORDERS, {
      method: "POST",
      body: input,
      signal,
    });
    return res.data;
  }

  async getOrders(_userId: string, signal?: AbortSignal): Promise<FurnitureOrderListResponse> {
    const res = await apiRequest<FurnitureOrderListResponse>(FURNITURE_ROUTES.ORDERS, {
      method: "GET",
      signal,
    });
    return res.data;
  }

  async getOrderById(
    orderId: string,
    _userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder | null> {
    try {
      const res = await apiRequest<FurnitureOrder>(FURNITURE_ROUTES.ORDER_DETAIL(orderId), {
        method: "GET",
        signal,
      });
      return res.data;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "NOT_FOUND")) {
        return null;
      }
      throw err;
    }
  }

  async cancelOrder(
    orderId: string,
    input: CancelFurnitureOrderInput,
    _userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    const res = await apiRequest<FurnitureOrder>(FURNITURE_ROUTES.CANCEL_ORDER(orderId), {
      method: "POST",
      body: input,
      signal,
    });
    return res.data;
  }

  async requestReturn(
    orderId: string,
    input: RequestFurnitureReturnInput,
    _userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    const res = await apiRequest<FurnitureOrder>(FURNITURE_ROUTES.RETURN_ORDER(orderId), {
      method: "POST",
      body: input,
      signal,
    });
    return res.data;
  }

  async fileDamageClaim(
    orderId: string,
    input: FileDamageClaimInput,
    _userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    const res = await apiRequest<FurnitureOrder>(FURNITURE_ROUTES.CLAIM_ORDER(orderId), {
      method: "POST",
      body: input,
      signal,
    });
    return res.data;
  }

  async retryPayment(
    orderId: string,
    _userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    const res = await apiRequest<FurnitureOrder>(FURNITURE_ROUTES.RETRY_PAYMENT(orderId), {
      method: "POST",
      signal,
    });
    return res.data;
  }
}

/**
 * Fixture Adapter for offline evaluation and UI tests
 */
export class FixtureFurnitureApiAdapter implements FurnitureApiPort {
  async getCatalog(
    filters?: FurnitureCatalogFilterParams,
    signal?: AbortSignal,
  ): Promise<FurnitureCatalogResponse> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 40));
    return fixtureFurnitureStore.getCatalog(filters);
  }

  async getAssetById(id: string, signal?: AbortSignal): Promise<FurnitureAsset | null> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 30));
    return fixtureFurnitureStore.getAssetById(id);
  }

  async calculateCheckoutSummary(
    items: readonly CheckoutIntentItemInput[],
    signal?: AbortSignal,
  ): Promise<CheckoutSummaryResponse> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 50));
    return fixtureFurnitureStore.calculateCheckoutSummary(items);
  }

  async createOrder(
    input: CreateFurnitureOrderInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 80));
    return fixtureFurnitureStore.createOrder(input, userId);
  }

  async getOrders(userId: string, signal?: AbortSignal): Promise<FurnitureOrderListResponse> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 40));
    return fixtureFurnitureStore.getOrders(userId);
  }

  async getOrderById(
    orderId: string,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder | null> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 30));
    return fixtureFurnitureStore.getOrderById(orderId, userId);
  }

  async cancelOrder(
    orderId: string,
    input: CancelFurnitureOrderInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 60));
    return fixtureFurnitureStore.cancelOrder(orderId, input.reason, userId);
  }

  async requestReturn(
    orderId: string,
    input: RequestFurnitureReturnInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 60));
    return fixtureFurnitureStore.requestReturn(orderId, input, userId);
  }

  async fileDamageClaim(
    orderId: string,
    input: FileDamageClaimInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 60));
    return fixtureFurnitureStore.fileDamageClaim(orderId, input.description, userId);
  }

  async retryPayment(
    orderId: string,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 60));
    return fixtureFurnitureStore.retryPayment(orderId, userId);
  }
}

export interface FurnitureRepositoryOptions {
  realAdapter?: FurnitureApiPort;
  fixtureAdapter?: FurnitureApiPort;
  useFixtures?: boolean;
  preferFixture?: boolean;
}

/**
 * Furniture Repository
 *
 * Implements explicit adapter routing with error discipline:
 * - Does not silently swallow real backend 503/404 errors.
 * - In real-backend mode, errors reach the caller/UI for honest error presentation.
 * - In fixture mode (default while backend is unavailable or when explicitly configured),
 *   controlled fixtures provide deterministic offline evaluation.
 */
export class FurnitureRepository implements FurnitureApiPort {
  private readonly realAdapter: FurnitureApiPort;
  private readonly fixtureAdapter: FurnitureApiPort;
  private explicitUseFixtures?: boolean;

  constructor(options?: FurnitureRepositoryOptions) {
    this.realAdapter = options?.realAdapter ?? new RealFurnitureApiAdapter();
    this.fixtureAdapter =
      options?.fixtureAdapter ?? new FixtureFurnitureApiAdapter();
    this.explicitUseFixtures = options?.useFixtures ?? options?.preferFixture;
  }

  setExplicitUseFixtures(value: boolean | undefined): void {
    this.explicitUseFixtures = value;
  }

  /**
   * Maintained for backwards-compatibility with test suites
   */
  setPreferFixture(value: boolean): void {
    this.explicitUseFixtures = value;
  }

  private resolveAdapter(): FurnitureApiPort {
    if (this.explicitUseFixtures !== undefined) {
      return this.explicitUseFixtures ? this.fixtureAdapter : this.realAdapter;
    }
    const envUseFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES;
    if (envUseFixtures === "false" || envUseFixtures === "0") {
      return this.realAdapter;
    }
    // Shared backend does not provide the furniture domain yet, default to fixture adapter
    return this.fixtureAdapter;
  }

  async getCatalog(
    filters?: FurnitureCatalogFilterParams,
    signal?: AbortSignal,
  ): Promise<FurnitureCatalogResponse> {
    return this.resolveAdapter().getCatalog(filters, signal);
  }

  async getAssetById(id: string, signal?: AbortSignal): Promise<FurnitureAsset | null> {
    return this.resolveAdapter().getAssetById(id, signal);
  }

  async calculateCheckoutSummary(
    items: readonly CheckoutIntentItemInput[],
    signal?: AbortSignal,
  ): Promise<CheckoutSummaryResponse> {
    return this.resolveAdapter().calculateCheckoutSummary(items, signal);
  }

  async createOrder(
    input: CreateFurnitureOrderInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    return this.resolveAdapter().createOrder(input, userId, signal);
  }

  async getOrders(userId: string, signal?: AbortSignal): Promise<FurnitureOrderListResponse> {
    return this.resolveAdapter().getOrders(userId, signal);
  }

  async getOrderById(
    orderId: string,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder | null> {
    return this.resolveAdapter().getOrderById(orderId, userId, signal);
  }

  async cancelOrder(
    orderId: string,
    input: CancelFurnitureOrderInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    return this.resolveAdapter().cancelOrder(orderId, input, userId, signal);
  }

  async requestReturn(
    orderId: string,
    input: RequestFurnitureReturnInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    return this.resolveAdapter().requestReturn(orderId, input, userId, signal);
  }

  async fileDamageClaim(
    orderId: string,
    input: FileDamageClaimInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    return this.resolveAdapter().fileDamageClaim(orderId, input, userId, signal);
  }

  async retryPayment(
    orderId: string,
    userId: string,
    signal?: AbortSignal,
  ): Promise<FurnitureOrder> {
    return this.resolveAdapter().retryPayment(orderId, userId, signal);
  }
}

export const furnitureRepository = new FurnitureRepository();
