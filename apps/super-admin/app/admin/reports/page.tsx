"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/ui/ChartCard";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { reportService } from "@/services/reportService";
import { TrendPoint } from "@/types/dashboard";
import { formatCurrencyINR } from "@/lib/utils/format";
import { ApiStatus } from "@/types/common";

interface ReportsData {
  userGrowth: TrendPoint[];
  brokerGrowth: TrendPoint[];
  agencyGrowth: TrendPoint[];
  propertyGrowth: TrendPoint[];
  revenue: TrendPoint[];
  subscriptionActivity: TrendPoint[];
  dealClosure: TrendPoint[];
}

export default function ReportsPage() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [data, setData] = useState<ReportsData | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const [userGrowth, brokerGrowth, agencyGrowth, propertyGrowth, revenue, subscriptionActivity, dealClosure] =
        await Promise.all([
          reportService.getUserGrowthReport(),
          reportService.getBrokerGrowthReport(),
          reportService.getAgencyGrowthReport(),
          reportService.getPropertyGrowthReport(),
          reportService.getRevenueReport(),
          reportService.getSubscriptionActivityReport(),
          reportService.getDealClosureReport(),
        ]);
      setData({ userGrowth, brokerGrowth, agencyGrowth, propertyGrowth, revenue, subscriptionActivity, dealClosure });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => { load(); }, []);

  if (status === "loading" || !data) return (
    <>
      <PageHeader title="Reports & Analytics" description="Modular report categories across the ecosystem." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Reports" }]} />
      <LoadingState />
    </>
  );

  if (status === "error") return (
    <>
      <PageHeader title="Reports & Analytics" description="Modular report categories across the ecosystem." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Reports" }]} />
      <ErrorState onRetry={load} />
    </>
  );

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Each category below is an independent module so new report definitions can be added without reshaping existing ones."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Reports" }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="User Growth" subtitle="Registered seekers over time">
          <LineTrend data={data.userGrowth} color="#1877BE" />
        </ChartCard>
        <ChartCard title="Broker Growth" subtitle="Active broker/partner activity">
          <LineTrend data={data.brokerGrowth} color="#159862" />
        </ChartCard>
        <ChartCard title="Agency Growth" subtitle="Onboarded agencies over time">
          <LineTrend data={data.agencyGrowth} color="#D3822A" />
        </ChartCard>
        <ChartCard title="Property Growth" subtitle="New listings across all categories">
          <BarTrend data={data.propertyGrowth} color="#1877BE" />
        </ChartCard>
        <ChartCard title="Revenue" subtitle="All monetization streams combined">
          <BarTrend data={data.revenue} color="#D3822A" formatValue={formatCurrencyINR} />
        </ChartCard>
        <ChartCard title="Subscription Activity" subtitle="Active subscriptions, monthly">
          <LineTrend data={data.subscriptionActivity} color="#7BB7E3" />
        </ChartCard>
        <ChartCard title="Deal / Closure Activity" subtitle="Broker-assisted closures, monthly" className="lg:col-span-2">
          <BarTrend data={data.dealClosure} color="#159862" />
        </ChartCard>
      </div>
    </>
  );
}

function LineTrend({ data, color }: { data: TrendPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarTrend({ data, color, formatValue }: { data: TrendPoint[]; color: string; formatValue?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
        <Tooltip formatter={formatValue ? (v: number) => formatValue(v) : undefined} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
