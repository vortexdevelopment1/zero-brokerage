export type KycStatus = "not_submitted" | "pending_review" | "verified" | "rejected";

export type KycDocumentType =
  | "aadhaar"
  | "pan"
  | "rera_certificate"
  | "agency_license"
  | "business_pan"
  | "profile_photo"
  | "other";

export type KycDocumentStatus = "submitted" | "approved" | "rejected" | "pending";

export interface KycDocumentPreviewData {
  issuer?: string;
  holderName?: string;
  validUntil?: string;
  watermarkText?: string;
  details?: Record<string, string>;
}

export interface KycDocument {
  id: string;
  type: KycDocumentType;
  title: string;
  documentNumberMasked?: string;
  status: KycDocumentStatus;
  submittedAt: string;
  fileType?: "image" | "pdf";
  fileSize?: string;
  previewData?: KycDocumentPreviewData;
  notes?: string;
}

export interface KycVerificationDetail {
  id: string;
  entityId: string;
  entityType: "user" | "broker";
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  agency?: string | null;
  status: KycStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  rejectionComments?: string;
  documents: KycDocument[];
}

export interface KycApprovalResult {
  success: boolean;
  entityId: string;
  status: KycStatus;
  reviewedAt: string;
  reviewedBy: string;
}

export interface KycRejectionResult {
  success: boolean;
  entityId: string;
  status: KycStatus;
  reason: string;
  comments?: string;
  reviewedAt: string;
  reviewedBy: string;
}
