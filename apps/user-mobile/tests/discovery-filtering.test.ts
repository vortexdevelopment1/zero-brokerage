import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  matchesCategory,
  matchesLocation,
} from "../src/features/discovery/utils/discovery-filters";
import { FIXTURE_LISTINGS } from "../src/features/discovery/fixtures/discovery-fixtures";

describe("discovery: category and location filtering", () => {
  const penthouse = FIXTURE_LISTINGS[0]; // The Glasshouse Penthouse (Bengaluru, Indiranagar)
  const apartment = FIXTURE_LISTINGS[1]; // Sea-Facing Modernist Sanctuary (Mumbai, Worli Sea Face)
  const villa = FIXTURE_LISTINGS[2]; // Minimalist Garden Villa (Hyderabad, Jubilee Hills)
  const loft = FIXTURE_LISTINGS[3]; // Architectural Loft (New Delhi, Defence Colony)

  it("filters listings by category accurately", () => {
    // Penthouses
    assert.equal(matchesCategory(penthouse, "cat-penthouse"), true);
    assert.equal(matchesCategory(villa, "cat-penthouse"), false);
    assert.equal(matchesCategory(apartment, "cat-penthouse"), false);

    // Villas
    assert.equal(matchesCategory(villa, "cat-villa"), true);
    assert.equal(matchesCategory(penthouse, "cat-villa"), false);
    assert.equal(matchesCategory(apartment, "cat-villa"), false);

    // Combined Penthouses & Villas
    assert.equal(matchesCategory(penthouse, "cat-residential"), true);
    assert.equal(matchesCategory(villa, "cat-residential"), true);
    assert.equal(matchesCategory(apartment, "cat-residential"), false);

    // Apartments
    assert.equal(matchesCategory(apartment, "cat-apartments"), true);
    assert.equal(matchesCategory(villa, "cat-apartments"), false);

    // Furnished / Lofts
    assert.equal(matchesCategory(loft, "cat-furnished"), true);

    // All categories or undefined
    assert.equal(matchesCategory(penthouse, "cat-all"), true);
    assert.equal(matchesCategory(villa, undefined), true);
  });

  it("filters listings by location accurately", () => {
    // Bengaluru
    assert.equal(matchesLocation(penthouse, "Bengaluru"), true);
    assert.equal(matchesLocation(apartment, "Bengaluru"), false);

    // Mumbai
    assert.equal(matchesLocation(apartment, "Mumbai"), true);
    assert.equal(matchesLocation(penthouse, "Mumbai"), false);

    // Hyderabad
    assert.equal(matchesLocation(villa, "Hyderabad"), true);

    // All locations or undefined
    assert.equal(matchesLocation(penthouse, "All Locations"), true);
    assert.equal(matchesLocation(apartment, undefined), true);
  });

  it("handles case-insensitive location matching and partial localities", () => {
    assert.equal(matchesLocation(apartment, "mumbai"), true);
    assert.equal(matchesLocation(apartment, "Worli"), true);
    assert.equal(matchesLocation(penthouse, "Indiranagar"), true);
  });
});
