import { AdCampaign, AdRevenueOverview, AdCampaignFilters } from "@/types/adRevenue";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { MOCK_AD_CAMPAIGNS, MOCK_AD_REVENUE_OVERVIEW } from "./mock/adRevenue.mock";
import { paginate } from "./mock/paginate";

class AdRevenueService {
  private campaigns: AdCampaign[] = [...MOCK_AD_CAMPAIGNS];

  async getOverview(): Promise<AdRevenueOverview> {
    return { ...MOCK_AD_REVENUE_OVERVIEW };
  }

  async getCampaigns(
    filters: AdCampaignFilters = {},
    params: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResult<AdCampaign>> {
    let result = [...this.campaigns];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.advertiser.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.targetLocation.toLowerCase().includes(q)
      );
    }

    if (filters.type && filters.type !== "all") {
      result = result.filter((c) => c.type === filters.type);
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((c) => c.status === filters.status);
    }

    return paginate(result, params);
  }

  async getCampaign(id: string): Promise<AdCampaign | null> {
    return this.campaigns.find((c) => c.id === id) ?? null;
  }

  async toggleCampaignStatus(id: string): Promise<AdCampaign> {
    const idx = this.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Campaign not found");
    const current = this.campaigns[idx];
    const newStatus = current.status === "active" ? "paused" : "active";
    this.campaigns[idx] = {
      ...current,
      status: newStatus,
    };
    return this.campaigns[idx];
  }
}

export const adRevenueService = new AdRevenueService();
