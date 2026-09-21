"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, CreditCard, Percent, MessageSquareText, ArrowRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { revenueService } from "@/services/revenueService";
import { RevenueOverview } from "@/types/revenue";
import { formatCurrencyINR } from "@/lib/utils/format";
import { ApiStatus } from "@/types/common";

const STREAMS = [
  { label: "Subscriptions", href: "/admin/revenue/subscriptions", desc: "5 user tiers + 3 agency tiers" },
  { label: "Commission", href: "/admin/revenue/commission", desc: "1–2% platform fee · 0% on luxury" },
  { label: "Micro Transactions", href: "/admin/revenue/micro-transactions", desc: "₹5–₹10 WhatsApp/SMS alerts" },
  { label: "Transactions", href: "/admin/revenue/transactions", desc: "Consolidated payment history" },
];

export default function RevenueOverviewPage() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [data, setData] = useState<RevenueOverview | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const res = await revenueService.getOverview();
      setData(res);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => { load(); }, []);

  if (status === "loading" || !data) return (
    <>
      <PageHeader title="Revenue" description="Monetization overview across all revenue streams." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue" }]} />
      <LoadingState />
    </>
  );

  if (status === "error") return (
    <>
      <PageHeader title="Revenue" description="Monetization overview across all revenue streams." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue" }]} />
      <ErrorState onRetry={load} />
    </>
  );

  return (
    <>
      <PageHeader title="Revenue" description="Monetization overview across all revenue streams." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrencyINR(data.totalRevenue)} icon={Wallet} tone="accent" />
        <StatCard label="Subscription Revenue" value={formatCurrencyINR(data.subscriptionRevenue)} icon={CreditCard} tone="brand" />
        <StatCard label="Commission Revenue" value={formatCurrencyINR(data.commissionRevenue)} icon={Percent} tone="brand" />
        <StatCard label="Micro-Transaction Revenue" value={formatCurrencyINR(data.microTransactionRevenue)} icon={MessageSquareText} tone="brand" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Revenue Trend" subtitle="Last 6 months" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueTrend}>
              <defs>
                <linearGradient id="revOverviewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D3822A" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#D3822A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyINR(v)} width={90} />
              <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#D3822A" strokeWidth={2} fill="url(#revOverviewFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Source" subtitle="This period">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.revenueBySource} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyINR(v)} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
              <Bar dataKey="value" fill="#1877BE" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STREAMS.map((s) => (
          <Link key={s.href} href={s.href} className="group flex flex-col justify-between rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition-shadow hover:shadow-popover">
            <div>
              <p className="text-sm font-semibold text-ink-900">{s.label}</p>
              <p className="mt-1 text-xs text-ink-500">{s.desc}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:gap-1.5">
              View details <ArrowRight className="h-3.5 w-3.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
