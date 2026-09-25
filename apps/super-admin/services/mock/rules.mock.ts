import { PlatformRulesConfig } from "@/types/rules";

export const DEFAULT_PLATFORM_RULES: PlatformRulesConfig = {
  dealRules: {
    requireDualPartyAmountConfirmation: true,
    requireDualAgreementUpload: true,
    autoFlagDiscrepancy: true,
    mandatoryAdminReviewBeforeClosure: true,
    amountConfirmationWindowHours: 48,
    agreementUploadGracePeriodDays: 7,
    autoRemoveListingOnDealDone: true,
  },
  cancellationRules: {
    userCancellationFeePercent: 1.5, // 1–2% configurable requirement
    userFeeMinAmount: 5000,
    userFeeMaxAmount: 200000,
    brokerCancellationPenaltyType: "fixed",
    brokerCancellationPenaltyValue: 25000,
    brokerDisciplinaryStrikePoints: 1,
    allowCancellationBeforeAgreement: true,
    allowCancellationAfterAgreement: false,
    autoDeductPlatformCollected: true,
    autoGenerateExternalInvoice: true,
    invoicePaymentDueDays: 7,
    standardUserCancellationReasons: [
      "Loan / financing rejected by lending institution",
      "Corporate transfer or relocation cancelled",
      "Discrepancy found during physical premise verification",
      "Mutual agreement with seller to terminate",
      "Personal unforeseen emergency",
    ],
    standardBrokerCancellationReasons: [
      "Seller withdrew listing mandate from market",
      "Encumbrance / title defect discovered in legal search",
      "Seller refused agreed commercial terms",
    ],
  },
  updatedAt: new Date().toISOString(),
  updatedBy: "Super Admin (System Default)",
};
