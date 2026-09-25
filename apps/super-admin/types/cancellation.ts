export type CancellationInitiator = "buyer" | "broker" | "agency";

export type CancellationStatus =
  | "requested"
  | "under_review"
  | "fee_pending"
  | "payment_pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type RefundPaymentStatus =
  | "auto_deducted"
  | "invoice_pending"
  | "invoice_paid"
  | "refund_processed"
  | "waived";

export interface CancellationAuditLog {
  timestamp: string;
  actor: string;
  action: string;
  notes?: string;
}

export interface CancellationRecord {
  id: string; // e.g. "CN-1042"
  dealId: string;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  broker: {
    id: string;
    name: string;
    phone: string;
  };
  agency: {
    id: string;
    name: string;
  } | null;
  property: {
    id: string;
    title: string;
    locality: string;
    city: string;
  };
  dealAmount: number;
  initiatedBy: CancellationInitiator;
  reason: string;
  notes?: string;
  requestedAt: string;
  cancellationFeePercent: number; // e.g. 1.0% or 1.5%
  cancellationFeeAmount: number; // e.g. ₹50,000
  brokerPenaltyAmount?: number; // penalty if broker cancelled
  paymentMode: "platform_collected" | "external_transaction";
  heldDepositAmount: number; // deposit on hand
  finalSettlementAmount: number; // net refund or net invoice payable
  refundPaymentStatus: RefundPaymentStatus;
  status: CancellationStatus;
  agreementStatusAtCancellation: string;
  invoiceNumber?: string;
  auditTrail: CancellationAuditLog[];
}

export interface CancellationFilters {
  search?: string;
  status?: string;
  initiatedBy?: string;
  paymentMode?: string;
  dateFrom?: string;
  dateTo?: string;
}
