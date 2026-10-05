/**
 * Visit Domain Types
 * Strict parity with Shared Core Backend visits plugin (`services/api/src/modules/visits/visits.plugin.ts`).
 */

export type VisitStatus =
  | "REQUESTED"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED"
  | "RESCHEDULED"
  | "CANCELLED_BY_USER"
  | "CANCELLED_BY_BROKER"
  | "CANCELLED_BY_SYSTEM"
  | "NO_SHOW"
  | "COMPLETED"
  | "EXPIRED"
  | "REJECTED";

export interface VisitRecord {
  readonly id: string;
  readonly userId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingLocalityName: string;
  readonly listingCityName: string;
  readonly listingCoverImageUrl: string | null;
  readonly requestedStartAt: string;
  readonly requestedEndAt: string;
  readonly confirmedStartAt: string | null;
  readonly confirmedEndAt: string | null;
  readonly status: VisitStatus;
  readonly requestNote: string | null;
  readonly cancellationReason: string | null;
  readonly rescheduleReason: string | null;
  readonly canCancel: boolean;
  readonly canReschedule: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VisitAvailabilitySlot {
  readonly slotId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly isAvailable: boolean;
}

export interface VisitEligibility {
  readonly isEligible: boolean;
  readonly reason:
    "EXISTING_ACTIVE_VISIT" | "LISTING_UNAVAILABLE" | "AVAILABLE";
  readonly existingVisitId: string | null;
}

export interface VisitAvailabilityResponse {
  readonly listingId: string;
  readonly listing: {
    readonly id: string;
    readonly title: string;
    readonly localityName: string;
    readonly cityName: string;
    readonly coverImageUrl: string | null;
  } | null;
  readonly visitEligibility: VisitEligibility;
  readonly slots: VisitAvailabilitySlot[];
  readonly timezone: string;
}

export interface VisitListResponse {
  readonly items: VisitRecord[];
  readonly total: number;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface RequestVisitDto {
  readonly listingId: string;
  readonly requestedStartAt: string;
  readonly requestedEndAt: string;
  readonly requestNote?: string;
}

export interface CancelVisitDto {
  readonly reason?: string;
}

export interface RescheduleVisitDto {
  readonly requestedStartAt: string;
  readonly requestedEndAt: string;
  readonly reason?: string;
}
