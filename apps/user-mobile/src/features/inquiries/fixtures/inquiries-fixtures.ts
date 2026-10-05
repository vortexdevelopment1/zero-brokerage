/**
 * Inquiries Fixtures
 * High-fidelity fixtures for development, testing, and offline evaluation.
 */

import type {
  InquiryListResponse,
  InquiryRecord,
} from "../types/inquiries.types";

export const FIXTURE_USER_INQUIRIES: InquiryRecord[] = [
  {
    id: "inq-00000001-1111-4000-8000-000000000001",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    listingId: "33333333-4444-4444-8888-333333333333",
    listingTitle: "Minimalist Garden Villa",
    listingLocalityName: "Jubilee Hills",
    listingCityName: "Hyderabad",
    listingCoverImageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80&auto=format&fit=crop",
    message:
      "Hello, I am interested in scheduling a walkthrough of this villa. Could you share details regarding maintenance charges?",
    status: "ACKNOWLEDGED",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inq-00000002-2222-4000-8000-000000000002",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    listingId: "44444444-5555-4444-8888-444444444444",
    listingTitle: "Architectural Loft at Defence Colony",
    listingLocalityName: "Defence Colony",
    listingCityName: "New Delhi",
    listingCoverImageUrl:
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800&q=80&auto=format&fit=crop",
    message:
      "Is the lease period negotiable for a 2-year tenure? Kindly advise on documentation requirements.",
    status: "SUBMITTED",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

export function getFixtureInquiryList(): InquiryListResponse {
  return {
    items: FIXTURE_USER_INQUIRIES,
    total: FIXTURE_USER_INQUIRIES.length,
    nextCursor: null,
    hasMore: false,
  };
}
