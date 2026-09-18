"use client";

import { useEffect, useState, useCallback } from "react";
import { Percent, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { revenueService } from "@/services/revenueService";
import { CommissionEntry } from "@/types/revenue";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;

export default function CommissionPage() {
  const push = useToastStore((s) => s.push);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<CommissionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await revenueService.getCommission(
        { search: debouncedSearch || undefined, status: statusFilter },
        { page, pageSize: PAGE_SIZE }
      );
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debouncedSearch, statusFilter]);

  const columns: TableColumn<CommissionEntry>[] = [
    { key: "dealId", header: "Deal ID", render: (c) => <span className="font-medium text-ink-800">{c.dealId}</span> },
    { key: "property", header: "Property", render: (c) => <span className="max-w-[200px] truncate text-ink-600">{c.property}</span> },
    { key: "broker", header: "Broker" },
    { key: "dealValue", header: "Deal Value", render: (c) => formatCurrencyINR(c.dealValue) },
    { key: "commissionRate", header: "Rate", render: (c) => (c.isLuxury ? <StatusBadge status="info" label="0% · Luxury" tone="brand" /> : `${c.commissionRate}%`) },
    { key: "platformCommission", header: "Platform Commission", render: (c) => <span className="font-medium text-ink-800">{formatCurrencyINR(c.platformCommission)}</span> },
    { key: "dealStatus", header: "Deal", render: (c) => <StatusBadge status={c.dealStatus} /> },
    { key: "payoutStatus", header: "Payout", render: (c) => <StatusBadge status={c.payoutStatus} /> },
    { key: "date", header: "Date", render: (c) => formatDate(c.date) },
  ];

  return (
    <>
      <PageHeader
        title="Commission Ledger"
        description="1–2% platform success fee on standard deals. Luxury inventory carries 0% third-party brokerage under the concierge model."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue", href: "/admin/revenue" }, { label: "Commission" }]}
        actions={
          <button
            onClick={() => push("Export is a UI placeholder — wire to a backend export endpoint when available.", "info")}
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by property, broker, deal ID…" />
        <FilterDropdown
          label="Payout status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All payout statuses", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Processing", value: "processing" },
            { label: "Paid", value: "paid" },
            { label: "Failed", value: "failed" },
          ]}
        />
      </div>

      <div className="mb-4 rounded-xl border border-warning-100 bg-warning-100/40 px-4 py-3 text-xs text-ink-600">
        The exact broker payout split, payout timing and calculation rules are not defined in the BRD/SOW yet — these fields are wired for backend-driven values and no business logic is hardcoded here.
      </div>

      {status === "error" ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.id}
            isLoading={status === "loading"}
            emptyState={<EmptyState icon={Percent} title="No commission entries match these filters" />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
