/**
 * Discovery Frontend Domain & Presentation Models
 *
 * NOTE ON CONTRACT BOUNDARIES:
 * The official backend DTOs for property discovery have NOT been finalized or registered
 * in `services/api`. The interfaces defined here represent FRONTEND PRESENTATION MODELS
 * and provisional contracts to ensure UI resilience.
 *
 * Once backend schemas land, explicit mappers (Backend DTO -> UI Model) will isolate
 * the rest of the application from backend schema changes.
 */

export type ListingIntent = "RENT" | "SALE";

export type ListingVerificationStatus = "UNVERIFIED" | "VERIFIED";

export type ListingAvailabilityStatus =
  "AVAILABLE" | "UNDER_OFFER" | "UNAVAILABLE";

/**
 * Frontend presentation model for listing summary cards.
 * Independent of any single backend database projection.
 */
export interface ListingPresentationModel {
  /** Stable UUID identifier */
  readonly id: string;
  readonly title: string;
  readonly price: number;
  readonly currency: string;
  readonly listingIntent: ListingIntent;
  readonly propertyType?: string;
  readonly bedrooms?: number;
  readonly bathrooms?: number;
  readonly areaSqFt?: number;
  readonly localityName?: string;
  readonly cityName?: string;
  readonly coverImageUrl?: string | null;
  readonly verificationStatus?: ListingVerificationStatus;
  readonly isSponsored?: boolean;
  readonly availabilityStatus?: ListingAvailabilityStatus;
}

// Backward-compatible alias for existing consumers
export type ListingSummaryDto = ListingPresentationModel;

/**
 * Filter parameters for listing search
 */
export interface SearchFilterParams {
  readonly query?: string;
  readonly intent?: ListingIntent;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly bedrooms?: number;
  readonly verifiedOnly?: boolean;
}

/**
 * Contract-neutral pagination envelope
 */
export interface CursorPaginationResult<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string | null;
  readonly hasMore: boolean;
  readonly total?: number;
}

export type CursorPaginationDto<T> = CursorPaginationResult<T>;

/**
 * Category Item Representation
 */
export interface PropertyCategoryItem {
  readonly id: string;
  readonly label: string;
  readonly iconName: string;
}

/**
 * Presentation Feed Section Descriptor
 */
export type DiscoverSectionType =
  "BANNER" | "PROPERTIES" | "FURNITURE_SPOTLIGHT";

export interface DiscoverFeedSectionModel {
  readonly id: string;
  readonly sectionType: DiscoverSectionType;
  readonly title: string;
  readonly subtitle?: string;
  readonly listings?: readonly ListingPresentationModel[];
  readonly categories?: readonly PropertyCategoryItem[];
}

export type DiscoverFeedSectionDto = DiscoverFeedSectionModel;

export interface DiscoveryFeedUiModel {
  readonly sections: readonly DiscoverFeedSectionModel[];
}

export type DiscoverFeedResponseDto = DiscoveryFeedUiModel;

/**
 * Mapper Boundary: Raw Backend Payload -> Frontend Presentation Model
 * Validates shapes without assuming unconfirmed fields or inventing data.
 */
export function mapRawListingToUiModel(
  raw: unknown,
): ListingPresentationModel | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || typeof obj.title !== "string") {
    return null;
  }

  return {
    id: obj.id,
    title: obj.title,
    price: typeof obj.price === "number" ? obj.price : 0,
    currency: typeof obj.currency === "string" ? obj.currency : "INR",
    listingIntent: obj.listingIntent === "SALE" ? "SALE" : "RENT",
    propertyType:
      typeof obj.propertyType === "string" ? obj.propertyType : undefined,
    bedrooms: typeof obj.bedrooms === "number" ? obj.bedrooms : undefined,
    bathrooms: typeof obj.bathrooms === "number" ? obj.bathrooms : undefined,
    areaSqFt: typeof obj.areaSqFt === "number" ? obj.areaSqFt : undefined,
    localityName:
      typeof obj.localityName === "string" ? obj.localityName : undefined,
    cityName: typeof obj.cityName === "string" ? obj.cityName : undefined,
    coverImageUrl:
      typeof obj.coverImageUrl === "string" ? obj.coverImageUrl : null,
    verificationStatus:
      obj.verificationStatus === "VERIFIED" ? "VERIFIED" : undefined,
    isSponsored: obj.isSponsored === true ? true : undefined,
    availabilityStatus:
      obj.availabilityStatus === "UNDER_OFFER"
        ? "UNDER_OFFER"
        : obj.availabilityStatus === "UNAVAILABLE"
          ? "UNAVAILABLE"
          : "AVAILABLE",
  };
}
