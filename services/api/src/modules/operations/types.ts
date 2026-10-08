export type DealStatus =
  | "IN_PROGRESS"
  | "NEGOTIATION"
  | "DEAL_INITIATED"
  | "AMOUNT_CONFIRMED"
  | "AGREEMENT_PENDING"
  | "AGREEMENT_COMPLETED"
  | "DEAL_DONE"
  | "CANCELLED";

export type AgreementStatus =
  | "PENDING"
  | "USER_UPLOADED"
  | "BROKER_UPLOADED"
  | "BOTH_UPLOADED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export interface Deal {
  id: string;
  propertyId: string;
  listingId: string | null;
  buyerId: string;
  brokerId: string | null;
  agencyId: string | null;
  dealValueMinor: bigint;
  tokenAmountMinor: bigint;
  status: string;
  stage: string;
  agreementStatus: string;
  reviewStatus: string;
  userAgreementUrl: string | null;
  brokerAgreementUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  buyer?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | undefined;
  broker?: {
    id: string;
    name: string;
    phone: string;
    license: string | null;
  } | null | undefined;
  agency?: {
    id: string;
    name: string;
  } | null | undefined;
  property?: {
    id: string;
    title: string | null;
    city: string;
    locality: string;
  } | undefined;
}

export interface Visit {
  id: string;
  propertyId: string;
  visitorId: string;
  brokerId: string | null;
  agencyId: string | null;
  scheduledAt: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  property?: {
    id: string;
    title: string | null;
    city: string;
  } | undefined;
  visitor?: {
    id: string;
    phone: string;
    name: string | null;
  } | undefined;
}

export interface Cancellation {
  id: string;
  dealId: string;
  initiatedById: string;
  reason: string;
  feeAmountMinor: bigint;
  penaltyAmountMinor: bigint;
  status: string;
  refundStatus: string;
  auditTrail: any[];
  createdAt: Date;
  updatedAt: Date;
  deal?: Deal;
}

export interface UrgentRequirement {
  id: string;
  userId: string;
  propertyType: string;
  budgetMaxMinor: bigint;
  city: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
