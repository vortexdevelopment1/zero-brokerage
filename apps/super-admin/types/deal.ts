export type DealLifecycleStage =
  | "NEGOTIATION"
  | "DEAL_INITIATED"
  | "AMOUNT_CONFIRMED"
  | "AGREEMENT_PENDING"
  | "AGREEMENT_UPLOADED_BY_USER"
  | "AGREEMENT_UPLOADED_BY_BROKER"
  | "AGREEMENT_COMPLETED"
  | "DEAL_DONE"
  | "DEAL_CANCELLED";

export type DealStatus =
  | "negotiation"
  | "deal_initiated"
  | "amount_confirmed"
  | "agreement_pending"
  | "agreement_completed"
  | "deal_done"
  | "cancelled";

export type AgreementStatus =
  | "pending"
  | "user_uploaded"
  | "broker_uploaded"
  | "both_uploaded"
  | "under_admin_review"
  | "mismatch_flagged"
  | "changes_requested"
  | "approved"
  | "completed";

export type AgreementReviewStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "completed";

export interface AgreementDocument {
  id: string;
  party: "user" | "broker";
  title: string;
  documentNumberMasked: string;
  uploadedAt: string;
  fileSize: string;
  fileType: "pdf" | "docx";
  status: "pending" | "approved" | "rejected" | "changes_requested";
  specimenData: {
    parties: {
      firstParty: string; // e.g. Owner/Broker
      secondParty: string; // e.g. Tenant/Buyer
    };
    dealAmount: number;
    propertyDetails: string;
    executionDate: string;
    place: string;
    signatures: {
      firstPartySigned: boolean;
      secondPartySigned: boolean;
      stampAffixed: boolean;
    };
    watermark: string;
  };
  notes?: string;
}

export interface DealAuditEntry {
  id: string;
  stage: string;
  timestamp: string;
  actor: string;
  role: "Buyer" | "Broker" | "Agency" | "Super Admin" | "System";
  description: string;
  status: "completed" | "current" | "pending" | "alert";
  metadata?: Record<string, string | number>;
}

export interface Deal {
  id: string; // e.g. "DL-84210"
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  broker: {
    id: string;
    name: string;
    phone: string;
    license: string;
    avatar?: string;
  };
  agency: {
    id: string;
    name: string;
  } | null;
  property: {
    id: string;
    title: string;
    category: string;
    subtype: string;
    city: string;
    locality: string;
    price: number;
  };
  dealAmount: number;
  paymentMode: "platform_collected" | "external_transaction";
  heldDepositAmount: number; // held by platform if platform_collected
  stage: DealLifecycleStage;
  status: DealStatus;
  agreementStatus: AgreementStatus;
  reviewStatus: AgreementReviewStatus;
  userAgreement?: AgreementDocument;
  brokerAgreement?: AgreementDocument;
  mismatchReason?: string;
  cancellationId?: string;
  createdAt: string;
  updatedAt: string;
  auditTimeline: DealAuditEntry[];
}

export interface DealFilters {
  search?: string;
  status?: string;
  agreementStatus?: string;
  broker?: string;
  property?: string;
  dateFrom?: string;
  dateTo?: string;
}
