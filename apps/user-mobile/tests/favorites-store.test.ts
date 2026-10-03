import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { useFavoritesStore } from "../src/features/discovery/stores/favorites-store";

describe("favorites store: bookmarking logic (M04)", () => {
  it("toggles favorite state correctly", () => {
    const testId = "99999999-9999-4999-8999-999999999999";

    // Initial state: not favorite
    const initialFav = useFavoritesStore.getState().isFavorite(testId);
    assert.equal(initialFav, false);

    // Toggle on
    const newState1 = useFavoritesStore.getState().toggleFavorite(testId);
    assert.equal(newState1, true);
    assert.equal(useFavoritesStore.getState().isFavorite(testId), true);

    // Toggle off
    const newState2 = useFavoritesStore.getState().toggleFavorite(testId);
    assert.equal(newState2, false);
    assert.equal(useFavoritesStore.getState().isFavorite(testId), false);
  });
});
