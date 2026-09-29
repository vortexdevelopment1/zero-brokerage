/**
 * Discovery Domain API Client
 *
 * PROVISIONAL ROUTE NOTICE:
 * The backend discovery and search endpoints are NOT yet registered or implemented in `services/api`.
 * The route paths defined here (e.g. `/api/v1/discovery/home` or `/api/v1/listings`) are provisional.
 * The final HTTP route, HTTP method, request parameters, and response envelope remain a
 * shared backend API-contract decision.
 */

import { apiRequest } from "@/services/api";
import type {
  CursorPaginationDto,
  DiscoveryFeedUiModel,
  ListingPresentationModel,
  SearchFilterParams,
} from "../types/discovery.types";

export const PROVISIONAL_DISCOVERY_HOME_ROUTE = "/api/v1/discovery/home";
export const PROVISIONAL_LISTINGS_ROUTE = "/api/v1/listings";

/**
 * Encodes verified search filter parameters into query string.
 * Does NOT send unconfirmed category or taxonomy parameters.
 */
function serializeSearchParams(
  filters: SearchFilterParams,
  cursor?: string | null,
  limit: number = 20,
): string {
  const params = new URLSearchParams();

  if (filters.query?.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.intent) {
    params.set("intent", filters.intent);
  }
  if (typeof filters.minPrice === "number" && !isNaN(filters.minPrice)) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (typeof filters.maxPrice === "number" && !isNaN(filters.maxPrice)) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (typeof filters.bedrooms === "number" && !isNaN(filters.bedrooms)) {
    params.set("bedrooms", String(filters.bedrooms));
  }
  if (filters.verifiedOnly) {
    params.set("verifiedOnly", "true");
  }
  if (cursor) {
    params.set("cursor", cursor);
  }
  params.set("limit", String(Math.min(limit, 50)));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Domain-level function to retrieve discovery landing data.
 * Does not assume the final route is locked.
 */
export async function getDiscoveryHome(
  signal?: AbortSignal,
): Promise<DiscoveryFeedUiModel> {
  const result = await apiRequest<DiscoveryFeedUiModel>(
    PROVISIONAL_DISCOVERY_HOME_ROUTE,
    {
      method: "GET",
      signal,
    },
  );
  return result.data;
}

// Backward-compatible alias
export const fetchDiscoveryFeed = getDiscoveryHome;

/**
 * Performs listing search with cursor pagination.
 */
export async function searchListings(
  filters: SearchFilterParams,
  cursor?: string | null,
  limit: number = 20,
  signal?: AbortSignal,
): Promise<CursorPaginationDto<ListingPresentationModel>> {
  const queryString = serializeSearchParams(filters, cursor, limit);
  const result = await apiRequest<
    CursorPaginationDto<ListingPresentationModel>
  >(`${PROVISIONAL_LISTINGS_ROUTE}${queryString}`, {
    method: "GET",
    signal,
  });
  return result.data;
}

/**
 * Fetches a single public listing by stable UUID identifier.
 */
export async function fetchListingById(
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
