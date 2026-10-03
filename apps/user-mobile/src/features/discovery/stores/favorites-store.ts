/**
 * Favorites Store
 *
 * Local/Session store for saved property listings.
 * Allows instant, responsive favoriting across PropertyCard, PropertyHero,
 * and ListingDetail screens.
 */

import { create } from "zustand";

interface FavoritesState {
  savedListingIds: Set<string>;
  toggleFavorite: (listingId: string) => boolean; // returns new isFavorite state
  isFavorite: (listingId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  savedListingIds: new Set<string>([
    // Pre-populate with one item for realistic demonstration
    "11111111-2222-4444-8888-111111111111",
  ]),

  toggleFavorite: (listingId: string) => {
    const current = new Set(get().savedListingIds);
    let nextState = false;
    if (current.has(listingId)) {
      current.delete(listingId);
      nextState = false;
    } else {
      current.add(listingId);
      nextState = true;
    }
    set({ savedListingIds: current });
    return nextState;
  },

  isFavorite: (listingId: string) => {
    return get().savedListingIds.has(listingId);
  },

  clearFavorites: () => {
    set({ savedListingIds: new Set() });
  },
}));
