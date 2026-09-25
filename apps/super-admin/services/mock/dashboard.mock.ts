import {
  DashboardStats,
  RecentActivityFeed,
  TrendPoint,
  DistributionSlice,
  DealPipelineStageCount,
  RevenueStreamSummary,
} from "@/types/dashboard";
import { mulberry32, randInt, daysAgoISO, fullName, pick } from "./seed";
import { MOCK_USERS } from "./users.mock";
import { MOCK_BROKERS } from "./brokers.mock";
import { MOCK_AGENCIES } from "./agencies.mock";
import { MOCK_PROPERTIES } from "./properties.mock";
import {
  MOCK_SUBSCRIPTIONS,
  MOCK_COMMISSIONS,
  MOCK_MICRO_TRANSACTIONS,
  MOCK_TRANSACTIONS,
} from "./revenue.mock";
import { MOCK_URGENT_REQUIREMENTS } from "./urgentRequirements.mock";
import { MOCK_DEALS } from "./deals.mock";
import { MOCK_CANCELLATIONS } from "./cancellations.mock";
import { MOCK_AD_CAMPAIGNS, MOCK_AD_REVENUE_OVERVIEW } from "./adRevenue.mock";
import { MOCK_FURNITURE_PACKAGES, MOCK_FURNITURE_ASSETS } from "./furniture.mock";

export function getMockDashboardStats(): DashboardStats {
  const propertyApprovals = MOCK_PROPERTIES.filter((p) => p.status === "pending").length;
  const brokerKycApprovals = MOCK_BROKERS.filter(
    (b) => b.kycStatus === "pending_review" || b.verification === "pending"
  ).length;
  const userKycApprovals = MOCK_USERS.filter(
    (u) => u.kycStatus === "pending_review" || u.verification === "pending"
  ).length;

  const subscriptionRev = MOCK_SUBSCRIPTIONS.filter((s) => s.paymentStatus === "success").reduce(
    (a, b) => a + b.revenue,
    0
  );
  const commissionRev = MOCK_COMMISSIONS.reduce((a, b) => a + b.platformCommission, 0);
  const microTxnRev = MOCK_MICRO_TRANSACTIONS.filter((m) => m.paymentStatus === "success").reduce(
    (a, b) => a + b.amount,
    0
  );
  const adRev = MOCK_AD_REVENUE_OVERVIEW.totalRevenue;
  const cancellationRev = MOCK_CANCELLATIONS.filter(
    (c) => c.status === "cancelled" || c.status === "approved"
  ).reduce((a, b) => a + b.cancellationFeeAmount + (b.brokerPenaltyAmount ?? 0), 0);

  const totalPlatformRevenue = subscriptionRev + commissionRev + microTxnRev + adRev + cancellationRev;

  const totalDeals = MOCK_DEALS.length;
  const activeDeals = MOCK_DEALS.filter(
    (d) => d.stage !== "DEAL_DONE" && d.stage !== "DEAL_CANCELLED"
  ).length;
  const grossDealValue = MOCK_DEALS.reduce((acc, d) => acc + d.dealAmount, 0);

  const pendingAgreements = MOCK_DEALS.filter(
    (d) =>
      d.reviewStatus === "pending_review" ||
      d.agreementStatus === "under_admin_review" ||
      d.agreementStatus === "both_uploaded"
  ).length;

  const agreementMismatches = MOCK_DEALS.filter(
    (d) =>
      d.agreementStatus === "mismatch_flagged" ||
      d.reviewStatus === "changes_requested" ||
      Boolean(d.mismatchReason)
  ).length;

  const cancelledDealsCount = MOCK_CANCELLATIONS.filter(
    (c) => c.status === "cancelled" || c.status === "approved"
  ).length;
  const pendingCancellationActions = MOCK_CANCELLATIONS.filter(
    (c) => c.status === "requested" || c.status === "under_review" || c.status === "fee_pending"
  ).length;

  return {
    totalUsers: MOCK_USERS.length * 41,
    totalBrokers: MOCK_BROKERS.length * 9,
    totalAgencies: MOCK_AGENCIES.length * 6,
    totalProperties: MOCK_PROPERTIES.length * 12,
    pendingApprovals: propertyApprovals + brokerKycApprovals + userKycApprovals,
    activeSubscriptions: MOCK_SUBSCRIPTIONS.filter((s) => s.status === "active").length * 8,
    totalRevenue: totalPlatformRevenue,
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
      totalDeals: 14.2,
      grossDealValue: 18.6,
    },
    // Deals & GMV
    totalDeals,
    activeDeals,
    grossDealValue,
    // Approvals breakdown
    approvalsBreakdown: {
      properties: propertyApprovals,
      brokerKyc: brokerKycApprovals,
      userKyc: userKycApprovals,
    },
    // Agreements
    pendingAgreements,
    agreementMismatches,
    // Cancellations
    cancelledDealsCount,
    cancellationRevenue: cancellationRev,
    pendingCancellationActions,
    // Ad Campaigns
    adRevenue: adRev,
    activeAdCampaigns: MOCK_AD_CAMPAIGNS.filter((c) => c.status === "active").length,
    adImpressions: MOCK_AD_CAMPAIGNS.reduce((acc, c) => acc + c.impressions, 0),
    adAverageCtr: MOCK_AD_REVENUE_OVERVIEW.averageCtr,
    // Furniture / Commercial Assets
    furniturePackagesCount: MOCK_FURNITURE_PACKAGES.length,
    furnitureAssetsCount: MOCK_FURNITURE_ASSETS.length,
  };
}

