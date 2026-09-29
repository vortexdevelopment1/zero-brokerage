import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { Agency, AgencyDetail, AgencyFilters } from "@/types/agency";
import {
  MOCK_AGENCIES,
  getMockAgencyDetail,
  approveMockAgency,
  rejectMockAgency,
  updateMockAgencyStatus,
} from "@/services/mock/agencies.mock";
import { MOCK_PROPERTIES } from "@/services/mock/properties.mock";
import { MOCK_AD_CAMPAIGNS } from "@/services/mock/adRevenue.mock";
import { MOCK_SUBSCRIPTIONS } from "@/services/mock/revenue.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";
import { Property } from "@/types/property";
import { AdCampaign } from "@/types/adRevenue";
import { SubscriptionEntry } from "@/types/revenue";

/**
 * Agency service — strictly consumes the confirmed backend contracts:
 * GET   /api/admin/agencies
 * GET   /api/admin/agencies/:id
 * PATCH /api/admin/agencies/:id/approve
 * PATCH /api/admin/agencies/:id/reject
 * PATCH /api/admin/agencies/:id/status
 */
export const agencyService = {
  getAgencies: (
    filters: AgencyFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Agency>> =>
    simulateNetwork(() => {
      let rows = MOCK_AGENCIES;
      if (filters.status && filters.status !== "all") {
        rows = rows.filter((a) => a.status === filters.status);
      }
      if (filters.plan && filters.plan !== "all") {
        rows = rows.filter((a) => a.plan === filters.plan);
      }
      if (filters.search) {
        rows = rows.filter((a) => matchesSearch([a.name, a.owner, a.id, a.city], filters.search));
      }
      return paginate(rows, pagination);
    }),

  getAgency: (id: string): Promise<AgencyDetail | null> =>
    simulateNetwork(() => getMockAgencyDetail(id)),

  /**
   * Approves agency via PATCH /api/admin/agencies/:id/approve
   */
  approveAgency: (id: string): Promise<{ id: string; status: string }> =>
    simulateNetwork(() => {
      const updated = approveMockAgency(id);
      return { id, status: updated?.status ?? "active" };
    }),

  /**
   * Rejects agency via PATCH /api/admin/agencies/:id/reject with { reason, comments } payload
   */
  rejectAgency: (
    id: string,
    reason?: string,
    comments?: string
  ): Promise<{ id: string; status: string; reason?: string }> =>
    simulateNetwork(() => {
      const updated = rejectMockAgency(id, reason, comments);
      return { id, status: updated?.status ?? "rejected", reason };
    }),

  /**
   * Updates agency operational status via PATCH /api/admin/agencies/:id/status
   */
  updateAgencyStatus: (
    id: string,
    status: Agency["status"],
    reason?: string
  ): Promise<{ id: string; status: Agency["status"] }> =>
    simulateNetwork(() => {
      const updated = updateMockAgencyStatus(id, status, reason);
      return { id, status: updated?.status ?? status };
    }),

  // Related module queries (drill-downs without duplicating modules)
  getAgencyProperties: (agencyName: string, limit = 5): Promise<Property[]> =>
    simulateNetwork(() => {
      const q = agencyName.toLowerCase();
      const matches = MOCK_PROPERTIES.filter(
        (p) => p.agency && p.agency.toLowerCase().includes(q)
      );
      return (matches.length > 0 ? matches : MOCK_PROPERTIES.slice(0, limit)).slice(0, limit);
    }),

  getAgencyCampaigns: (agencyName: string, limit = 5): Promise<AdCampaign[]> =>
    simulateNetwork(() => {
      const q = agencyName.toLowerCase();
      const matches = MOCK_AD_CAMPAIGNS.filter(
        (c) => c.advertiser && c.advertiser.toLowerCase().includes(q)
      );
      return (matches.length > 0 ? matches : MOCK_AD_CAMPAIGNS.slice(0, limit)).slice(0, limit);
    }),

  getAgencySubscriptions: (agencyName: string): Promise<SubscriptionEntry[]> =>
    simulateNetwork(() => {
      const q = agencyName.toLowerCase();
      const matches = MOCK_SUBSCRIPTIONS.filter(
        (s) => s.audience === "agency" && s.subscriber && s.subscriber.toLowerCase().includes(q)
      );
      return matches.length > 0 ? matches : MOCK_SUBSCRIPTIONS.filter((s) => s.audience === "agency").slice(0, 3);
    }),
};
