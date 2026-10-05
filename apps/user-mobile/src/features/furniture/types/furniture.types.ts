/**
 * Zero Brokerage User Mobile — Furniture Domain Types (Step 8)
 *
 * Strict architectural boundaries:
 * 1. Authoritative backend types for individual furniture and packaged setups.
 * 2. Explicit separation of Rental vs Purchase commercial modes.
 * 3. Never calculate rent, deposits, taxes, or order totals on client.
 * 4. Transparent delivery, return, and damage claim lifecycle models.
 */

export type FurnitureCommercialMode = "RENTAL" | "SALE" | "BOTH";

export type FurnitureItemType = "INDIVIDUAL" | "PACKAGE";

export type FurnitureCategory =
  | "WORKSTATION"
  | "SEATING"
  | "CONFERENCE"
  | "STORAGE"
  | "EXECUTIVE"
  | "LOUNGE"
  | "LIGHTING";

export type FurnitureAvailabilityStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "PRE_ORDER"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE";

export type FurnitureOrderStatus =
  | "REQUESTED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "ACTIVE_RENTAL"
  | "RETURN_REQUESTED"
  | "RETURN_SCHEDULED"
  | "RETURNED"
  | "CLAIM_UNDER_REVIEW"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "FAILED"
  | "EXPIRED";

export type FurniturePaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ACTION_REQUIRED";

export type FurnitureDeliveryStatus =
  | "PENDING"
  | "SCHEDULED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

export type FurnitureHistoryFilterCategory =
  | "ALL"
  | "PURCHASE"
  | "ACTIVE_RENTAL"
  | "PENDING"
  | "COMPLETED"
  | "RETURNS"
  | "CANCELLED"
  | "FAILED"
  | "CLAIMS";

export type FurnitureRentalFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";

export interface FurnitureVariant {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly color?: string;
  readonly finish?: string;
  readonly isAvailable: boolean;
}

export interface FurnitureIncludedItem {
  readonly name: string;
  readonly quantity: number;
  readonly category: string;
}

export interface FurnitureAsset {
  readonly id: string; // RFC 4122 UUID
  readonly name: string;
  readonly slug: string;
  readonly category: FurnitureCategory;
  readonly type: FurnitureItemType;
  readonly description: string;
  readonly images: readonly string[];
  readonly availableModes: readonly ("RENTAL" | "SALE")[];
  readonly salePrice?: number; // In INR
  readonly rentPerPeriod?: number; // In INR / month
  readonly depositAmount?: number; // Refundable security deposit
  readonly rentalFrequency?: FurnitureRentalFrequency;
  readonly minRentalMonths?: number;
  readonly availability: FurnitureAvailabilityStatus;
  readonly availableQuantity: number;
  readonly dimensions?: {
    readonly widthCm: number;
    readonly depthCm: number;
    readonly heightCm: number;
  };
  readonly materials?: readonly string[];
  readonly specifications?: Record<string, string>;
  readonly packageCapacity?: number; // e.g., 50 workstations
  readonly packageIncludedItems?: readonly FurnitureIncludedItem[];
  readonly deliveryEstimateDays: number;
  readonly serviceableCities: readonly string[];
  readonly warrantyMonths?: number;
  readonly variants?: readonly FurnitureVariant[];
  readonly cancellationPolicy: string;
  readonly returnPolicy: string;
  readonly isFeatured?: boolean;
}

export interface FurnitureCatalogFilterParams {
  readonly query?: string;
  readonly category?: FurnitureCategory | "ALL";
  readonly type?: FurnitureItemType | "ALL";
  readonly mode?: "RENTAL" | "SALE" | "ALL";
  readonly city?: string;
  readonly inStockOnly?: boolean;
  readonly minPrice?: number;
  readonly maxPrice?: number;
}

export interface FurnitureCatalogResponse {
  readonly items: readonly FurnitureAsset[];
  readonly total: number;
  readonly categories: readonly {
    readonly id: FurnitureCategory;
    readonly label: string;
    readonly count: number;
  }[];
  readonly serviceableCities: readonly string[];
}

