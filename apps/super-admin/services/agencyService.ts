import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { Agency, AgencyDetail, AgencyFilters } from "@/types/agency";
import { MOCK_AGENCIES, getMockAgencyDetail } from "@/services/mock/agencies.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * Agency service — proposed contract:
 * GET /api/admin/agencies · GET /api/admin/agencies/:id · PATCH .../approve · .../reject · .../status
 */
export const agencyService = {
  getAgencies: (filters: AgencyFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<Agency>> =>
    simulateNetwork(() => {
      let rows = MOCK_AGENCIES;
      if (filters.status && filters.status !== "all") rows = rows.filter((a) => a.status === filters.status);
      if (filters.plan && filters.plan !== "all") rows = rows.filter((a) => a.plan === filters.plan);
      if (filters.search) rows = rows.filter((a) => matchesSearch([a.name, a.owner, a.id], filters.search));
      return paginate(rows, pagination);
    }),

  getAgency: (id: string): Promise<AgencyDetail | null> => simulateNetwork(() => getMockAgencyDetail(id)),

  approveAgency: (id: string): Promise<{ id: string; status: string }> =>
    simulateNetwork(() => {
      const agency = MOCK_AGENCIES.find((a) => a.id === id);
      if (agency) agency.status = "active";
      return { id, status: "active" };
    }),

  rejectAgency: (id: string): Promise<{ id: string; status: string }> =>
    simulateNetwork(() => {
      const agency = MOCK_AGENCIES.find((a) => a.id === id);
      if (agency) agency.status = "rejected";
      return { id, status: "rejected" };
    }),

  updateAgencyStatus: (id: string, status: Agency["status"]): Promise<{ id: string; status: Agency["status"] }> =>
    simulateNetwork(() => {
      const agency = MOCK_AGENCIES.find((a) => a.id === id);
      if (agency) agency.status = status;
      return { id, status };
    }),
};
