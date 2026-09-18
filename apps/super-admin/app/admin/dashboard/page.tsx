"use client";

import { useEffect, useState } from "react";
import {
  Users, UserCheck, Building2, Boxes, ClipboardCheck, CreditCard, Wallet, ShieldAlert,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { dashboardService } from "@/services/dashboardService";
import { DashboardStats, RecentActivityFeed, TrendPoint, DistributionSlice } from "@/types/dashboard";
import { formatCompactNumber, formatCurrencyINR, formatDateTime } from "@/lib/utils/format";
import { ApiStatus } from "@/types/common";

const PIE_COLORS = ["#1877BE", "#3D92D4", "#7BB7E3", "#D3822A", "#E4A159"];

export default function DashboardPage() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<TrendPoint[]>([]);
  const [propertyGrowth, setPropertyGrowth] = useState<TrendPoint[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([]);
  const [subscriptionDist, setSubscriptionDist] = useState<DistributionSlice[]>([]);
  const [brokerActivity, setBrokerActivity] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<RecentActivityFeed | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const [s, ug, pg, rt, sd, ba, ra] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getUserGrowth(),
        dashboardService.getPropertyGrowth(),
        dashboardService.getRevenueTrend(),
        dashboardService.getSubscriptionDistribution(),
        dashboardService.getBrokerActivity(),
        dashboardService.getRecentActivity(),
      ]);
      setStats(s);
      setUserGrowth(ug);
      setPropertyGrowth(pg);
      setRevenueTrend(rt);
      setSubscriptionDist(sd);
      setBrokerActivity(ba);
      setActivity(ra);
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
        <PageHeader title="Dashboard" description="Central overview of the VortexCubes ecosystem." />
        <LoadingState label="Loading dashboard…" />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <PageHeader title="Dashboard" description="Central overview of the VortexCubes ecosystem." />
        <ErrorState onRetry={load} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Central overview of the VortexCubes ecosystem." />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={formatCompactNumber(stats.totalUsers)} delta={stats.deltas.totalUsers} icon={Users} tone="brand" />
        <StatCard label="Total Brokers" value={formatCompactNumber(stats.totalBrokers)} delta={stats.deltas.totalBrokers} icon={UserCheck} tone="brand" />
        <StatCard label="Total Agencies" value={formatCompactNumber(stats.totalAgencies)} delta={stats.deltas.totalAgencies} icon={Building2} tone="brand" />
        <StatCard label="Total Properties" value={formatCompactNumber(stats.totalProperties)} delta={stats.deltas.totalProperties} icon={Boxes} tone="brand" />
        <StatCard label="Pending Approvals" value={formatCompactNumber(stats.pendingApprovals)} delta={stats.deltas.pendingApprovals} icon={ClipboardCheck} tone="warning" />
        <StatCard label="Active Subscriptions" value={formatCompactNumber(stats.activeSubscriptions)} delta={stats.deltas.activeSubscriptions} icon={CreditCard} tone="success" />
        <StatCard label="Total Revenue" value={formatCurrencyINR(stats.totalRevenue)} delta={stats.deltas.totalRevenue} icon={Wallet} tone="accent" />
        <StatCard label="Urgent Requirements" value={formatCompactNumber(stats.urgentRequirements)} delta={stats.deltas.urgentRequirements} icon={ShieldAlert} tone="warning" />
      </div>

      {/* Charts row 1 */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Revenue Trend" subtitle="Last 6 months, all monetization streams" className="lg:col-span-2">
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
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactNumber(v)} />
              <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
              <Area type="monotone" dataKey="value" stroke="#1877BE" strokeWidth={2} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Subscription Distribution" subtitle="Active tiers, by share">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={subscriptionDist} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {subscriptionDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="User Growth" subtitle="Registered seekers, monthly">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactNumber(v)} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#1877BE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Property Growth" subtitle="New listings, monthly">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={propertyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactNumber(v)} />
              <Tooltip />
              <Bar dataKey="value" fill="#D3822A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Broker Activity" subtitle="Visits + closures logged, weekly">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={brokerActivity}>
              <defs>
                <linearGradient id="brokerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#159862" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#159862" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#159862" strokeWidth={2} fill="url(#brokerFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Activity feed */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityCard title="Recent Users">
          {activity.recentUsers.map((u) => (
            <ActivityRow key={u.id} title={u.name} subtitle={u.detail} date={u.date} />
          ))}
        </ActivityCard>
        <ActivityCard title="Recent Property Listings">
          {activity.recentListings.map((l) => (
            <ActivityRow key={l.id} title={l.title} subtitle={l.detail} date={l.date} />
          ))}
        </ActivityCard>
        <ActivityCard title="Pending Approvals">
          {activity.pendingApprovals.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No pending approvals right now.</p>}
          {activity.pendingApprovals.map((p) => (
            <ActivityRow key={p.id} title={p.title} subtitle={p.type} date={p.date} badge={<StatusBadge status="pending" />} />
          ))}
        </ActivityCard>
        <ActivityCard title="Recent Transactions">
          {activity.recentTransactions.map((t) => (
            <ActivityRow key={t.id} title={t.entity} subtitle={t.id} date={t.date} trailing={formatCurrencyINR(t.amount)} />
          ))}
        </ActivityCard>
      </div>

      <div className="mt-4">
        <ActivityCard title="Urgent Requirements" subtitle="Newly flagged by the Redis urgency engine">
          {activity.urgentRequirements.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No new flags right now.</p>}
          {activity.urgentRequirements.map((u) => (
            <ActivityRow key={u.id} title={u.user} subtitle={u.location} date={u.date} badge={<StatusBadge status="new" />} />
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
  title, subtitle, date, badge, trailing,
}: { title: string; subtitle?: string; date: string; badge?: React.ReactNode; trailing?: string }) {
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