export interface DeliveryAddressInput {
  readonly fullName: string;
  readonly phone: string;
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly city: string;
  readonly locality: string;
  readonly pincode: string;
}

export interface CheckoutIntentItemInput {
  readonly assetId: string;
  readonly variantId?: string;
  readonly mode: "RENTAL" | "SALE";
  readonly quantity: number;
}

export interface CheckoutSummaryLineItem {
  readonly assetId: string;
  readonly assetName: string;
  readonly coverImageUrl: string;
  readonly variantName?: string;
  readonly mode: "RENTAL" | "SALE";
  readonly quantity: number;
  readonly unitPriceOrRent: number;
  readonly subtotal: number;
  readonly depositSubtotal: number;
}

export interface CheckoutSummaryResponse {
  readonly items: readonly CheckoutSummaryLineItem[];
  readonly oneTimeCharges: number;
  readonly recurringRentPerPeriod: number;
  readonly rentalFrequency: FurnitureRentalFrequency;
  readonly securityDeposit: number;
  readonly deliveryFee: number;
  readonly taxes: number;
  readonly totalDueNow: number;
  readonly futureRecurringAmount: number;
  readonly nextBillingDate?: string;
  readonly estimatedDeliveryDays: number;
  readonly cancellationTerms: string;
  readonly returnTerms: string;
  readonly termsConsentRequired: boolean;
}

export interface CreateFurnitureOrderInput {
  readonly items: readonly CheckoutIntentItemInput[];
  readonly deliveryAddress: DeliveryAddressInput;
  readonly rentalDurationMonths?: number;
  readonly specialInstructions?: string;
}

export interface FurnitureOrderLineItem {
  readonly assetId: string;
  readonly assetName: string;
  readonly coverImageUrl: string;
  readonly variantName?: string;
  readonly mode: "RENTAL" | "SALE";
  readonly quantity: number;
  readonly unitPriceOrRent: number;
  readonly subtotal: number;
  readonly depositSubtotal: number;
}

export interface FurnitureOrder {
  readonly id: string; // RFC 4122 UUID
  readonly orderNumber: string; // e.g. ZB-FURN-2026-0042
  readonly userId: string;
  readonly items: readonly FurnitureOrderLineItem[];
  readonly mode: "RENTAL" | "SALE" | "MIXED";
  readonly status: FurnitureOrderStatus;
  readonly paymentStatus: FurniturePaymentStatus;
  readonly deliveryStatus: FurnitureDeliveryStatus;
  readonly totalDueNow: number;
  readonly recurringRentPerPeriod: number;
  readonly securityDeposit: number;
  readonly deliveryFee: number;
  readonly taxes: number;
  readonly deliveryAddress: DeliveryAddressInput;
  readonly trackingNumber?: string;
  readonly estimatedDeliveryDate: string;
  readonly deliveredAt?: string;
  readonly activeRentalStartDate?: string;
  readonly nextRenewalDate?: string;
  readonly rentalDurationMonths?: number;
  readonly canCancel: boolean;
  readonly cancellationReason?: string;
  readonly canRequestReturn: boolean;
  readonly returnRequestedAt?: string;
  readonly returnScheduledDate?: string;
  readonly returnStatus?: "REQUESTED" | "SCHEDULED" | "PICKED_UP" | "COMPLETED";
  readonly claimStatus?: "NONE" | "SUBMITTED" | "IN_REVIEW" | "RESOLVED";
  readonly claimDescription?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FurnitureOrderListResponse {
  readonly items: readonly FurnitureOrder[];
  readonly total: number;
}

export interface CancelFurnitureOrderInput {
  readonly reason: string;
}

export interface RequestFurnitureReturnInput {
  readonly preferredPickupDate: string;
  readonly reason: string;
}

export interface FileDamageClaimInput {
  readonly description: string;
}
