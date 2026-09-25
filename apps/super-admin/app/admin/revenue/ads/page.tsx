"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Megaphone,
  TrendingUp,
  Target,
  Layers,
  Calendar,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Download,
  Eye,
  MapPin,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { adRevenueService } from "@/services/adRevenueService";
import { AdCampaign, AdRevenueOverview } from "@/types/adRevenue";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;

export default function AdRevenuePage() {
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [overview, setOverview] = useState<AdRevenueOverview | null>(null);
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<AdCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const [ov, campaignsRes] = await Promise.all([
        adRevenueService.getOverview(),
        adRevenueService.getCampaigns(
          {
            search: debouncedSearch || undefined,
            type: typeFilter !== "all" ? typeFilter : undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
          },
          { page, pageSize: PAGE_SIZE }
        ),
      ]);
      setOverview(ov);
      setRows(campaignsRes.items);
      setTotal(campaignsRes.total);
      setTotalPages(campaignsRes.totalPages);
      setStatus(campaignsRes.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, typeFilter, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  async function handleToggleStatus(campaign: AdCampaign) {
    try {
      const updated = await adRevenueService.toggleCampaignStatus(campaign.id);
      push(`Campaign ${campaign.id} is now ${updated.status}.`, "success");
      loadData();
    } catch {
      push("Failed to update campaign status.", "error");
    }
  }

  const columns: TableColumn<AdCampaign>[] = [
    {
      key: "id",
      header: "Campaign ID",
      render: (c) => (
        <div>
          <span className="font-mono text-xs font-semibold text-brand-600">{c.id}</span>
          <p className="text-[10px] text-ink-400 capitalize">{c.type.replace(/_/g, " ")}</p>
        </div>
      ),
    },
    {
      key: "advertiser",
      header: "Advertiser",
      render: (c) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{c.advertiser}</p>
          <p className="text-xs text-ink-500">{c.advertiserContact}</p>
        </div>
      ),
    },
    {
      key: "title",
      header: "Property / Campaign",
      render: (c) => (
        <div className="max-w-[220px]">
          <p className="truncate text-sm font-medium text-ink-900" title={c.title}>{c.title}</p>
          <p className="flex items-center gap-1 text-xs text-ink-500 truncate" title={c.targetLocation}>
            <MapPin className="h-3 w-3 text-ink-400 shrink-0" />
            {c.targetLocation}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Ad Type",
      render: (c) => {
        const badgeClass =
          c.type === "sponsored_listing"
            ? "bg-brand-50 text-brand-700"
            : c.type === "homepage_banner"
            ? "bg-purple-50 text-purple-700"
            : "bg-emerald-50 text-emerald-700";
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${badgeClass}`}>
            {c.type.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "performance",
      header: "Impressions & CTR",
      render: (c) => (
        <div>
          <span className="text-xs font-medium text-ink-800">
            {c.impressions.toLocaleString("en-IN")} impr
          </span>
          <p className="text-[10px] text-ink-500">
            {c.clicks.toLocaleString("en-IN")} clicks ({c.ctr}%)
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Revenue",
      render: (c) => (
        <div>
          <span className="text-sm font-semibold text-ink-900">{formatCurrencyINR(c.amount)}</span>
          <p className="text-[10px] text-ink-400 capitalize">{c.paymentStatus}</p>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Duration",
      render: (c) => (
        <div className="text-xs text-ink-600">
          <p>{formatDate(c.startDate)}</p>
          <p className="text-ink-400">to {formatDate(c.endDate)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleToggleStatus(c)}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
            title={c.status === "active" ? "Pause Campaign" : "Resume Campaign"}
          >
            {c.status === "active" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Ad Revenue"
        description="Platform advertising monetization covering sponsored listings, homepage banners, and geo-targeted campaigns."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Revenue", href: "/admin/revenue" },
          { label: "Ad Revenue" },
        ]}
        actions={
          <button
            onClick={() => push("Ad campaign report export queued.", "info")}
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Export Report
          </button>
        }
      />

      {/* Summary Metric Cards */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            label="Total Ad Revenue"
            value={formatCurrencyINR(overview.totalRevenue)}
            icon={Megaphone}
            tone="accent"
            delta={overview.monthlyGrowthRate}
          />
          <StatCard
            label="Active Campaigns"
            value={overview.activeCampaignsCount.toString()}
            icon={Target}
            tone="brand"
          />
          <StatCard
            label="Completed Campaigns"
            value={overview.completedCampaignsCount.toString()}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Average CTR"
            value={`${overview.averageCtr}%`}
            icon={TrendingUp}
            tone="brand"
          />
        </div>
      )}

      {/* Revenue Trend Visual Chart */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
          <ChartCard title="Ad Revenue Trend by Stream" subtitle="Monthly distribution across ad formats" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={overview.revenueTrend}>
                <defs>
                  <linearGradient id="colorSponsored" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D3822A" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#D3822A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBanners" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGeo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrencyINR(v)}
                  width={90}
                />
                <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" name="Sponsored Listings" dataKey="sponsoredListings" stroke="#D3822A" strokeWidth={2} fill="url(#colorSponsored)" />
                <Area type="monotone" name="Homepage Banners" dataKey="homepageBanners" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorBanners)" />
                <Area type="monotone" name="Geo-targeted Ads" dataKey="geoTargeted" stroke="#10B981" strokeWidth={2} fill="url(#colorGeo)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue by Ad Product" subtitle="YTD monetization split">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={overview.revenueByType} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrencyINR(v)}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fontSize: 11, fill: "#374151" }}
                  axisLine={false}
                  tickLine={false}
                  width={115}
                />
                <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
                <Bar dataKey="value" fill="#D3822A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by advertiser, campaign title, ID, location…"
        />

        <FilterDropdown
          label="Ad type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: "All types", value: "all" },
            { label: "Sponsored Listings", value: "sponsored_listing" },
            { label: "Homepage Banners", value: "homepage_banner" },
            { label: "Geo-targeted Ads", value: "geo_targeted" },
          ]}
        />

        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Completed", value: "completed" },
            { label: "Paused", value: "paused" },
          ]}
        />
      </div>

      {/* Data Table */}
      {status === "error" ? (
        <ErrorState onRetry={loadData} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.id}
            isLoading={status === "loading"}
            emptyState={
              <EmptyState
                icon={Megaphone}
                title="No ad campaigns match these filters"
                description="Adjust search terms or clear filters to view campaigns."
              />
            }
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </>
  );
}
