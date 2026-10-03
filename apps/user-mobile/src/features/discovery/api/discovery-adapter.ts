/**
 * Discovery API Adapter & Repository
 *
 * Section 23 Architectural Pattern:
 * Screen -> Feature Hook -> Repository / Domain API -> Real API Adapter OR Fixture Adapter
 *
 * Disciplinary Boundaries:
 * - Real API Adapter interacts with HTTP endpoints using centralized `apiRequest`.
 * - Fixture API Adapter supplies backend-shaped fixtures for UI testing & offline development.
 * - Discovery Repository orchestrates selection without scattering conditionals in screens.
 *
 * PROVISIONAL CONTRACT NOTICE:
 * Route constants (`PROVISIONAL_DISCOVERY_HOME_ROUTE`, `PROVISIONAL_LISTINGS_ROUTE`) are
 * temporary placeholders. Shared Core Backend has NOT yet finalized or registered discovery
 * endpoints. The Shared Core Backend remains the sole authoritative source for finalized contracts.
 * RealDiscoveryApiAdapter targets these provisional routes until official backend schemas land.
 */

import { apiRequest } from "@/services/api";
import type {
  CursorPaginationDto,
  DiscoveryFeedUiModel,
  ListingPresentationModel,
  SearchFilterParams,
} from "../types/discovery.types";
import {
  FIXTURE_EDITORIAL_FEED,
  FIXTURE_LISTINGS,
} from "../fixtures/discovery-fixtures";

export const PROVISIONAL_DISCOVERY_HOME_ROUTE = "/api/v1/discovery/home";
export const PROVISIONAL_LISTINGS_ROUTE = "/api/v1/listings";

export interface DiscoveryApiPort {
  getDiscoveryHome(signal?: AbortSignal): Promise<DiscoveryFeedUiModel>;
  searchListings(
    filters: SearchFilterParams,
    cursor?: string | null,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<CursorPaginationDto<ListingPresentationModel>>;
  fetchListingById(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<ListingPresentationModel>;
}

/**
 * Real HTTP API Adapter implementation
 * Communicates with backend endpoints via centralized `apiRequest`.
 * Propagates network/HTTP errors (401, 403, 404, 500, etc.) without swallowing.
 */
export class RealDiscoveryApiAdapter implements DiscoveryApiPort {
  async getDiscoveryHome(signal?: AbortSignal): Promise<DiscoveryFeedUiModel> {
    const result = await apiRequest<DiscoveryFeedUiModel>(
      PROVISIONAL_DISCOVERY_HOME_ROUTE,
      {
        method: "GET",
        signal,
      },
    );
    return result.data;
  }

  async searchListings(
    filters: SearchFilterParams,
    cursor?: string | null,
    limit: number = 20,
    signal?: AbortSignal,
  ): Promise<CursorPaginationDto<ListingPresentationModel>> {
    const params = new URLSearchParams();
    if (filters.query?.trim()) params.set("q", filters.query.trim());
    if (filters.intent) params.set("intent", filters.intent);
    if (typeof filters.minPrice === "number")
      params.set("minPrice", String(filters.minPrice));
    if (typeof filters.maxPrice === "number")
      params.set("maxPrice", String(filters.maxPrice));
    if (typeof filters.bedrooms === "number")
      params.set("bedrooms", String(filters.bedrooms));
    if (filters.verifiedOnly) params.set("verifiedOnly", "true");
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(Math.min(limit, 50)));

    const qs = params.toString() ? `?${params.toString()}` : "";
    const result = await apiRequest<
      CursorPaginationDto<ListingPresentationModel>
    >(`${PROVISIONAL_LISTINGS_ROUTE}${qs}`, {
      method: "GET",
      signal,
    });
    return result.data;
  }

  async fetchListingById(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<ListingPresentationModel> {
    const sanitizedId = encodeURIComponent(listingId.trim());
    const result = await apiRequest<ListingPresentationModel>(
      `${PROVISIONAL_LISTINGS_ROUTE}/${sanitizedId}`,
      {
        method: "GET",
        signal,
      },
    );
    return result.data;
  }
}

/**
 * Fixture API Adapter for Development & Visual Evaluation
 * Provides deterministic, backend-shaped presentation data.
 * Does not implement client-side ranking, trust scores, or invented business rules.
 */
export class FixtureDiscoveryApiAdapter implements DiscoveryApiPort {
  async getDiscoveryHome(signal?: AbortSignal): Promise<DiscoveryFeedUiModel> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    // Return backend-shaped feed with slight async microtask to simulate realistic response
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    return FIXTURE_EDITORIAL_FEED;
  }

  async searchListings(
    filters: SearchFilterParams,
    _cursor?: string | null,
    limit: number = 20,
    signal?: AbortSignal,
  ): Promise<CursorPaginationDto<ListingPresentationModel>> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    let results = [...FIXTURE_LISTINGS];

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.localityName?.toLowerCase().includes(q) ||
          item.cityName?.toLowerCase().includes(q) ||
          item.propertyType?.toLowerCase().includes(q),
      );
    }

    if (filters.intent) {
      results = results.filter((item) => item.listingIntent === filters.intent);
    }

    if (typeof filters.minPrice === "number") {
      results = results.filter(
        (item) => item.price >= (filters.minPrice as number),
      );
    }

    if (typeof filters.maxPrice === "number") {
      results = results.filter(
        (item) => item.price <= (filters.maxPrice as number),
      );
    }

    if (typeof filters.bedrooms === "number") {
      results = results.filter((item) => item.bedrooms === filters.bedrooms);
    }

    if (filters.verifiedOnly) {
      results = results.filter(
        (item) => item.verificationStatus === "VERIFIED",
      );
    }

    const total = results.length;
    const effectiveLimit = Math.max(1, limit);
    const paginatedItems = results.slice(0, effectiveLimit);

    return {
      items: paginatedItems,
      nextCursor: null,
      hasMore: false,
      total,
    };
  }

  async fetchListingById(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<ListingPresentationModel> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    const found = FIXTURE_LISTINGS.find((item) => item.id === listingId);
    if (!found) {
      throw new Error(`Listing not found: ${listingId}`);
    }
    return found;
  }
}

