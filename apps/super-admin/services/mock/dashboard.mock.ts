import { DashboardStats, RecentActivityFeed, TrendPoint, DistributionSlice } from "@/types/dashboard";
import { mulberry32, randInt, daysAgoISO, fullName, pick } from "./seed";
import { MOCK_USERS } from "./users.mock";
import { MOCK_BROKERS } from "./brokers.mock";
import { MOCK_AGENCIES } from "./agencies.mock";
import { MOCK_PROPERTIES } from "./properties.mock";
import { MOCK_SUBSCRIPTIONS, MOCK_TRANSACTIONS } from "./revenue.mock";
import { MOCK_URGENT_REQUIREMENTS } from "./urgentRequirements.mock";

export function getMockDashboardStats(): DashboardStats {
  return {
    totalUsers: MOCK_USERS.length * 41, // scaled to look like a live platform
    totalBrokers: MOCK_BROKERS.length * 9,
    totalAgencies: MOCK_AGENCIES.length * 6,
    totalProperties: MOCK_PROPERTIES.length * 12,
    pendingApprovals: MOCK_PROPERTIES.filter((p) => p.status === "pending").length * 12,
    activeSubscriptions: MOCK_SUBSCRIPTIONS.filter((s) => s.status === "active").length * 8,
    totalRevenue: MOCK_TRANSACTIONS.filter((t) => t.status === "success").reduce((a, b) => a + b.amount, 0) * 3,
    urgentRequirements: MOCK_URGENT_REQUIREMENTS.filter((u) => u.status === "new").length * 3,
    deltas: {
      totalUsers: 4.8,
      totalBrokers: 2.1,
      totalAgencies: 6.4,
      totalProperties: 3.3,
      pendingApprovals: -1.9,
      activeSubscriptions: 7.2,
      totalRevenue: 9.6,
      urgentRequirements: 12.4,
    },
  };
}

export function getMockUserGrowthTrend(): TrendPoint[] {
  const rng = mulberry32(4242);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  let base = 3200;
  return months.map((m) => {
    base += randInt(rng, 380, 920);
    return { label: m, value: base };
  });
}

export function getMockPropertyGrowthTrend(): TrendPoint[] {
  const rng = mulberry32(5252);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  let base = 1400;
  return months.map((m) => {
    base += randInt(rng, 140, 420);
    return { label: m, value: base };
  });
}

export function getMockRevenueTrend(): TrendPoint[] {
  const rng = mulberry32(6262);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  let base = 820000;
  return months.map((m) => {
    base += randInt(rng, 60000, 240000);
    return { label: m, value: base };
  });
}

export function getMockSubscriptionDistribution(): DistributionSlice[] {
  const tiers = ["Micro-Pass", "Starter", "Pro Seeker", "Investor Pass", "VIP Concierge"];
  const rng = mulberry32(7272);
  return tiers.map((t) => ({ label: t, value: randInt(rng, 8, 38) }));
}

export function getMockBrokerActivity(): TrendPoint[] {
  const rng = mulberry32(8282);
  const weeks = ["W1", "W2", "W3", "W4", "W5", "W6"];
  return weeks.map((w) => ({ label: w, value: randInt(rng, 60, 260) }));
}

export function getMockRecentActivity(): RecentActivityFeed {
  const rng = mulberry32(9292);
  return {
    recentUsers: Array.from({ length: 5 }, (_, i) => ({
      id: `USR-RA-${i}`,
      name: fullName(rng),
      detail: pick(rng, ["Signed up via mobile app", "Upgraded to Pro Seeker", "Completed KYC verification"]),
      date: daysAgoISO(rng, 5),
    })),
    recentListings: Array.from({ length: 5 }, (_, i) => ({
      id: `PL-RA-${i}`,
      title: pick(rng, MOCK_PROPERTIES).title,
      detail: pick(rng, ["Submitted for approval", "Published live", "Boosted listing activated"]),
      date: daysAgoISO(rng, 5),
    })),
    pendingApprovals: MOCK_PROPERTIES.filter((p) => p.status === "pending").slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      type: p.category,
      date: p.createdAt,
    })),
    recentTransactions: MOCK_TRANSACTIONS.slice(0, 5).map((t) => ({
      id: t.id,
      entity: t.entity,
      amount: t.amount,
      date: t.date,
    })),
    urgentRequirements: MOCK_URGENT_REQUIREMENTS.filter((u) => u.status === "new").slice(0, 5).map((u) => ({
      id: u.id,
      user: u.user,
      location: u.location,
      date: u.flaggedAt,
    })),
  };
}
