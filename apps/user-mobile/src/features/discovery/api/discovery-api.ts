/**
 * Discovery Domain API Client
 *
 * PROVISIONAL CONTRACT NOTICE:
 * The backend discovery and search endpoints are NOT yet registered or implemented in Shared Core Backend (`services/api`).
 * The route paths defined here (`PROVISIONAL_DISCOVERY_HOME_ROUTE`, `PROVISIONAL_LISTINGS_ROUTE`) are provisional
 * development integration placeholders and must NOT be treated as finalized backend contracts.
 *
 * The Shared Core Backend remains the sole authoritative source for finalized API contracts.
 * When official discovery/listing contracts are implemented on the backend, this client and its
 * adapters will be reconciled against those authoritative specifications.
 *
 * Section 23 Architecture:
 * Functions route through `discoveryRepository` which delegates to either `RealDiscoveryApiAdapter`
 * or `FixtureDiscoveryApiAdapter`.
 */

import type {
  CursorPaginationDto,
  DiscoveryFeedUiModel,
  ListingPresentationModel,
  SearchFilterParams,
} from "../types/discovery.types";
import {
  discoveryRepository,
  PROVISIONAL_DISCOVERY_HOME_ROUTE,
  PROVISIONAL_LISTINGS_ROUTE,
} from "./discovery-adapter";

export { PROVISIONAL_DISCOVERY_HOME_ROUTE, PROVISIONAL_LISTINGS_ROUTE };

/**
 * Domain-level function to retrieve discovery landing data.
 */
export async function getDiscoveryHome(
  signal?: AbortSignal,
): Promise<DiscoveryFeedUiModel> {
  return discoveryRepository.getDiscoveryHome(signal);
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
  return discoveryRepository.searchListings(filters, cursor, limit, signal);
}

/**
 * Fetches a single public listing by stable UUID identifier.
 */
export async function fetchListingById(
  listingId: string,
  signal?: AbortSignal,
): Promise<ListingPresentationModel> {
  return discoveryRepository.fetchListingById(listingId, signal);
}
