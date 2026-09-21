import { simulateNetwork } from "@/lib/api/client";
import { DashboardStats, RecentActivityFeed, TrendPoint, DistributionSlice } from "@/types/dashboard";
import {
  getMockDashboardStats, getMockUserGrowthTrend, getMockPropertyGrowthTrend,
  getMockRevenueTrend, getMockSubscriptionDistribution, getMockBrokerActivity,
  getMockRecentActivity,
} from "@/services/mock/dashboard.mock";

/**
 * Dashboard service. UI components call these functions and never touch
 * mock data or apiClient directly — when the Fastify backend is ready,
 * swap each body for `return apiClient.get(apiEndpoints.admin.dashboard.stats)`
 * (etc.) and no component changes are required.
 */
export const dashboardService = {
  getDashboardStats: (): Promise<DashboardStats> => simulateNetwork(() => getMockDashboardStats()),
  getUserGrowth: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockUserGrowthTrend()),
  getPropertyGrowth: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockPropertyGrowthTrend()),
  getRevenueTrend: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockRevenueTrend()),
  getSubscriptionDistribution: (): Promise<DistributionSlice[]> =>
    simulateNetwork(() => getMockSubscriptionDistribution()),
  getBrokerActivity: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockBrokerActivity()),
  getRecentActivity: (): Promise<RecentActivityFeed> => simulateNetwork(() => getMockRecentActivity()),
};