export function getMockDealPipeline(): DealPipelineStageCount[] {
  const stages: Array<{ key: string; label: string; filter: (d: (typeof MOCK_DEALS)[0]) => boolean }> = [
    { key: "NEGOTIATION", label: "Negotiation", filter: (d) => d.stage === "NEGOTIATION" },
    {
      key: "AMOUNT_CONFIRMED",
      label: "Amount Confirmed",
      filter: (d) => d.stage === "AMOUNT_CONFIRMED" || d.stage === "DEAL_INITIATED",
    },
    {
      key: "AGREEMENT_PENDING",
      label: "Agreement Pending",
      filter: (d) =>
        d.stage === "AGREEMENT_PENDING" ||
        d.stage === "AGREEMENT_UPLOADED_BY_USER" ||
        d.stage === "AGREEMENT_UPLOADED_BY_BROKER",
    },
    {
      key: "AGREEMENT_COMPLETED",
      label: "Agreement Approved",
      filter: (d) => d.stage === "AGREEMENT_COMPLETED",
    },
    { key: "DEAL_DONE", label: "Deal Closed", filter: (d) => d.stage === "DEAL_DONE" },
  ];

  return stages.map((s) => {
    const matching = MOCK_DEALS.filter(s.filter);
    return {
      stage: s.key,
      label: s.label,
      count: matching.length,
      value: matching.reduce((sum, d) => sum + d.dealAmount, 0),
    };
  });
}

export function getMockRevenueStreams(): RevenueStreamSummary[] {
  const subscriptionRev = MOCK_SUBSCRIPTIONS.filter((s) => s.paymentStatus === "success").reduce(
    (a, b) => a + b.revenue,
    0
  );
  const commissionRev = MOCK_COMMISSIONS.reduce((a, b) => a + b.platformCommission, 0);
  const microTxnRev = MOCK_MICRO_TRANSACTIONS.filter((m) => m.paymentStatus === "success").reduce(
    (a, b) => a + b.amount,
    0
  );
  const adRev = MOCK_AD_REVENUE_OVERVIEW.totalRevenue;
  const cancellationRev = MOCK_CANCELLATIONS.filter(
    (c) => c.status === "cancelled" || c.status === "approved"
  ).reduce((a, b) => a + b.cancellationFeeAmount + (b.brokerPenaltyAmount ?? 0), 0);

  const total = subscriptionRev + commissionRev + microTxnRev + adRev + cancellationRev;

  const streams = [
    { stream: "subscriptions", label: "Subscriptions", amount: subscriptionRev, href: "/admin/revenue/subscriptions" },
    { stream: "commission", label: "Deal Commission", amount: commissionRev, href: "/admin/revenue/commission" },
    { stream: "micro_transactions", label: "Micro-Transactions", amount: microTxnRev, href: "/admin/revenue/micro-transactions" },
    { stream: "ad_revenue", label: "Ad Campaigns", amount: adRev, href: "/admin/revenue/ads" },
    { stream: "cancellation_fees", label: "Cancellation Fees", amount: cancellationRev, href: "/admin/revenue/cancellations" },
  ];

  return streams.map((s) => ({
    ...s,
    sharePercent: total > 0 ? Math.round((s.amount / total) * 1000) / 10 : 0,
  }));
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
    recentDeals: MOCK_DEALS.slice(0, 5).map((d) => ({
      id: d.id,
      propertyTitle: d.property.title,
      buyerName: d.buyer.name,
      brokerName: d.broker.name,
      amount: d.dealAmount,
      stage: d.stage,
      date: d.createdAt,
    })),
    urgentRequirements: MOCK_URGENT_REQUIREMENTS.filter((u) => u.status === "new").slice(0, 5).map((u) => ({
      id: u.id,
      user: u.user,
      location: u.location,
      date: u.flaggedAt,
    })),
  };
}
