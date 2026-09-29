export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "LAND";

export type PropertySubType =
  | "APARTMENT"
  | "PENTHOUSE"
  | "VILLA"
  | "BUILDER_FLOOR"
  | "OFFICE"
  | "CO_WORKING"
  | "RETAIL"
  | "COMMERCIAL_BUILDING"
  | "AGRICULTURAL_LAND"
  | "INDUSTRIAL_PLOT"
  | "COMMERCIAL_PLOT";

export type FurnishingStatus =
  | "UNFURNISHED"
  | "SEMI_FURNISHED"
  | "FULLY_FURNISHED";

export type AreaUnit = "SQ_FT" | "SQ_M" | "ACRES" | "HECTARES" | "SQ_YD";

export interface Property {
  id: string;
  propertyType: PropertyType;
  subType: PropertySubType;
  title: string | null;
  addressLine1: string;
  addressLine2: string | null;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  builtUpArea: number | null;
  carpetArea: number | null;
  plotArea: number | null;
  areaUnit: AreaUnit;
  bedroomCount: number | null;
  bathroomCount: number | null;
  balconyCount: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  furnishingStatus: FurnishingStatus | null;
  amenities: string[];
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PropertyWithDistance extends Property {
  distanceMeters: number;
}

export interface CreatePropertyParams {
  propertyType: PropertyType;
  subType: PropertySubType;
  title?: string | null | undefined;
  addressLine1: string;
  addressLine2?: string | null | undefined;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode?: string | undefined;
  latitude: number;
  longitude: number;
  builtUpArea?: number | null | undefined;
  carpetArea?: number | null | undefined;
  plotArea?: number | null | undefined;
  areaUnit?: AreaUnit | undefined;
  bedroomCount?: number | null | undefined;
  bathroomCount?: number | null | undefined;
  balconyCount?: number | null | undefined;
  floorNumber?: number | null | undefined;
  totalFloors?: number | null | undefined;
  furnishingStatus?: FurnishingStatus | null | undefined;
  amenities?: string[] | undefined;
  attributes?: Record<string, unknown> | undefined;
}

export type ListingOwnerType = "INDEPENDENT_BROKER" | "AGENCY" | "DIRECT_OWNER";

export type ListingIntent = "SALE" | "RENT" | "LEASE";

export type PricePeriod = "MONTHLY" | "YEARLY" | "DAILY" | "ONE_TIME";

export type ListingStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "PENDING_MODERATION"
  | "PUBLISHED"
  | "SUSPENDED"
  | "EXPIRED"
  | "ARCHIVED"
  | "REJECTED"
  | "WITHDRAWN";

export interface Listing {
  id: string;
  propertyId: string;
  ownerType: ListingOwnerType;
  agencyId: string | null;
  brokerId: string | null;
  listingIntent: ListingIntent;
  title: string | null;
  description: string | null;
  priceMinor: bigint;
  currency: string;
  pricePeriod: PricePeriod | null;
  securityDepositMinor: bigint | null;
  maintenanceFeeMinor: bigint | null;
  isNegotiable: boolean;
  availableFrom: string | null;
  status: ListingStatus;
  isVerified: boolean;
  isFeatured: boolean;
  createdBy: string;
  updatedBy: string | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListingParams {
  propertyId: string;
  ownerType: ListingOwnerType;
  agencyId?: string | null | undefined;
  brokerId?: string | null | undefined;
  listingIntent: ListingIntent;
  title?: string | null | undefined;
  description?: string | null | undefined;
  priceMinor: bigint;
  currency?: string | undefined;
  pricePeriod?: PricePeriod | null | undefined;
  securityDepositMinor?: bigint | null | undefined;
  maintenanceFeeMinor?: bigint | null | undefined;
  isNegotiable?: boolean | undefined;
  availableFrom?: string | null | undefined;
  status?: ListingStatus | undefined;
  createdBy: string;
}

export interface ListListingsParams {
  limit?: number | undefined;
  cursor?: string | null | undefined;
  propertyId?: string | undefined;
  agencyId?: string | undefined;
  brokerId?: string | undefined;
  status?: ListingStatus | undefined;
  listingIntent?: ListingIntent | undefined;
}
