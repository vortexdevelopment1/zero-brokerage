export type AgencyPlan = "Silver Partner" | "Gold Agency" | "Platinum Builder";
export type AgencyStatus = "pending" | "active" | "suspended" | "rejected";

/**
 * Base Agency contract — matches backend schema.
 * Note: Status is the operational state ("pending" | "active" | "suspended" | "rejected").
 * Verification status is derived in the frontend, not assumed as a backend column.
 */
export interface Agency {
  id: string;
  name: string;
  owner: string;
  plan: AgencyPlan;
  brokers: number;
  activeListings: number;
  status: AgencyStatus;
  city: string;
  createdAt: string;
}

/**
 * Frontend-derived verification status based on operational status.
 * This maintains the conceptual distinction between Operational and Verification status
 * without inventing an unconfirmed backend verification_status field.
 */
export type DerivedVerificationStatus = "pending_review" | "verified" | "rejected";

export function getDerivedVerificationStatus(status: AgencyStatus): DerivedVerificationStatus {
  switch (status) {
    case "active":
    case "suspended":
      return "verified";
    case "rejected":
      return "rejected";
    case "pending":
    default:
      return "pending_review";
  }
}

/**
 * Isolated Agency KYC document structure for the Agency Verification UI.
 * Supports the 3 agency-level documents: GST Certificate, Owner PAN, Owner Aadhaar.
 * Isolated here so the core KycDocumentType contract in types/kyc.ts remains unmodified.
 */
export type AgencyDocumentType = "gst_certificate" | "business_pan" | "pan" | "aadhaar" | "agency_license" | "other";

export interface AgencyKycDocument {
  id: string;
  type: AgencyDocumentType;
  title: string;
  documentNumberMasked?: string;
  status: "submitted" | "approved" | "rejected" | "pending";
  submittedAt: string;
  fileType?: "image" | "pdf";
  fileSize?: string;
  previewData?: {
    issuer?: string;
    holderName?: string;
    validUntil?: string;
    watermarkText?: string;
    details?: Record<string, string>;
  };
  notes?: string;
}

export interface AgencyBrokerMember {
  id: string;
  name: string;
  closures: number;
  phone?: string;
  email?: string;
  status?: "active" | "suspended";
  rating?: number;
  propertiesListed?: number;
}

/**
 * AgencyDetail contract.
 * Preserves confirmed backend fields: email, phone, seatsUsed, seatsAllowed, boostCredits, brokerTeam.
 * Invented nested objects (subscriptionSummary, avgClosingDays, activityTimeline) have been removed.
 */
export interface AgencyDetail extends Agency {
  email: string;
  phone: string;
  seatsUsed: number;
  seatsAllowed: number;
  boostCredits: number;
  brokerTeam: AgencyBrokerMember[];
  kycDocuments?: AgencyKycDocument[];
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  rejectionComments?: string;
}

export interface AgencyFilters {
  search?: string;
  status?: AgencyStatus | "all";
  plan?: AgencyPlan | "all";
}
