"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  Wallet,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Handshake,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { revenueService } from "@/services/revenueService";
import { CancellationRevenueEntry, RevenueOverview } from "@/types/revenue";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";

const PAGE_SIZE = 10;

export default function CancellationRevenuePage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<CancellationRevenueEntry[]>([]);
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const [ov, res] = await Promise.all([
        revenueService.getOverview(),
        revenueService.getCancellationRevenue(
          {
            search: debouncedSearch || undefined,
            paymentMode: paymentModeFilter !== "all" ? paymentModeFilter : undefined,
          },
          { page, pageSize: PAGE_SIZE }
        ),
      ]);
      setOverview(ov);
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, paymentModeFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, paymentModeFilter]);

  const platformCollectedTotal = rows
    .filter((r) => r.paymentMode === "platform_collected")
    .reduce((sum, r) => sum + r.cancellationFeeAmount, 0);

  const invoicedTotal = rows
    .filter((r) => r.paymentMode === "external_transaction")
    .reduce((sum, r) => sum + r.cancellationFeeAmount, 0);

  const columns: TableColumn<CancellationRevenueEntry>[] = [
    {
      key: "deal",
      header: "Deal & Property",
      render: (r) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/deals/${r.dealId}`}
            className="font-mono text-xs font-semibold text-brand-600 hover:underline"
          >
            {r.dealId}
          </Link>
          <p className="text-xs text-ink-800 font-medium truncate max-w-[220px]">{r.property}</p>
          <span className="text-[11px] text-ink-400 font-mono">Ref: {r.id}</span>
        </div>
      ),
    },
    {
      key: "initiator",
      header: "Initiator",
      render: (r) => (
        <span className="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 capitalize">
          {r.initiator}
        </span>
      ),
    },
    {
      key: "dealValue",
      header: "Deal Value (Reference)",
      render: (r) => (
        <div>
          <span className="text-xs text-ink-600 font-mono">{formatCurrencyINR(r.dealValue)}</span>
          <p className="text-[10px] text-ink-400">Gross Consideration</p>
        </div>
      ),
    },
    {
      key: "cancellationFeePercent",
      header: "Fee Rate",
      render: (r) => (
        <span className="text-xs font-semibold text-ink-700">
          {r.cancellationFeePercent > 0 ? `${r.cancellationFeePercent}%` : "Broker Penalty"}
        </span>
      ),
    },
    {
      key: "feeAmount",
      header: "Platform Fee Collected",
      render: (r) => (
        <div>
          <span className="text-sm font-bold text-ink-900 font-mono">
            {formatCurrencyINR(r.cancellationFeeAmount + (r.brokerPenaltyAmount ?? 0))}
          </span>
          {r.brokerPenaltyAmount ? (
            <p className="text-[10px] text-danger-600">Includes ₹{r.brokerPenaltyAmount.toLocaleString("en-IN")} penalty</p>
          ) : (
            <p className="text-[10px] text-success-600">Platform retained fee</p>
          )}
        </div>
      ),
    },
    {
      key: "settlementMode",
      header: "Settlement Mode",
      render: (r) => (
        <span className="text-xs font-medium text-ink-700 capitalize">
          {r.paymentMode === "platform_collected" ? "Escrow Deduction" : "Direct Invoice"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Payment Status",
      render: (r) => <StatusBadge status={r.refundPaymentStatus} />,
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-xs text-ink-400">{formatDate(r.date)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Cancellation Revenue"
        description="Platform cancellation fee retention, escrow deposit deductions, and external invoice settlement records."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Revenue", href: "/admin/revenue" },
          { label: "Cancellation Revenue" },
        ]}
        actions={
          <Link
            href="/admin/deals/cancellations"
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 shadow-sm transition-colors"
          >
            <Handshake className="h-3.5 w-3.5 text-brand-600" />
            <span>Go to Deals → Cancellations (Operations)</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-400" />
          </Link>
        }
      />

      {/* Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cancellation Revenue"
          value={overview ? formatCurrencyINR(overview.cancellationRevenue) : "…"}
          icon={Receipt}
          tone="accent"
        />
        <StatCard
          label="Escrow Auto-Deductions"
          value={formatCurrencyINR(platformCollectedTotal)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="External Invoiced Fees"
          value={formatCurrencyINR(invoicedTotal)}
          icon={CreditCard}
          tone="brand"
        />
        <StatCard
          label="Standard Fee Exposure"
          value="1.0% – 2.0%"
          icon={ShieldCheck}
          tone="brand"
        />
      </div>

      {/* Financial Table */}
      <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by Deal ID, property, record ID..."
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterDropdown
              label="Settlement Mode"
              value={paymentModeFilter}
              onChange={setPaymentModeFilter}
              options={[
                { value: "all", label: "All Settlement Modes" },
                { value: "platform_collected", label: "Escrow Auto-Deduction" },
                { value: "external_transaction", label: "Direct Invoiced" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4">
          {status === "loading" && <LoadingState label="Loading cancellation revenue records…" />}
          {status === "error" && <ErrorState onRetry={loadData} />}
          {status === "empty" && (
            <EmptyState
              title="No cancellation fee records"
              description="No cancellation fee revenue entries match the selected filter criteria."
            />
          )}
          {status === "success" && (
            <>
              <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
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
