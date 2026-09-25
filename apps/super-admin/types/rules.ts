export interface DealRules {
  requireDualPartyAmountConfirmation: boolean;
  requireDualAgreementUpload: boolean;
  autoFlagDiscrepancy: boolean;
  mandatoryAdminReviewBeforeClosure: boolean;
  amountConfirmationWindowHours: number;
  agreementUploadGracePeriodDays: number;
  autoRemoveListingOnDealDone: boolean;
}

export interface CancellationRules {
  userCancellationFeePercent: number; // e.g. 1.5% (configurable 0.5% - 5.0%, discussed 1-2%)
  userFeeMinAmount: number; // minimum floor fee in INR
  userFeeMaxAmount: number; // maximum cap fee in INR (or 0 for no cap)
  brokerCancellationPenaltyType: "fixed" | "percentage";
  brokerCancellationPenaltyValue: number; // e.g. ₹15,000 or 2%
  brokerDisciplinaryStrikePoints: number; // e.g. 1 strike
  allowCancellationBeforeAgreement: boolean;
  allowCancellationAfterAgreement: boolean;
  autoDeductPlatformCollected: boolean;
  autoGenerateExternalInvoice: boolean;
  invoicePaymentDueDays: number;
  standardUserCancellationReasons: string[];
  standardBrokerCancellationReasons: string[];
}

export interface PlatformRulesConfig {
  dealRules: DealRules;
  cancellationRules: CancellationRules;
  updatedAt: string;
  updatedBy: string;
}
