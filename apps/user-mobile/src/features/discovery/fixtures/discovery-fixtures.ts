/**
 * Zero Brokerage Discovery Fixtures
 *
 * Contract Disciplinary Notice:
 * - Represents backend-shaped presentation data for development & offline evaluation.
 * - Does NOT contain client-side ranking, fake trust scores, or invented business rules.
 * - Conforms strictly to ListingPresentationModel and CursorPaginationResult types.
 */

import type {
  DiscoveryFeedUiModel,
  ListingPresentationModel,
} from "../types/discovery.types";

export const FIXTURE_LISTINGS: readonly ListingPresentationModel[] = [
  {
    id: "11111111-2222-4444-8888-111111111111",
    title: "The Glasshouse Penthouse",
    price: 145000,
    currency: "INR",
    listingIntent: "RENT",
    propertyType: "Penthouse",
    bedrooms: 3,
    bathrooms: 3,
    areaSqFt: 2650,
    localityName: "Indiranagar",
    cityName: "Bengaluru",
    coverImageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80&auto=format&fit=crop",
    verificationStatus: "VERIFIED",
    isSponsored: true,
    availabilityStatus: "AVAILABLE",
  },
  {
    id: "22222222-3333-4444-8888-222222222222",
    title: "Sea-Facing Modernist Sanctuary",
    price: 210000,
    currency: "INR",
    listingIntent: "RENT",
    propertyType: "Apartment",
    bedrooms: 4,
    bathrooms: 4,
    areaSqFt: 3400,
    localityName: "Worli Sea Face",
    cityName: "Mumbai",
    coverImageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80&auto=format&fit=crop",
    verificationStatus: "VERIFIED",
    isSponsored: false,
    availabilityStatus: "AVAILABLE",
  },
  {
    id: "33333333-4444-4444-8888-333333333333",
    title: "Minimalist Garden Villa",
    price: 48000000,
    currency: "INR",
    listingIntent: "SALE",
    propertyType: "Villa",
    bedrooms: 4,
    bathrooms: 5,
    areaSqFt: 4600,
    localityName: "Jubilee Hills",
    cityName: "Hyderabad",
    coverImageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80&auto=format&fit=crop",
    verificationStatus: "VERIFIED",
    isSponsored: false,
    availabilityStatus: "AVAILABLE",
  },
  {
    id: "44444444-5555-4444-8888-444444444444",
    title: "Architectural Loft at Defence Colony",
    price: 95000,
    currency: "INR",
    listingIntent: "RENT",
    propertyType: "Loft",
    bedrooms: 2,
    bathrooms: 2,
    areaSqFt: 1800,
    localityName: "Defence Colony",
    cityName: "New Delhi",
    coverImageUrl:
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&q=80&auto=format&fit=crop",
    verificationStatus: undefined, // Explicitly unverified to test neutral badge handling
    isSponsored: false,
    availabilityStatus: "AVAILABLE",
  },
  {
    id: "55555555-6666-4444-8888-555555555555",
    title: "Sunlit Courtyard Residence",
    price: 32000000,
    currency: "INR",
    listingIntent: "SALE",
    propertyType: "Duplex",
    bedrooms: 3,
    bathrooms: 3,
    areaSqFt: 2900,
    localityName: "Bandra West",
    cityName: "Mumbai",
    coverImageUrl:
      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&q=80&auto=format&fit=crop",
    verificationStatus: "VERIFIED",
    isSponsored: false,
    availabilityStatus: "UNDER_OFFER",
  },
  {
    id: "66666666-7777-4444-8888-666666666666",
    title: "Teak & Terrazzo Contemporary Flat",
    price: 68000,
    currency: "INR",
    listingIntent: "RENT",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    areaSqFt: 1350,
    localityName: "Koregaon Park",
    cityName: "Pune",
    coverImageUrl:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80&auto=format&fit=crop",
    verificationStatus: undefined,
    isSponsored: false,
    availabilityStatus: "AVAILABLE",
  },
];

export const FIXTURE_EDITORIAL_FEED: DiscoveryFeedUiModel = {
  sections: [
    {
      id: "section-curated-showcase",
      sectionType: "PROPERTIES",
      title: "Architectural Highlights",
      subtitle:
        "Curated residential properties with exceptional spatial design",
      listings: [FIXTURE_LISTINGS[0], FIXTURE_LISTINGS[1]],
    },
    {
      id: "section-prime-residences",
      sectionType: "PROPERTIES",
      title: "Prime Residences",
      subtitle: "Explore verified homes available with direct owner contact",
      listings: [
        FIXTURE_LISTINGS[2],
        FIXTURE_LISTINGS[3],
        FIXTURE_LISTINGS[4],
        FIXTURE_LISTINGS[5],
      ],
    },
  ],
};
