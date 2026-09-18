import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { Visit, VisitFilters } from "@/types/visit";
import { MOCK_VISITS } from "@/services/mock/visits.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * Visit service — proposed contract:
 * GET /api/admin/visits · GET /api/admin/visits/:id · PATCH /api/admin/visits/:id/status
 */
export const visitService = {
  getVisits: (filters: VisitFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<Visit>> =>
    simulateNetwork(() => {
      let rows = MOCK_VISITS;
      if (filters.status && filters.status !== "all") rows = rows.filter((v) => v.status === filters.status);
      if (filters.search) rows = rows.filter((v) => matchesSearch([v.user, v.broker, v.property, v.id], filters.search));
      return paginate(rows, pagination);
    }),

  getVisit: (id: string): Promise<Visit | null> => simulateNetwork(() => MOCK_VISITS.find((v) => v.id === id) ?? null),

  updateVisitStatus: (id: string, status: Visit["status"]): Promise<{ id: string; status: Visit["status"] }> =>
    simulateNetwork(() => {
      const visit = MOCK_VISITS.find((v) => v.id === id);
      if (visit) visit.status = status;
      return { id, status };
    }),
};