export interface DiscoveryRepositoryOptions {
  readonly realAdapter?: DiscoveryApiPort;
  readonly fixtureAdapter?: DiscoveryApiPort;
  readonly useFixtures?: boolean;
}

/**
 * Discovery Repository
 * Orchestrates adapter selection based strictly on explicit configuration.
 *
 * Selection rules:
 * - When `useFixtures` is explicitly configured (or `EXPO_PUBLIC_USE_FIXTURES=true`),
 *   routes to `FixtureDiscoveryApiAdapter`.
 * - Otherwise routes directly to `RealDiscoveryApiAdapter`.
 *
 * Error Discipline:
 * - Does NOT silently catch or fall back to fixtures on errors.
 * - Real API integration errors (401, 403, 404, 500, network, etc.) propagate directly
 *   to callers so integration defects are never masked.
 */
export class DiscoveryRepository implements DiscoveryApiPort {
  private readonly realAdapter: DiscoveryApiPort;
  private readonly fixtureAdapter: DiscoveryApiPort;
  private readonly explicitUseFixtures?: boolean;

  constructor(options?: DiscoveryRepositoryOptions) {
    this.realAdapter = options?.realAdapter ?? new RealDiscoveryApiAdapter();
    this.fixtureAdapter =
      options?.fixtureAdapter ?? new FixtureDiscoveryApiAdapter();
    this.explicitUseFixtures = options?.useFixtures;
  }

  public isFixtureMode(): boolean {
    if (typeof this.explicitUseFixtures === "boolean") {
      return this.explicitUseFixtures;
    }
    return process.env.EXPO_PUBLIC_USE_FIXTURES === "true";
  }

  private get activeAdapter(): DiscoveryApiPort {
    return this.isFixtureMode() ? this.fixtureAdapter : this.realAdapter;
  }

  async getDiscoveryHome(signal?: AbortSignal): Promise<DiscoveryFeedUiModel> {
    return this.activeAdapter.getDiscoveryHome(signal);
  }

  async searchListings(
    filters: SearchFilterParams,
    cursor?: string | null,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<CursorPaginationDto<ListingPresentationModel>> {
    return this.activeAdapter.searchListings(filters, cursor, limit, signal);
  }

  async fetchListingById(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<ListingPresentationModel> {
    return this.activeAdapter.fetchListingById(listingId, signal);
  }
}

export const discoveryRepository = new DiscoveryRepository();
