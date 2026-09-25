"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  Target,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  MapPin,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
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
import { formatCurrencyINR, formatDate, formatCompactNumber } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;

export default function AdCampaignsManagementPage() {
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
      key: "campaign",
      header: "Campaign & Advertiser",
      render: (c) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-medium text-ink-900">
            <span>{c.title}</span>
          </div>
          <p className="text-xs text-ink-500 font-mono">
            {c.id} · <span className="font-sans font-semibold text-ink-700">{c.advertiser}</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] text-ink-400">
            <MapPin className="h-3 w-3" />
            <span>{c.targetLocation}</span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Format",
      render: (c) => {
        const typeLabels: Record<string, string> = {
          sponsored_listing: "Sponsored Listing",
          homepage_banner: "Homepage Banner",
          geo_targeted: "Geo-Targeted Ad",
        };
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">
            {typeLabels[c.type] ?? c.type}
          </span>
        );
      },
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (c) => (
        <div className="text-xs text-ink-700 space-y-0.5">
          <p>
            <span className="text-ink-400">Start:</span> {formatDate(c.startDate)}
          </p>
          <p>
            <span className="text-ink-400">End:</span> {formatDate(c.endDate)}
          </p>
        </div>
      ),
    },
    {
      key: "performance",
      header: "Impressions & CTR",
      render: (c) => (
        <div className="space-y-0.5 text-xs">
          <p className="font-semibold text-ink-900">
            {formatCompactNumber(c.impressions)} <span className="text-[11px] font-normal text-ink-400">imps</span>
          </p>
          <p className="text-ink-500">
            {c.clicks.toLocaleString()} clicks · <span className="font-semibold text-brand-600">{c.ctr}% CTR</span>
          </p>
        </div>
      ),
    },
    {
      key: "budget",
      header: "Campaign Budget",
      render: (c) => (
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-ink-900">{formatCurrencyINR(c.amount)}</span>
          <p className="text-[11px] capitalize text-ink-400">Payment: {c.paymentStatus}</p>
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
      header: "Control",
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.status === "active" ? (
            <button
              onClick={() => handleToggleStatus(c)}
              className="inline-flex items-center gap-1 rounded-lg border border-warning-200 bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700 hover:bg-warning-100 transition-colors"
              title="Pause delivery"
            >
              <PauseCircle className="h-3.5 w-3.5" /> Pause
            </button>
          ) : c.status === "paused" ? (
            <button
              onClick={() => handleToggleStatus(c)}
              className="inline-flex items-center gap-1 rounded-lg border border-success-200 bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 hover:bg-success-100 transition-colors"
              title="Resume delivery"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Resume
            </button>
          ) : (
            <span className="text-xs text-ink-400 italic">No action</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Ad Campaigns"
        description="Operational campaign scheduling, impression delivery, and live advertiser targeting."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Ad Campaigns" },
        ]}
        actions={
          <Link
            href="/admin/revenue/ads"
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 shadow-sm transition-colors"
          >
            <Wallet className="h-3.5 w-3.5 text-brand-600" />
            <span>View Ad Revenue Financials</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-400" />
          </Link>
        }
      />

      {/* Campaign Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Campaigns"
          value={overview ? overview.activeCampaignsCount.toString() : "…"}
          icon={Megaphone}
          tone="brand"
        />
        <StatCard
          label="Completed Campaigns"
          value={overview ? overview.completedCampaignsCount.toString() : "…"}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Average CTR"
          value={overview ? `${overview.averageCtr}%` : "…"}
          icon={Target}
          tone="accent"
        />
        <StatCard
          label="Total Ad Consideration"
          value={overview ? formatCurrencyINR(overview.totalRevenue) : "…"}
          icon={Wallet}
          tone="brand"
        />
      </div>

      {/* Filters and Campaign Table */}
      <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by advertiser, campaign title, ID..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Format"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All Formats" },
                { value: "sponsored_listing", label: "Sponsored Listings" },
                { value: "homepage_banner", label: "Homepage Banners" },
                { value: "geo_targeted", label: "Geo-Targeted Ads" },
              ]}
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "scheduled", label: "Scheduled" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4">
          {status === "loading" && <LoadingState label="Loading ad campaigns…" />}
          {status === "error" && <ErrorState onRetry={loadData} />}
          {status === "empty" && (
            <EmptyState
              title="No campaigns found"
              description="No advertising campaigns match the selected search or filter criteria."
            />
          )}
          {status === "success" && (
            <>
              <DataTable columns={columns} rows={rows} rowKey={(c) => c.id} />
              <div className="mt-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
