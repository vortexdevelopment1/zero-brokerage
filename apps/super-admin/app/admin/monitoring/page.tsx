"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Database, Server, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/ui/ChartCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { monitoringService } from "@/services/monitoringService";
import { MonitoringSnapshot } from "@/types/monitoring";
import { ApiStatus } from "@/types/common";
import { cn } from "@/lib/utils/cn";

export default function MonitoringPage() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [data, setData] = useState<MonitoringSnapshot | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const res = await monitoringService.getSnapshot();
      setData(res);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === "loading" || !data) return (
    <>
      <PageHeader title="System Monitoring" description="Live health of the Fastify/PostGIS/Redis backend." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Monitoring" }]} />
      <LoadingState />
    </>
  );

  if (status === "error") return (
    <>
      <PageHeader title="System Monitoring" description="Live health of the Fastify/PostGIS/Redis backend." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Monitoring" }]} />
      <ErrorState onRetry={load} />
    </>
  );

  return (
    <>
      <PageHeader
        title="System Monitoring"
        description="Health calculations happen on the backend — this view only visualizes the returned status. Auto-refreshes every 30s."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Monitoring" }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900 lg:col-span-2">
          <div className="border-b border-ink-100 px-5 py-4 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Service Status</h3>
          </div>
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {data.services.map((s) => (
              <div key={s.name} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      s.health === "operational" ? "bg-success-600" : s.health === "degraded" ? "bg-warning-500" : "bg-danger-600"
                    )}
                  />
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-200">{s.name}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-500 dark:text-ink-400">
                  <span>{s.latencyMs}ms</span>
                  <span>{s.uptimePct}% uptime</span>
                  <StatusBadge status={s.health} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">PostGIS</h3>
              <StatusBadge status={data.postgis.gistIndexHealth} />
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <RowStat label="Spatial query load" value={`${data.postgis.spatialQueryLoad}%`} />
              <RowStat label="Avg query time" value={`${data.postgis.avgQueryMs}ms`} />
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-600 dark:text-accent-400" />
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Redis</h3>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <RowStat label="Cache hit ratio" value={`${data.redis.cacheHitRatio}%`} />
              <RowStat label="Memory used" value={`${data.redis.memoryUsedPct}%`} />
              <RowStat label="Connected clients" value={String(data.redis.connectedClients)} />
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-ink-500 dark:text-ink-400" />
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Fleet</h3>
            </div>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">PM2 cluster mode · Node.js + Fastify · memory-limit auto-restart configured on the backend.</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ChartCard title="Latency Trend" subtitle="p50 / p95 response times, last 24h">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.latencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="p50" name="p50" stroke="#1877BE" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p95" name="p95" stroke="#D3822A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}

function RowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
      <dd className="font-medium text-ink-800 dark:text-ink-200">{value}</dd>
    </div>
  );
}
