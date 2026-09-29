import { simulateNetwork } from "@/lib/api/client";
import { TrendPoint } from "@/types/dashboard";
import { ChartPeriod } from "@/types/common";
import {
  getMockUserGrowthTrend, getMockPropertyGrowthTrend, getMockRevenueTrend, getMockBrokerActivity,
} from "@/services/mock/dashboard.mock";
import { mulberry32, randInt } from "@/services/mock/seed";

/**
 * Report service. Modular by design because final backend report
 * definitions are not finalized yet — each getter is independent so new
 * report categories can be added without reshaping existing ones.
 * Proposed contract: GET /api/admin/reports/*
 */
function agencyGrowthTrend(): TrendPoint[] {
  const rng = mulberry32(9911);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  let base = 210;
  return months.map((m) => {
    base += randInt(rng, 8, 30);
    return { label: m, value: base };
  });
}

function dealClosureActivity(): TrendPoint[] {
  const rng = mulberry32(9922);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  return months.map((m) => ({ label: m, value: randInt(rng, 90, 340) }));
}

function subscriptionActivityTrend(): TrendPoint[] {
  const rng = mulberry32(9933);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  let base = 480;
  return months.map((m) => {
    base += randInt(rng, 30, 110);
    return { label: m, value: base };
  });
}

export const reportService = {
  // PROVISIONAL: Accepts optional ChartPeriod. The backend does not yet support period filtering.
  getUserGrowthReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => getMockUserGrowthTrend()),
  getBrokerGrowthReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => getMockBrokerActivity()),
  getAgencyGrowthReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => agencyGrowthTrend()),
  getPropertyGrowthReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => getMockPropertyGrowthTrend()),
  getRevenueReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => getMockRevenueTrend()),
  getSubscriptionActivityReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => subscriptionActivityTrend()),
  getDealClosureReport: (_period?: ChartPeriod): Promise<TrendPoint[]> => simulateNetwork(() => dealClosureActivity()),
};
