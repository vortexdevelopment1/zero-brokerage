import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import {
  CommissionEntry,
  SubscriptionEntry,
  MicroTransactionEntry,
  TransactionEntry,
  RevenueOverview,
  CancellationRevenueEntry,
} from "@/types/revenue";
import {
  MOCK_COMMISSIONS,
  MOCK_SUBSCRIPTIONS,
  MOCK_MICRO_TRANSACTIONS,
  MOCK_TRANSACTIONS,
} from "@/services/mock/revenue.mock";
import { MOCK_AD_REVENUE_OVERVIEW } from "@/services/mock/adRevenue.mock";
import { MOCK_CANCELLATIONS } from "@/services/mock/cancellations.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * Revenue service. Distinct monetization streams are kept separate per
 * the BRD/SOW (subscriptions, commission, micro-transactions, ad revenue,
 * and cancellation fees) rather than folded into one generic table.
 * Proposed contract: GET /api/admin/revenue/{overview,subscriptions,commission,micro-transactions,transactions,ads,cancellations}
 */
export const revenueService = {
  getOverview: (): Promise<RevenueOverview> =>
    simulateNetwork(() => {
      const subscriptionRevenue = MOCK_SUBSCRIPTIONS.filter((s) => s.paymentStatus === "success").reduce(
        (a, b) => a + b.revenue,
        0
      );
      const commissionRevenue = MOCK_COMMISSIONS.reduce((a, b) => a + b.platformCommission, 0);
      const microTransactionRevenue = MOCK_MICRO_TRANSACTIONS.filter((m) => m.paymentStatus === "success").reduce(
        (a, b) => a + b.amount,
        0
      );
      const adRevenue = MOCK_AD_REVENUE_OVERVIEW.totalRevenue;
      const cancellationRevenue = MOCK_CANCELLATIONS.filter(
        (c) => c.status === "cancelled" || c.status === "approved"
      ).reduce((a, b) => a + b.cancellationFeeAmount + (b.brokerPenaltyAmount ?? 0), 0);

      const totalRevenue =
        subscriptionRevenue +
        commissionRevenue +
        microTransactionRevenue +
        adRevenue +
        cancellationRevenue;

      const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
      let base = totalRevenue * 0.6;
      const revenueTrend = months.map((m) => {
        base += totalRevenue * 0.08;
        return { month: m, revenue: Math.round(base) };
      });
      return {
        totalRevenue,
        subscriptionRevenue,
        commissionRevenue,
        microTransactionRevenue,
        adRevenue,
        cancellationRevenue,
        revenueTrend,
        revenueBySource: [
          { source: "Subscriptions", value: subscriptionRevenue },
          { source: "Commission", value: commissionRevenue },
          { source: "Micro-Transactions", value: microTransactionRevenue },
          { source: "Ad Revenue", value: adRevenue },
          { source: "Cancellation Fees", value: cancellationRevenue },
        ],
      };
    }),

  getSubscriptions: (
    filters: { search?: string; audience?: "user" | "agency" | "all"; status?: "active" | "expired" | "all" } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<SubscriptionEntry>> =>
    simulateNetwork(() => {
      let rows = MOCK_SUBSCRIPTIONS;
      if (filters.audience && filters.audience !== "all") rows = rows.filter((s) => s.audience === filters.audience);
      if (filters.status && filters.status !== "all") rows = rows.filter((s) => s.status === filters.status);
      if (filters.search) rows = rows.filter((s) => matchesSearch([s.subscriber, s.plan, s.id], filters.search));
      return paginate(rows, pagination);
    }),

  getCommission: (
    filters: { search?: string; status?: string; broker?: string } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<CommissionEntry>> =>
    simulateNetwork(() => {
      let rows = MOCK_COMMISSIONS;
      if (filters.status && filters.status !== "all") rows = rows.filter((c) => c.payoutStatus === filters.status);
      if (filters.search)
        rows = rows.filter((c) => matchesSearch([c.property, c.broker, c.dealId, c.id], filters.search));
      return paginate(rows, pagination);
    }),

  getMicroTransactions: (
    filters: { search?: string } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<MicroTransactionEntry>> =>
    simulateNetwork(() => {
      let rows = MOCK_MICRO_TRANSACTIONS;
      if (filters.search) rows = rows.filter((m) => matchesSearch([m.user, m.id], filters.search));
      return paginate(rows, pagination);
    }),

  getTransactions: (
    filters: { search?: string; type?: string } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<TransactionEntry>> =>
    simulateNetwork(() => {
      let rows = MOCK_TRANSACTIONS;
      if (filters.type && filters.type !== "all") rows = rows.filter((t) => t.type === filters.type);
      if (filters.search) rows = rows.filter((t) => matchesSearch([t.entity, t.id], filters.search));
      return paginate(rows, pagination);
    }),

  getCancellationRevenue: (
    filters: { search?: string; paymentMode?: string } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<CancellationRevenueEntry>> =>
    simulateNetwork(() => {
      let rows: CancellationRevenueEntry[] = MOCK_CANCELLATIONS.map((c) => ({
        id: c.id,
        dealId: c.dealId,
        property: `${c.property.title}, ${c.property.locality}`,
        initiator: c.initiatedBy,
        dealValue: c.dealAmount,
        cancellationFeePercent: c.cancellationFeePercent,
        cancellationFeeAmount: c.cancellationFeeAmount,
        brokerPenaltyAmount: c.brokerPenaltyAmount,
        paymentMode: c.paymentMode,
        refundPaymentStatus: c.refundPaymentStatus,
        date: c.requestedAt,
      }));
      if (filters.paymentMode && filters.paymentMode !== "all") {
        rows = rows.filter((r) => r.paymentMode === filters.paymentMode);
      }
      if (filters.search) {
        rows = rows.filter((r) => matchesSearch([r.property, r.dealId, r.id], filters.search));
      }
      return paginate(rows, pagination);
    }),
};
