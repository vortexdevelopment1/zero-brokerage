import { simulateNetwork } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { KycApprovalResult, KycRejectionResult, KycVerificationDetail } from "@/types/kyc";
import { getMockBrokerKyc, updateMockBrokerKycStatus } from "@/services/mock/brokers.mock";

/**
 * Broker KYC Service — mock-backed today; proposed backend contract:
 * GET  {apiEndpoints.admin.brokers.kyc(brokerId)}
 * POST {apiEndpoints.admin.brokers.approveKyc(brokerId)}
 * POST {apiEndpoints.admin.brokers.rejectKyc(brokerId)}
 */
export const brokerKycService = {
  getBrokerKyc: (brokerId: string): Promise<KycVerificationDetail | null> =>
    simulateNetwork(() => getMockBrokerKyc(brokerId)),

  approveBrokerKyc: (brokerId: string): Promise<KycApprovalResult> =>
    simulateNetwork(() => {
      const updated = updateMockBrokerKycStatus(brokerId, "verified");
      return {
        success: !!updated,
        entityId: brokerId,
        status: "verified",
        reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
        reviewedBy: updated?.reviewedBy ?? "Super Admin (You)",
      };
    }),

  rejectBrokerKyc: (brokerId: string, reason: string, comments?: string): Promise<KycRejectionResult> =>
    simulateNetwork(() => {
      const updated = updateMockBrokerKycStatus(brokerId, "rejected", reason, comments);
      return {
        success: !!updated,
        entityId: brokerId,
        status: "rejected",
        reason,
        comments,
        reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
        reviewedBy: updated?.reviewedBy ?? "Super Admin (You)",
      };
    }),
};
