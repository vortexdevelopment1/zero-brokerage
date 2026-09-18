import { simulateNetwork } from "@/lib/api/client";
import { TrendPoint } from "@/types/dashboard";
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
  getUserGrowthReport: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockUserGrowthTrend()),
  getBrokerGrowthReport: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockBrokerActivity()),
  getAgencyGrowthReport: (): Promise<TrendPoint[]> => simulateNetwork(() => agencyGrowthTrend()),
  getPropertyGrowthReport: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockPropertyGrowthTrend()),
  getRevenueReport: (): Promise<TrendPoint[]> => simulateNetwork(() => getMockRevenueTrend()),
  getSubscriptionActivityReport: (): Promise<TrendPoint[]> => simulateNetwork(() => subscriptionActivityTrend()),
  getDealClosureReport: (): Promise<TrendPoint[]> => simulateNetwork(() => dealClosureActivity()),
};
