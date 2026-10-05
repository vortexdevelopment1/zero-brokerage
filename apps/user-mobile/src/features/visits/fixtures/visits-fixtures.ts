/**
 * Visits Fixtures
 * High-fidelity fixtures for development, testing, and offline evaluation.
 * Conforms strictly to backend VisitRecord and VisitAvailabilityResponse shapes.
 */

import type {
  VisitAvailabilityResponse,
  VisitListResponse,
  VisitRecord,
} from "../types/visits.types";

export const FIXTURE_USER_VISITS: VisitRecord[] = [
  {
    id: "v-00000001-1111-4000-8000-000000000001",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    listingId: "11111111-2222-4444-8888-111111111111",
    listingTitle: "The Glasshouse Penthouse",
    listingLocalityName: "Indiranagar",
    listingCityName: "Bengaluru",
    listingCoverImageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&auto=format&fit=crop",
    requestedStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    requestedEndAt: new Date(
      Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    ).toISOString(),
    confirmedStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    confirmedEndAt: new Date(
      Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    ).toISOString(),
    status: "CONFIRMED",
    requestNote: "Please confirm parking availability.",
    cancellationReason: null,
    rescheduleReason: null,
    canCancel: true,
    canReschedule: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "v-00000002-2222-4000-8000-000000000002",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    listingId: "22222222-3333-4444-8888-222222222222",
    listingTitle: "Sea-Facing Modernist Sanctuary",
    listingLocalityName: "Worli Sea Face",
    listingCityName: "Mumbai",
    listingCoverImageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&auto=format&fit=crop",
    requestedStartAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    requestedEndAt: new Date(
      Date.now() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000,
    ).toISOString(),
    confirmedStartAt: null,
    confirmedEndAt: null,
    status: "REQUESTED",
    requestNote: "Looking forward to viewing the terrace.",
    cancellationReason: null,
    rescheduleReason: null,
    canCancel: true,
    canReschedule: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

export function getFixtureVisitList(): VisitListResponse {
  return {
    items: FIXTURE_USER_VISITS,
    total: FIXTURE_USER_VISITS.length,
    nextCursor: null,
    hasMore: false,
  };
}

export function generateFixtureAvailability(
  listingId: string,
): VisitAvailabilityResponse {
  const slots = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const dayStart = new Date(
      baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000,
    );
    for (const hour of [10, 14, 17]) {
      const slotStart = new Date(dayStart);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
      const isAvailable = !(dayOffset === 2 && hour === 14);

      slots.push({
        slotId: `slot-${listingId.slice(0, 8)}-d${dayOffset}h${hour}`,
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        isAvailable,
      });
    }
  }

  return {
    listingId,
    listing: {
      id: listingId,
      title: "The Glasshouse Penthouse",
      localityName: "Indiranagar",
      cityName: "Bengaluru",
      coverImageUrl:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&auto=format&fit=crop",
    },
    visitEligibility: {
      isEligible: true,
      reason: "AVAILABLE",
      existingVisitId: null,
    },
    slots,
    timezone: "Asia/Kolkata",
  };
}
