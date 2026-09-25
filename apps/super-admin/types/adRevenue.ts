export type AdType =
  | "sponsored_listing"
  | "homepage_banner"
  | "geo_targeted";

export type AdStatus = "active" | "scheduled" | "completed" | "paused";

export interface AdCampaign {
  id: string; // e.g. "AD-9041"
  advertiser: string;
  advertiserContact: string;
  type: AdType;
  title: string;
  propertyOrTargetUrl?: string;
  targetLocation: string; // e.g. "Bengaluru - Whitefield & Indiranagar"
  impressions: number;
  clicks: number;
  ctr: number; // percentage
  startDate: string;
  endDate: string;
  amount: number;
  paymentStatus: "paid" | "pending" | "partial";
  status: AdStatus;
  bannerPreviewUrl?: string;
  createdAt: string;
}

export interface AdRevenueOverview {
  totalRevenue: number;
  activeCampaignsCount: number;
  completedCampaignsCount: number;
  averageCtr: number;
  monthlyGrowthRate: number;
  revenueTrend: Array<{
    month: string;
    sponsoredListings: number;
    homepageBanners: number;
    geoTargeted: number;
    total: number;
  }>;
  revenueByType: Array<{
    type: string;
    value: number;
  }>;
}

export interface AdCampaignFilters {
  search?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}
