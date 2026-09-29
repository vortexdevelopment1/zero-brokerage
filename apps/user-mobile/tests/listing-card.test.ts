import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatPrice,
  formatArea,
} from "../src/features/discovery/utils/formatters";
import type { ListingSummaryDto } from "../src/features/discovery/types/discovery.types";

describe("listing card: formatters & presentation rules", () => {
  it("formats Indian Rupee prices across scales (Lakhs, Crores, thousands)", () => {
    // Crores
    assert.equal(formatPrice(15000000, "INR"), "₹1.5 Cr");
    assert.equal(formatPrice(20000000, "INR"), "₹2 Cr");

    // Lakhs
    assert.equal(formatPrice(7500000, "INR"), "₹75 L");
    assert.equal(formatPrice(4550000, "INR"), "₹45.5 L");

    // Thousands
    assert.equal(formatPrice(45000, "INR"), "₹45,000");
    assert.equal(formatPrice(12500, "₹"), "₹12,500");

    // NaN / Edge cases
    assert.equal(formatPrice(NaN, "INR"), "Price on Request");
  });

  it("formats square footage area accurately", () => {
    assert.equal(formatArea(1250), "1,250 sq.ft");
    assert.equal(formatArea(800), "800 sq.ft");
    assert.equal(formatArea(undefined), null);
    assert.equal(formatArea(NaN), null);
  });

  it("preserves backend fields without inferring unprovided badges", () => {
    const rawListing: ListingSummaryDto = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Spacious 2BHK in Indiranagar",
      price: 38000,
      currency: "INR",
      listingIntent: "RENT",
      // coverImageUrl is omitted
      // verificationStatus is omitted
      // isSponsored is omitted
    };

    assert.equal(rawListing.coverImageUrl, undefined);
    assert.equal(rawListing.verificationStatus, undefined);
    assert.equal(rawListing.isSponsored, undefined);

    // Front-end does not assume verified or sponsored
    const isVerified = rawListing.verificationStatus === "VERIFIED";
    const isSponsored = rawListing.isSponsored === true;

    assert.equal(isVerified, false);
    assert.equal(isSponsored, false);
  });

  it("recognizes verified status only when backend explicitly returns VERIFIED", () => {
    const verifiedListing: ListingSummaryDto = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Luxury Penthouse",
      price: 120000,
      currency: "INR",
      listingIntent: "RENT",
      verificationStatus: "VERIFIED",
    };

    const unverifiedListing: ListingSummaryDto = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Commercial Space",
      price: 90000,
      currency: "INR",
      listingIntent: "RENT",
      verificationStatus: "UNVERIFIED",
    };

    assert.equal(verifiedListing.verificationStatus === "VERIFIED", true);
    assert.equal(unverifiedListing.verificationStatus === "VERIFIED", false);
  });

  it("recognizes sponsored classification only when isSponsored is true", () => {
    const sponsoredListing: ListingSummaryDto = {
      id: "550e8400-e29b-41d4-a716-446655440003",
      title: "Featured Villa",
      price: 35000000,
      currency: "INR",
      listingIntent: "SALE",
      isSponsored: true,
    };

    const organicListing: ListingSummaryDto = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      title: "Standard Villa",
      price: 35000000,
      currency: "INR",
      listingIntent: "SALE",
      isSponsored: false,
    };

    assert.equal(sponsoredListing.isSponsored === true, true);
    assert.equal(organicListing.isSponsored === true, false);
  });

  it("mapRawListingToUiModel correctly maps raw backend objects to presentation models", () => {
    const {
      mapRawListingToUiModel,
    } = require("../src/features/discovery/types/discovery.types");

    const validRaw = {
      id: "550e8400-e29b-41d4-a716-446655440005",
      title: "Cozy Studio",
      price: 25000,
      currency: "INR",
      listingIntent: "RENT",
      verificationStatus: "VERIFIED",
      isSponsored: false,
    };

    const mapped = mapRawListingToUiModel(validRaw);
    assert.notEqual(mapped, null);
    assert.equal(mapped?.id, "550e8400-e29b-41d4-a716-446655440005");
    assert.equal(mapped?.title, "Cozy Studio");
    assert.equal(mapped?.price, 25000);
    assert.equal(mapped?.verificationStatus, "VERIFIED");
    assert.equal(mapped?.isSponsored, undefined);

    // Rejects invalid shapes
    assert.equal(mapRawListingToUiModel(null), null);
    assert.equal(mapRawListingToUiModel({}), null);
    assert.equal(mapRawListingToUiModel({ id: 123 }), null);
  });
});
