import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { UrgentRequirement, UrgentRequirementStatus } from "@/types/urgentRequirement";
import { MOCK_URGENT_REQUIREMENTS } from "@/services/mock/urgentRequirements.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * Urgent Requirement service. The detection algorithm (Redis search-velocity
 * tracking, month-end window) runs entirely in the backend per SOW §4.6 —
 * this service only reads the resulting flags. Proposed contract:
 * GET /api/admin/urgent-requirements · PATCH /api/admin/urgent-requirements/:id/status
 */
export const urgentRequirementService = {
  getUrgentRequirements: (
    filters: { search?: string; status?: UrgentRequirementStatus | "all" } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<UrgentRequirement>> =>
    simulateNetwork(() => {
      let rows = MOCK_URGENT_REQUIREMENTS;
      if (filters.status && filters.status !== "all") rows = rows.filter((u) => u.status === filters.status);
      if (filters.search) rows = rows.filter((u) => matchesSearch([u.user, u.location, u.id], filters.search));
      return paginate(rows, pagination);
    }),

  updateStatus: (id: string, status: UrgentRequirementStatus): Promise<{ id: string; status: UrgentRequirementStatus }> =>
    simulateNetwork(() => {
      const item = MOCK_URGENT_REQUIREMENTS.find((u) => u.id === id);
      if (item) item.status = status;
      return { id, status };
    }),
};
