/**
 * Discovery Feed Hook
 *
 * Fetches and exposes aggregated discovery sections with independent lifecycle states.
 */

import { useCallback } from "react";
import { fetchDiscoveryFeed } from "../api/discovery-api";
import type { DiscoverFeedResponseDto } from "../types/discovery.types";
import { useQueryState } from "./useQueryState";

export function useDiscoveryFeed() {
  const queryFn = useCallback(
    (signal?: AbortSignal) => fetchDiscoveryFeed(signal),
    [],
  );

  return useQueryState<DiscoverFeedResponseDto>(queryFn, {
    enabled: true,
  });
}
