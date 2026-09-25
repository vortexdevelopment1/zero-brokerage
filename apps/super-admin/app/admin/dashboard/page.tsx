"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Boxes,
  ClipboardCheck,
  CreditCard,
  Wallet,
  ShieldAlert,
  Handshake,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  Receipt,
  Megaphone,
  Sofa,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/ui/ChartCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { dashboardService } from "@/services/dashboardService";
import {
  DashboardStats,
  RecentActivityFeed,
  TrendPoint,
  DealPipelineStageCount,
  RevenueStreamSummary,
} from "@/types/dashboard";
import { formatCompactNumber, formatCurrencyINR, formatDateTime } from "@/lib/utils/format";
import { ApiStatus } from "@/types/common";

export default function DashboardPage() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<RecentActivityFeed | null>(null);
  const [dealPipeline, setDealPipeline] = useState<DealPipelineStageCount[]>([]);
  const [revenueStreams, setRevenueStreams] = useState<RevenueStreamSummary[]>([]);

  async function load() {
    setStatus("loading");
    try {
      const [s, rt, ra, dp, rs] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRevenueTrend(),
        dashboardService.getRecentActivity(),
        dashboardService.getDealPipeline(),
        dashboardService.getRevenueStreams(),
      ]);
      setStats(s);
      setRevenueTrend(rt);
      setActivity(ra);
      setDealPipeline(dp);
      setRevenueStreams(rs);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (status === "loading" || !stats || !activity) {
    return (
      <>
        <PageHeader title="Dashboard" description="Central overview of the ZeroBroker ecosystem." />
        <LoadingState label="Loading command center dashboard…" />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <PageHeader title="Dashboard" description="Central overview of the ZeroBroker ecosystem." />
        <ErrorState onRetry={load} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Command Center Dashboard"
        description="Comprehensive real-time overview of the ZeroBroker marketplace, deals, revenue, and compliance."
        crumbs={[{ label: "Dashboard" }]}
      />

      {/* ========================================================= */}
      {/* SECTION 1: CORE COMMAND CENTER KPIs                       */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Top 4 Hero KPIs: Deals, GMV, Net Platform Revenue, Pending Approvals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Deals & Lifecycle Volume */}
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-white to-brand-50/30 p-5 shadow-card transition-shadow hover:shadow-popover">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Handshake className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {stats.totalDeals} Total
              </span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Active Deals Pipeline</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{stats.activeDeals} Active</p>
            <p className="mt-1 text-[11px] text-ink-500">
              {stats.totalDeals - stats.activeDeals} closed/archived deals
            </p>
          </div>

          {/* GMV (Gross Deal Value) */}
          <div className="rounded-2xl border border-accent-200 bg-gradient-to-br from-white to-accent-50/20 p-5 shadow-card transition-shadow hover:shadow-popover">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/15 text-accent-600">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-800">
                Gross Consideration
              </span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Gross Deal Value (GMV)</p>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
              {formatCurrencyINR(stats.grossDealValue)}
            </p>
            <p className="mt-1 text-[11px] text-ink-400">
              Total transaction value processed · <strong className="font-medium text-ink-600">Not platform revenue</strong>
            </p>
          </div>

          {/* Platform Revenue */}
          <div className="rounded-2xl border border-success-200 bg-gradient-to-br from-white to-success-50/30 p-5 shadow-card transition-shadow hover:shadow-popover">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 text-success-600">
                <Wallet className="h-5 w-5" strokeWidth={2} />
              </div>
              <Link
                href="/admin/revenue"
                className="inline-flex items-center gap-1 text-xs font-semibold text-success-700 hover:underline"
              >
                Revenue Hub <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Total Platform Revenue</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
              {formatCurrencyINR(stats.totalRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              Subscriptions, commission, ads, micro-txns & fees
            </p>
          </div>

          {/* Unified Pending Approvals with Breakdown */}
          <div className="rounded-2xl border border-warning-200 bg-gradient-to-br from-white to-warning-50/20 p-5 shadow-card transition-shadow hover:shadow-popover">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
                <ClipboardCheck className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-700">
                {stats.pendingApprovals} Total Pending
              </span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Approvals & Compliance</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
              {stats.pendingApprovals} In Queue
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded bg-ink-100 px-1.5 py-0.5 text-ink-700 font-medium">
                Props: {stats.approvalsBreakdown.properties}
              </span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700 font-medium">
                Broker KYC: {stats.approvalsBreakdown.brokerKyc}
              </span>
              <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700 font-medium">
                User KYC: {stats.approvalsBreakdown.userKyc}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Ecosystem Footprint Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-ink-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs">Registered Seekers</span>
              <Users className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900">{formatCompactNumber(stats.totalUsers)}</p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs">Licensed Brokers</span>
              <UserCheck className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900">{formatCompactNumber(stats.totalBrokers)}</p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs">Real Estate Properties</span>
              <Boxes className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900">{formatCompactNumber(stats.totalProperties)}</p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs">Active Subscriptions</span>
              <CreditCard className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900">{formatCompactNumber(stats.activeSubscriptions)}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: OPERATIONAL ATTENTION & COMPLIANCE QUEUE       */}
      {/* ========================================================= */}
      <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning-600" />
              Operational Attention & Action Queue
            </h2>
            <p className="text-xs text-ink-500">
              Actionable tasks requiring administrative verification, legal reviews, or intervention.
            </p>
          </div>
          <span className="text-xs text-ink-400">Real-time status</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Agreement Reviews Pending */}
          <Link
            href="/admin/deals/agreements"
            className="group rounded-xl border border-brand-200 bg-brand-50/40 p-4 transition-all hover:bg-brand-50 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-900">Agreement Reviews</span>
              <FileCheck2 className="h-4 w-4 text-brand-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-brand-700">{stats.pendingAgreements}</p>
            <p className="mt-1 text-xs text-brand-800/80 leading-snug">
              Uploaded deeds awaiting legal consistency checks.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-brand-600 group-hover:gap-1.5 transition-all">
              Review Agreements <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Flagged Document Discrepancies */}
          <Link
            href="/admin/deals/agreements"
            className={`group rounded-xl border p-4 transition-all hover:shadow-sm ${
              stats.agreementMismatches > 0
                ? "border-warning-300 bg-warning-50/60 hover:bg-warning-50"
                : "border-ink-200 bg-ink-50/40 hover:bg-ink-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">Flagged Mismatches</span>
              <AlertTriangle className={`h-4 w-4 ${stats.agreementMismatches > 0 ? "text-warning-600" : "text-ink-400"}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${stats.agreementMismatches > 0 ? "text-warning-700" : "text-ink-700"}`}>
              {stats.agreementMismatches}
            </p>
            <p className="mt-1 text-xs text-ink-600 leading-snug">
              Valuation or signature discrepancies flagged for review.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-warning-700 group-hover:gap-1.5 transition-all">
              Inspect Discrepancies <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Pending KYC Submissions */}
          <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-4 transition-all hover:bg-ink-50 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">Identity KYC Submissions</span>
              <UserCheck className="h-4 w-4 text-ink-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-ink-900">
              {stats.approvalsBreakdown.brokerKyc + stats.approvalsBreakdown.userKyc}
            </p>
            <p className="mt-1 text-xs text-ink-600 leading-snug">
              {stats.approvalsBreakdown.brokerKyc} Brokers · {stats.approvalsBreakdown.userKyc} Users awaiting verification.
            </p>
            <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold">
              <Link href="/admin/brokers" className="text-brand-600 hover:underline">
                Brokers →
              </Link>
              <Link href="/admin/users" className="text-brand-600 hover:underline">
                Users →
              </Link>
            </div>
          </div>

          {/* Cancellation Actions */}
          <Link
            href="/admin/deals/cancellations"
            className="group rounded-xl border border-danger-200 bg-danger-50/40 p-4 transition-all hover:bg-danger-50 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-danger-900">Cancellation Actions</span>
              <Receipt className="h-4 w-4 text-danger-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-danger-700">{stats.pendingCancellationActions}</p>
            <p className="mt-1 text-xs text-danger-800/80 leading-snug">
              Fee deduction / invoice approvals pending execution.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-danger-700 group-hover:gap-1.5 transition-all">
              Manage Cancellations <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 3: DEAL PIPELINE STAGES                           */}
      {/* ========================================================= */}
      <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Deal Pipeline & Transaction Stages</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              Active deal progression through mutual amount confirmation, legal agreement upload, and closing.
            </p>
          </div>
          <Link
            href="/admin/deals"
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
          >
            View All Deals <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {dealPipeline.map((stage, idx) => (
            <div
              key={stage.stage}
              className="rounded-xl border border-ink-200 bg-ink-50/40 p-3.5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-400">STAGE 0{idx + 1}</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                  {stage.count} deals
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-ink-900">{stage.label}</p>
              <p className="mt-1 text-xs font-mono font-medium text-ink-600">
                {formatCurrencyINR(stage.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 4: REVENUE & MONETIZATION STREAMS                 */}
      {/* ========================================================= */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: 6-month Revenue Trend */}
        <ChartCard title="Platform Revenue Trend" subtitle="Consolidated monthly net earnings" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1877BE" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1877BE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompactNumber(v)}
              />
              <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
              <Area type="monotone" dataKey="value" stroke="#1877BE" strokeWidth={2} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Right: Revenue Breakdown by Stream */}
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Revenue by Stream</h3>
                <p className="mt-0.5 text-xs text-ink-500">Platform monetization sources</p>
              </div>
              <Link href="/admin/revenue" className="text-xs font-medium text-brand-600 hover:underline">
                Details
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {revenueStreams.map((s) => (
                <Link
                  key={s.stream}
                  href={s.href}
                  className="group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-ink-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-800 group-hover:text-brand-600 transition-colors">
                      {s.label}
                    </p>
                    <p className="text-[11px] text-ink-400">{s.sharePercent}% share</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink-900 font-mono">{formatCurrencyINR(s.amount)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 p-3 text-[11px] text-ink-500 leading-relaxed">
            <strong>Note:</strong> Cancellation fees are net revenue retained by platform; GMV is excluded from platform earnings.
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 5: SECONDARY SNAPSHOTS: AD CAMPAIGNS & INVENTORY  */}
      {/* ========================================================= */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Ad Campaign Performance */}
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Ad Campaigns</h3>
                  <p className="text-xs text-ink-500">Sponsored listing & banner delivery</p>
                </div>
              </div>
              <Link href="/admin/ad-campaigns" className="text-xs font-medium text-brand-600 hover:underline">
                Manage
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-ink-50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400">Active</span>
                <p className="text-base font-bold text-ink-900">{stats.activeAdCampaigns}</p>
              </div>
              <div className="rounded-lg bg-ink-50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400">Impressions</span>
                <p className="text-base font-bold text-ink-900">{formatCompactNumber(stats.adImpressions)}</p>
              </div>
              <div className="rounded-lg bg-ink-50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400">Avg CTR</span>
                <p className="text-base font-bold text-brand-600">{stats.adAverageCtr}%</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-ink-100 text-xs text-ink-500">
            <span>Total Ad Revenue:</span>
            <strong className="text-ink-900 font-mono">{formatCurrencyINR(stats.adRevenue)}</strong>
          </div>
        </div>

        {/* Cancellation Summary */}
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Cancellation Summary</h3>
                  <p className="text-xs text-ink-500">Deal terminations & penalty fees</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Link href="/admin/revenue/cancellations" className="font-semibold text-brand-600 hover:underline">
                  Revenue
                </Link>
                <span className="text-ink-300">·</span>
                <Link href="/admin/deals/cancellations" className="font-medium text-ink-500 hover:text-ink-800">
                  Operations
                </Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-danger-50/50 p-2.5 border border-danger-100">
                <span className="text-[10px] uppercase text-danger-700">Cancelled Deals</span>
                <p className="text-base font-bold text-danger-900">{stats.cancelledDealsCount}</p>
              </div>
              <div className="rounded-lg bg-success-50/50 p-2.5 border border-success-100">
                <span className="text-[10px] uppercase text-success-700">Fees Collected</span>
                <p className="text-base font-bold text-success-900">{formatCompactNumber(stats.cancellationRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-ink-100 text-xs text-ink-500">
            <span>Pending Resolution:</span>
            <span className="font-semibold text-warning-700">{stats.pendingCancellationActions} actions required</span>
          </div>
        </div>

        {/* Furniture & Commercial Assets */}
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Sofa className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Furniture & Fit-outs</h3>
                  <p className="text-xs text-ink-500">Commercial turnkey workspace assets</p>
                </div>
              </div>
              <Link href="/admin/properties/furniture" className="text-xs font-medium text-brand-600 hover:underline">
                Inventory
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-ink-50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400">Office Packages</span>
                <p className="text-base font-bold text-ink-900">{stats.furniturePackagesCount}</p>
              </div>
              <div className="rounded-lg bg-ink-50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400">Single Assets</span>
                <p className="text-base font-bold text-ink-900">{stats.furnitureAssetsCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-ink-100 text-xs text-ink-500">
            <span>Marketplace Mode:</span>
            <span className="font-medium text-ink-700">Rental & Direct Purchase</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 6: ACTIVITY FEEDS (INCLUDING RECENT DEALS)       */}
      {/* ========================================================= */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Deals Feed */}
        <ActivityCard
          title="Recent Deals & Lifecycle Events"
          subtitle="Transactions recently updated in the contract state machine"
        >
          {activity.recentDeals.map((d) => (
            <Link
              key={d.id}
              href={`/admin/deals/${d.id}`}
              className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-50/70"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-brand-600 group-hover:underline">
                    {d.id}
                  </span>
                  <span className="truncate text-xs font-medium text-ink-800">{d.propertyTitle}</span>
                </div>
                <p className="truncate text-[11px] text-ink-400 mt-0.5">
                  Buyer: <span className="text-ink-600">{d.buyerName}</span> · Broker:{" "}
                  <span className="text-ink-600">{d.brokerName}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-bold text-ink-900 font-mono">{formatCurrencyINR(d.amount)}</span>
                <StatusBadge status={d.stage.toLowerCase()} />
              </div>
            </Link>
          ))}
        </ActivityCard>

        {/* Recent Property Listings */}
        <ActivityCard title="Recent Property Listings" subtitle="New supply submitted to marketplace">
          {activity.recentListings.map((l) => (
            <ActivityRow key={l.id} title={l.title} subtitle={l.detail} date={l.date} />
          ))}
        </ActivityCard>

        {/* Recent Users */}
        <ActivityCard title="Recent Users" subtitle="New seeker registrations & upgrades">
          {activity.recentUsers.map((u) => (
            <ActivityRow key={u.id} title={u.name} subtitle={u.detail} date={u.date} />
          ))}
        </ActivityCard>

        {/* Pending Approvals */}
        <ActivityCard title="Pending Listing Approvals" subtitle="Awaiting initial verification before publish">
          {activity.pendingApprovals.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No pending listing approvals right now.</p>
          )}
          {activity.pendingApprovals.map((p) => (
            <ActivityRow
              key={p.id}
              title={p.title}
              subtitle={p.type}
              date={p.date}
              badge={<StatusBadge status="pending" />}
            />
          ))}
        </ActivityCard>
      </div>

      {/* Urgent Requirements Alert Stream */}
      <div className="mt-4">
        <ActivityCard title="Urgent Requirements" subtitle="Newly flagged by the Redis search velocity tracking engine">
          {activity.urgentRequirements.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No new flags right now.</p>
          )}
          {activity.urgentRequirements.map((u) => (
            <ActivityRow
              key={u.id}
              title={u.user}
              subtitle={u.location}
              date={u.date}
              badge={<StatusBadge status="new" />}
            />
          ))}
        </ActivityCard>
      </div>
    </>
  );
}

function ActivityCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
      <div className="border-b border-ink-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      <div className="divide-y divide-ink-100">{children}</div>
    </div>
  );
}

function ActivityRow({
  title,
  subtitle,
  date,
  badge,
  trailing,
}: {
  title: string;
  subtitle?: string;
  date: string;
  badge?: React.ReactNode;
  trailing?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-800">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing && <span className="text-sm font-medium text-ink-700">{trailing}</span>}
        {badge}
        <span className="text-xs text-ink-400">{formatDateTime(date)}</span>
      </div>
    </div>
  );
}
