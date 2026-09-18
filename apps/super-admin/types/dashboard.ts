export interface DashboardStats {
  totalUsers: number;
  totalBrokers: number;
  totalAgencies: number;
  totalProperties: number;
  pendingApprovals: number;
  activeSubscriptions: number;
  totalRevenue: number;
  urgentRequirements: number;
  deltas: Partial<Record<
    | "totalUsers"
    | "totalBrokers"
    | "totalAgencies"
    | "totalProperties"
    | "pendingApprovals"
    | "activeSubscriptions"
    | "totalRevenue"
    | "urgentRequirements",
    number
  >>;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface DistributionSlice {
  label: string;
  value: number;
}

export interface RecentActivityFeed {
  recentUsers: { id: string; name: string; detail: string; date: string }[];
  recentListings: { id: string; title: string; detail: string; date: string }[];
  pendingApprovals: { id: string; title: string; type: string; date: string }[];
  recentTransactions: { id: string; entity: string; amount: number; date: string }[];
  urgentRequirements: { id: string; user: string; location: string; date: string }[];
}
