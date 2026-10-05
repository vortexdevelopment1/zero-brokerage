/**
 * Inquiry Domain Types
 * Strict parity with Shared Core Backend inquiries plugin (`services/api/src/modules/inquiries/inquiries.plugin.ts`).
 */

export type InquiryStatus =
  "SUBMITTED" | "ACKNOWLEDGED" | "RESPONDED" | "CLOSED";

export interface InquiryRecord {
  readonly id: string;
  readonly userId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingLocalityName: string;
  readonly listingCityName: string;
  readonly listingCoverImageUrl: string | null;
  readonly message: string;
  readonly status: InquiryStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InquiryListResponse {
  readonly items: InquiryRecord[];
  readonly total: number;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface SubmitInquiryDto {
  readonly listingId: string;
  readonly message: string;
}
