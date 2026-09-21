import { simulateNetwork } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { KycApprovalResult, KycRejectionResult, KycVerificationDetail } from "@/types/kyc";
import { getMockUserKyc, updateMockUserKycStatus } from "@/services/mock/users.mock";

/**
 * User KYC Service — mock-backed today; proposed backend contract:
 * GET  {apiEndpoints.admin.users.kyc(userId)}
 * POST {apiEndpoints.admin.users.approveKyc(userId)}
 * POST {apiEndpoints.admin.users.rejectKyc(userId)}
 */
export const userKycService = {
  getUserKyc: (userId: string): Promise<KycVerificationDetail | null> =>
    simulateNetwork(() => getMockUserKyc(userId)),

  approveUserKyc: (userId: string): Promise<KycApprovalResult> =>
    simulateNetwork(() => {
      const updated = updateMockUserKycStatus(userId, "verified");
      return {
        success: !!updated,
        entityId: userId,
        status: "verified",
        reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
        reviewedBy: updated?.reviewedBy ?? "Super Admin (You)",
      };
    }),

  rejectUserKyc: (userId: string, reason: string, comments?: string): Promise<KycRejectionResult> =>
    simulateNetwork(() => {
      const updated = updateMockUserKycStatus(userId, "rejected", reason, comments);
      return {
        success: !!updated,
        entityId: userId,
        status: "rejected",
        reason,
        comments,
        reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
        reviewedBy: updated?.reviewedBy ?? "Super Admin (You)",
      };
    }),
};
