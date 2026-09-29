import { simulateNetwork } from "@/lib/api/client";
import {
  DashboardStats,
  RecentActivityFeed,
  TrendPoint,
  DistributionSlice,
  DealPipelineStageCount,
  RevenueStreamSummary,
} from "@/types/dashboard";
import {
  getMockDashboardStats,
  getMockUserGrowthTrend,
  getMockPropertyGrowthTrend,
  getMockRevenueTrend,
  getMockSubscriptionDistribution,
  getMockBrokerActivity,
  getMockRecentActivity,
  getMockDealPipeline,
  getMockRevenueStreams,
} from "@/services/mock/dashboard.mock";

import { ChartPeriod } from "@/types/common";

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
  // PROVISIONAL: Accepts optional ChartPeriod. The backend does not yet support period filtering.
  getRevenueTrend: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => getMockRevenueTrend()),
  getSubscriptionDistribution: (): Promise<DistributionSlice[]> =>
    simulateNetwork(() => getMockSubscriptionDistribution()),
  getBrokerActivity: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockBrokerActivity()),
  getRecentActivity: (): Promise<RecentActivityFeed> => simulateNetwork(() => getMockRecentActivity()),
  getDealPipeline: (): Promise<DealPipelineStageCount[]> => simulateNetwork(() => getMockDealPipeline()),
  // PROVISIONAL: Accepts optional ChartPeriod. The backend does not yet support period filtering.
  getRevenueStreams: (_period?: ChartPeriod): Promise<RevenueStreamSummary[]> => simulateNetwork(() => getMockRevenueStreams()),
};

