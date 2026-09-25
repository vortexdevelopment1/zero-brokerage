export interface ApprovalsBreakdown {
  properties: number;
  brokerKyc: number;
  userKyc: number;
}

export interface DealPipelineStageCount {
  stage: string;
  label: string;
  count: number;
  value: number;
}

export interface RevenueStreamSummary {
  stream: string;
  label: string;
  amount: number;
  sharePercent: number;
  href: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalBrokers: number;
  totalAgencies: number;
  totalProperties: number;
  pendingApprovals: number;
  activeSubscriptions: number;
  totalRevenue: number;
  urgentRequirements: number;
  deltas: Partial<Record<string, number>>;

  // Deals & GMV
  totalDeals: number;
  activeDeals: number;
  grossDealValue: number; // GMV: Gross real estate consideration transacted

  // Approvals & KYC breakdown
  approvalsBreakdown: ApprovalsBreakdown;

  // Agreements & Admin attention
  pendingAgreements: number;
  agreementMismatches: number;

  // Cancellations
  cancelledDealsCount: number;
  cancellationRevenue: number; // Net platform fee revenue from cancellations
  pendingCancellationActions: number;

  // Ad Campaigns & Performance
  adRevenue: number;
  activeAdCampaigns: number;
  adImpressions: number;
  adAverageCtr: number;

  // Furniture / Commercial Assets
  furniturePackagesCount: number;
  furnitureAssetsCount: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface DistributionSlice {
  label: string;
  value: number;
}

export interface RecentDealItem {
  id: string;
  propertyTitle: string;
  buyerName: string;
  brokerName: string;
  amount: number;
  stage: string;
  date: string;
}

export interface RecentActivityFeed {
  recentUsers: { id: string; name: string; detail: string; date: string }[];
  recentListings: { id: string; title: string; detail: string; date: string }[];
  pendingApprovals: { id: string; title: string; type: string; date: string }[];
  recentTransactions: { id: string; entity: string; amount: number; date: string }[];
  recentDeals: RecentDealItem[];
  urgentRequirements: { id: string; user: string; location: string; date: string }[];
}
