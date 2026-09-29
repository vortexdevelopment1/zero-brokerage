"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Building2,
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
  RefreshCw,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/ui/ChartCard";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { dashboardService } from "@/services/dashboardService";
import { monitoringService } from "@/services/monitoringService";
import {
  DashboardStats,
  RecentActivityFeed,
  TrendPoint,
  DealPipelineStageCount,
  RevenueStreamSummary,
} from "@/types/dashboard";
import { MonitoringSnapshot } from "@/types/monitoring";
import { formatCompactNumber, formatCurrencyINR, formatDateTime } from "@/lib/utils/format";
import { ApiStatus, ChartPeriod } from "@/types/common";

const STREAM_COLORS: Record<string, string> = {
  subscriptions: "#1877BE",
  commission: "#159862",
  micro_transactions: "#D3822A",
  ad_revenue: "#8B5CF6",
  cancellation_fees: "#EF4444",
};

export default function DashboardPage() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<RecentActivityFeed | null>(null);
  const [dealPipeline, setDealPipeline] = useState<DealPipelineStageCount[]>([]);
  const [revenueStreams, setRevenueStreams] = useState<RevenueStreamSummary[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<ChartPeriod>({ year: 2026 });


  async function load() {
    setStatus("loading");
    try {
      const [s, rt, ra, dp, rs, m] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRevenueTrend(revenuePeriod),
        dashboardService.getRecentActivity(),
        dashboardService.getDealPipeline(),
        dashboardService.getRevenueStreams(revenuePeriod),
        monitoringService.getSnapshot().catch(() => null),
      ]);
      setStats(s);
      setRevenueTrend(rt);
      setActivity(ra);
      setDealPipeline(dp);
      setRevenueStreams(rs);
      setMonitoring(m);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Update revenue visualizations when selected period changes
  useEffect(() => {
    let active = true;
    Promise.all([
      dashboardService.getRevenueTrend(revenuePeriod),
      dashboardService.getRevenueStreams(revenuePeriod),
    ]).then(([rt, rs]) => {
      if (active) {
        setRevenueTrend(rt);
        setRevenueStreams(rs);
      }
    });
    return () => {
      active = false;
    };
  }, [revenuePeriod]);

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
        actions={
          <button
            onClick={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 transition-colors shadow-sm disabled:opacity-50"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* ========================================================= */}
      {/* SYSTEM HEALTH: COMPACT STATUS STRIP                       */}
      {/* ========================================================= */}
      {monitoring && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-2.5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
            <span className="font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> System Health:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
              <span className="font-medium text-ink-700 dark:text-ink-300">Fastify API Gateway</span>
              <span className="text-[10px] text-success-600 dark:text-success-400 font-semibold uppercase">Operational</span>
            </div>
            <span className="text-ink-300 dark:text-ink-700 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              <span className="font-medium text-ink-700 dark:text-ink-300">PostGIS Engine</span>
              <span className="text-[10px] text-success-600 dark:text-success-400 font-semibold uppercase">
                {monitoring.postgis.gistIndexHealth}
              </span>
            </div>
            <span className="text-ink-300 dark:text-ink-700 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              <span className="font-medium text-ink-700 dark:text-ink-300">Redis Cache</span>
              <span className="text-[10px] text-success-600 dark:text-success-400 font-semibold uppercase">Operational</span>
            </div>
            <span className="text-ink-300 dark:text-ink-700 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  monitoring.services.some((s) => s.health === "degraded") ? "bg-warning-500" : "bg-success-500"
                }`}
              />
              <span className="font-medium text-ink-700 dark:text-ink-300">Async Services</span>
              <span
                className={`text-[10px] font-semibold uppercase ${
                  monitoring.services.some((s) => s.health === "degraded")
                    ? "text-warning-600 dark:text-warning-400"
                    : "text-success-600 dark:text-success-400"
                }`}
              >
                {monitoring.services.some((s) => s.health === "degraded") ? "Degraded" : "Operational"}
              </span>
            </div>
          </div>
          <Link
            href="/admin/monitoring"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            View Monitoring <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: CORE COMMAND CENTER KPIs                       */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Top 4 Hero KPIs: Deals, GMV, Net Platform Revenue, Pending Approvals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Deals & Lifecycle Volume */}
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-white to-brand-50/30 p-5 shadow-card transition-shadow hover:shadow-popover dark:border-brand-900/60 dark:from-ink-900 dark:to-brand-950/40">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/80 dark:text-brand-400">
                <Handshake className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-950/70 dark:text-brand-300 dark:ring-1 dark:ring-brand-900/50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {stats.totalDeals} Total
              </span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Active Deals Pipeline</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">{stats.activeDeals} Active</p>
            <p className="mt-1 text-[11px] text-ink-500">
              {stats.totalDeals - stats.activeDeals} closed/archived deals
            </p>
          </div>

          {/* GMV (Gross Deal Value) */}
          <div className="rounded-2xl border border-accent-200 bg-gradient-to-br from-white to-accent-50/20 p-5 shadow-card transition-shadow hover:shadow-popover dark:border-accent-900/60 dark:from-ink-900 dark:to-accent-950/40">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/15 text-accent-600 dark:bg-accent-950/80 dark:text-accent-400">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center rounded-full bg-accent-100 dark:bg-accent-950/70 dark:text-accent-300 dark:ring-1 dark:ring-accent-900/50 px-2 py-0.5 text-[10px] font-semibold text-accent-800">
                Gross Consideration
              </span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Gross Deal Value (GMV)</p>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
              {formatCurrencyINR(stats.grossDealValue)}
            </p>
            <p className="mt-1 text-[11px] text-ink-400">
              Total transaction value processed · <strong className="font-medium text-ink-600 dark:text-ink-300">Not platform revenue</strong>
            </p>
          </div>

          {/* Platform Revenue */}
          <div className="rounded-2xl border border-success-200 bg-gradient-to-br from-white to-success-50/30 p-5 shadow-card transition-shadow hover:shadow-popover dark:border-success-900/60 dark:from-ink-900 dark:to-success-950/40">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 text-success-600 dark:bg-success-950/80 dark:text-success-400">
                <Wallet className="h-5 w-5" strokeWidth={2} />
              </div>
              <Link
                href="/admin/revenue"
                className="inline-flex items-center gap-1 text-xs font-semibold text-success-700 dark:text-success-400 hover:underline"
              >
                Revenue Hub <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Total Platform Revenue</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
              {formatCurrencyINR(stats.totalRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              Subscriptions, commission, ads, micro-txns & fees
            </p>
          </div>

          {/* Unified Pending Approvals with Breakdown */}
          <div className="rounded-2xl border border-warning-200 bg-gradient-to-br from-white to-warning-50/20 p-5 shadow-card transition-shadow hover:shadow-popover dark:border-warning-900/60 dark:from-ink-900 dark:to-warning-950/40">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 text-warning-600 dark:bg-warning-950/80 dark:text-warning-400">
                <ClipboardCheck className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 dark:bg-warning-950/70 dark:text-warning-300 dark:ring-1 dark:ring-warning-900/50 px-2 py-0.5 text-xs font-semibold text-warning-700">
                {stats.pendingApprovals} Total Pending
              </span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Approvals & Compliance</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
              {stats.pendingApprovals} In Queue
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded bg-ink-100 px-1.5 py-0.5 text-ink-700 dark:bg-ink-800 dark:text-ink-200 font-medium">
                Props: {stats.approvalsBreakdown.properties}
              </span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium">
                Broker KYC: {stats.approvalsBreakdown.brokerKyc}
              </span>
              <span className="rounded bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.5 text-brand-700 dark:text-brand-300 font-medium">
                User KYC: {stats.approvalsBreakdown.userKyc}
              </span>
              {typeof stats.approvalsBreakdown.agencies === "number" && (
                <span className="rounded bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 text-amber-800 dark:text-amber-300 font-medium">
                  Agencies: {stats.approvalsBreakdown.agencies}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Ecosystem Footprint Stat Cards (Including Registered Agencies) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Link
            href="/admin/users"
            className="group rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-3.5 shadow-sm transition-all hover:border-ink-300 dark:hover:border-ink-700 hover:shadow-card"
          >
            <div className="flex items-center justify-between text-ink-500 dark:text-ink-400">
              <span className="text-xs group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Registered Seekers</span>
              <Users className="h-4 w-4 text-ink-400 dark:text-ink-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{formatCompactNumber(stats.totalUsers)}</p>
          </Link>

          <Link
            href="/admin/brokers"
            className="group rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-3.5 shadow-sm transition-all hover:border-ink-300 dark:hover:border-ink-700 hover:shadow-card"
          >
            <div className="flex items-center justify-between text-ink-500 dark:text-ink-400">
              <span className="text-xs group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Licensed Brokers</span>
              <UserCheck className="h-4 w-4 text-ink-400 dark:text-ink-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{formatCompactNumber(stats.totalBrokers)}</p>
          </Link>

          <Link
            href="/admin/agencies"
            className="group rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-3.5 shadow-sm transition-all hover:border-ink-300 dark:hover:border-ink-700 hover:shadow-card"
          >
            <div className="flex items-center justify-between text-ink-500 dark:text-ink-400">
              <span className="text-xs group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Registered Agencies</span>
              <Building2 className="h-4 w-4 text-ink-400 dark:text-ink-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{formatCompactNumber(stats.totalAgencies)}</p>
          </Link>

          <Link
            href="/admin/properties/residential"
            className="group rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-3.5 shadow-sm transition-all hover:border-ink-300 dark:hover:border-ink-700 hover:shadow-card"
          >
            <div className="flex items-center justify-between text-ink-500 dark:text-ink-400">
              <span className="text-xs group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Real Estate Properties</span>
              <Boxes className="h-4 w-4 text-ink-400 dark:text-ink-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{formatCompactNumber(stats.totalProperties)}</p>
          </Link>

          <Link
            href="/admin/revenue/subscriptions"
            className="group rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-3.5 shadow-sm transition-all hover:border-ink-300 dark:hover:border-ink-700 hover:shadow-card"
          >
            <div className="flex items-center justify-between text-ink-500 dark:text-ink-400">
              <span className="text-xs group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Active Subscriptions</span>
              <CreditCard className="h-4 w-4 text-ink-400 dark:text-ink-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
            <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{formatCompactNumber(stats.activeSubscriptions)}</p>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 3: DEAL PIPELINE STAGES (HORIZONTAL BAR CHART)    */}
      {/* ========================================================= */}
      <div className="mt-6 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-5 shadow-card">
        <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Deal Pipeline & Transaction Stages</h3>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
              Active volume and gross deal consideration progressing across compliance lifecycle gates.
            </p>
          </div>
          <Link
            href="/admin/deals"
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            View All Deals <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Horizontal Bar Chart representation */}
        <div className="mt-5 space-y-4">
          {(() => {
            const maxCount = Math.max(...dealPipeline.map((p) => p.count), 1);
            return dealPipeline.map((stage, idx) => {
              const widthPct = Math.max(Math.round((stage.count / maxCount) * 100), 4);
              return (
                <div key={stage.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-600 dark:text-ink-300">
                        STAGE 0{idx + 1}
                      </span>
                      <span className="font-semibold text-ink-900 dark:text-white">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-brand-700 dark:text-brand-300">
                        {stage.count} {stage.count === 1 ? "deal" : "deals"}
                      </span>
                      <span className="font-mono text-ink-500 dark:text-ink-400 text-[11px]">
                        ({formatCurrencyINR(stage.value)})
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 dark:from-brand-500 dark:to-brand-300 transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 4: REVENUE & MONETIZATION STREAMS                 */}
      {/* ========================================================= */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900 dark:text-white">Revenue & Monetization Streams</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Consolidated platform earnings trend and monetization split
          </p>
        </div>
        <PeriodSelector value={revenuePeriod} onChange={setRevenuePeriod} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
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

        {/* Right: Revenue Breakdown by Stream (Recharts Pie Chart) */}
        <div className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Revenue by Stream</h3>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">Platform monetization sources</p>
              </div>
              <Link href="/admin/revenue" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                Details
              </Link>
            </div>

            {revenueStreams.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-400 dark:text-ink-500">
                No revenue stream data available.
              </div>
            ) : (
              <>
                <div className="mt-3 h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueStreams}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {revenueStreams.map((entry) => (
                          <Cell
                            key={entry.stream}
                            fill={STREAM_COLORS[entry.stream] ?? "#1877BE"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const item = payload[0].payload as RevenueStreamSummary;
                          return (
                            <div className="rounded-xl border border-ink-200 bg-white p-2.5 shadow-popover dark:border-ink-700 dark:bg-ink-900 text-xs">
                              <p className="font-semibold text-ink-900 dark:text-white">{item.label}</p>
                              <p className="font-mono font-bold text-brand-600 dark:text-brand-400 mt-1">
                                {formatCurrencyINR(item.amount)}
                              </p>
                              <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">
                                Share: <span className="font-semibold text-ink-800 dark:text-ink-200">{item.sharePercent}%</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 space-y-1.5 border-t border-ink-100 dark:border-ink-800 pt-3">
                  {revenueStreams.map((s) => (
                    <Link
                      key={s.stream}
                      href={s.href}
                      className="group flex items-center justify-between rounded-lg p-1 text-xs transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: STREAM_COLORS[s.stream] ?? "#1877BE" }}
                        />
                        <span className="font-medium text-ink-700 dark:text-ink-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink-400 dark:text-ink-500">{s.sharePercent}%</span>
                        <span className="font-mono font-semibold text-ink-900 dark:text-white">{formatCurrencyINR(s.amount)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 dark:border-ink-800 dark:bg-ink-800/40 p-3 text-[11px] text-ink-500 dark:text-ink-400 leading-relaxed">
            <strong>Note:</strong> Cancellation fees are net revenue retained by platform; GMV is excluded from platform earnings.
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 5: SECONDARY SNAPSHOTS: AD CAMPAIGNS & INVENTORY  */}
      {/* ========================================================= */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Ad Campaign Performance */}
        <div className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Ad Campaigns</h3>
                  <p className="text-xs text-ink-500 dark:text-ink-400">Sponsored listing & banner delivery</p>
                </div>
              </div>
              <Link href="/admin/ad-campaigns" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                Manage
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400 dark:text-ink-500">Active</span>
                <p className="text-base font-bold text-ink-900 dark:text-white">{stats.activeAdCampaigns}</p>
              </div>
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400 dark:text-ink-500">Impressions</span>
                <p className="text-base font-bold text-ink-900 dark:text-white">{formatCompactNumber(stats.adImpressions)}</p>
              </div>
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400 dark:text-ink-500">Avg CTR</span>
                <p className="text-base font-bold text-brand-600 dark:text-brand-400">{stats.adAverageCtr}%</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-500 dark:text-ink-400">
            <span>Total Ad Revenue:</span>
            <strong className="text-ink-900 dark:text-white font-mono">{formatCurrencyINR(stats.adRevenue)}</strong>
          </div>
        </div>

        {/* Cancellation Summary */}
        <div className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-50 dark:bg-danger-950/60 text-danger-600 dark:text-danger-400">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Cancellation Summary</h3>
                  <p className="text-xs text-ink-500 dark:text-ink-400">Deal terminations & penalty fees</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Link href="/admin/revenue/cancellations" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                  Revenue
                </Link>
                <span className="text-ink-300 dark:text-ink-700">·</span>
                <Link href="/admin/deals/cancellations" className="font-medium text-ink-500 dark:text-ink-400 hover:text-ink-800 dark:hover:text-ink-200">
                  Operations
                </Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-danger-50/50 dark:bg-danger-950/40 p-2.5 border border-danger-100 dark:border-danger-900/50">
                <span className="text-[10px] uppercase text-danger-700 dark:text-danger-300">Cancelled Deals</span>
                <p className="text-base font-bold text-danger-900 dark:text-danger-200">{stats.cancelledDealsCount}</p>
              </div>
              <div className="rounded-lg bg-success-50/50 dark:bg-success-950/40 p-2.5 border border-success-100 dark:border-success-900/50">
                <span className="text-[10px] uppercase text-success-700 dark:text-success-300">Fees Collected</span>
                <p className="text-base font-bold text-success-900 dark:text-success-200">{formatCompactNumber(stats.cancellationRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-500 dark:text-ink-400">
            <span>Pending Resolution:</span>
            <span className="font-semibold text-warning-700 dark:text-warning-400">{stats.pendingCancellationActions} actions required</span>
          </div>
        </div>

        {/* Furniture & Commercial Assets */}
        <div className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sofa className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Furniture & Fit-outs</h3>
                  <p className="text-xs text-ink-500 dark:text-ink-400">Commercial turnkey workspace assets</p>
                </div>
              </div>
              <Link href="/admin/properties/furniture" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                Inventory
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400 dark:text-ink-500">Office Packages</span>
                <p className="text-base font-bold text-ink-900 dark:text-white">{stats.furniturePackagesCount}</p>
              </div>
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-2.5">
                <span className="text-[10px] uppercase text-ink-400 dark:text-ink-500">Single Assets</span>
                <p className="text-base font-bold text-ink-900 dark:text-white">{stats.furnitureAssetsCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-500 dark:text-ink-400">
            <span>Marketplace Mode:</span>
            <span className="font-medium text-ink-700 dark:text-ink-300">Rental & Direct Purchase</span>
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
          viewAllHref="/admin/deals"
        >
          {activity.recentDeals.map((d) => (
            <Link
              key={d.id}
              href={`/admin/deals/${d.id}`}
              className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:underline">
                    {d.id}
                  </span>
                  <span className="truncate text-xs font-medium text-ink-800 dark:text-ink-200">{d.propertyTitle}</span>
                </div>
                <p className="truncate text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">
                  Buyer: <span className="text-ink-600 dark:text-ink-300">{d.buyerName}</span> · Broker:{" "}
                  <span className="text-ink-600 dark:text-ink-300">{d.brokerName}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-bold text-ink-900 dark:text-white font-mono">{formatCurrencyINR(d.amount)}</span>
                <StatusBadge status={d.stage.toLowerCase()} />
              </div>
            </Link>
          ))}
        </ActivityCard>

        {/* Recent Property Listings */}
        <ActivityCard
          title="Recent Property Listings"
          subtitle="New supply submitted to marketplace"
          viewAllHref="/admin/properties/residential"
        >
          {activity.recentListings.map((l) => (
            <ActivityRow key={l.id} title={l.title} subtitle={l.detail} date={l.date} />
          ))}
        </ActivityCard>

        {/* Recent Users */}
        <ActivityCard
          title="Recent Users"
          subtitle="New seeker registrations & upgrades"
          viewAllHref="/admin/users"
        >
          {activity.recentUsers.map((u) => (
            <ActivityRow key={u.id} title={u.name} subtitle={u.detail} date={u.date} />
          ))}
        </ActivityCard>

        {/* Pending Approvals */}
        <ActivityCard
          title="Pending Listing Approvals"
          subtitle="Awaiting initial verification before publish"
          viewAllHref="/admin/properties/residential"
        >
          {activity.pendingApprovals.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No pending listing approvals right now.</p>
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
        <ActivityCard
          title="Urgent Requirements"
          subtitle="Newly flagged by the Redis search velocity tracking engine"
          viewAllHref="/admin/urgent-requirements"
        >
          {activity.urgentRequirements.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No new flags right now.</p>
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

function ActivityCard({
  title,
  subtitle,
  viewAllHref,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 shadow-card">
      <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="divide-y divide-ink-100 dark:divide-ink-800">{children}</div>
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
    <div className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-200">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing && <span className="text-sm font-medium text-ink-700 dark:text-ink-300">{trailing}</span>}
        {badge}
        <span className="text-xs text-ink-400 dark:text-ink-500">{formatDateTime(date)}</span>
      </div>
    </div>
  );
}
