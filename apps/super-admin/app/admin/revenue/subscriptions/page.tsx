"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { revenueService } from "@/services/revenueService";
import { SubscriptionEntry } from "@/types/revenue";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";

const PAGE_SIZE = 10;

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [audience, setAudience] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<SubscriptionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await revenueService.getSubscriptions(
        { search: debouncedSearch || undefined, audience: audience as "user" | "agency" | "all", status: statusFilter as "active" | "expired" | "all" },
        { page, pageSize: PAGE_SIZE }
      );
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, audience, statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debouncedSearch, audience, statusFilter]);

  const columns: TableColumn<SubscriptionEntry>[] = [
    { key: "subscriber", header: "Subscriber", render: (s) => (
      <div>
        <p className="text-sm font-medium text-ink-800">{s.subscriber}</p>
        <p className="text-xs text-ink-500">{s.id} · {s.audience === "agency" ? "Agency" : "User"}</p>
      </div>
    ) },
    { key: "plan", header: "Plan", render: (s) => <StatusBadge status="info" label={s.plan} tone="info" /> },
    { key: "revenue", header: "Revenue", render: (s) => formatCurrencyINR(s.revenue) },
    { key: "status", header: "Active/Expired", render: (s) => <StatusBadge status={s.status} /> },
    { key: "purchaseDate", header: "Purchased", render: (s) => formatDate(s.purchaseDate) },
    { key: "expiryDate", header: "Expires", render: (s) => formatDate(s.expiryDate) },
    { key: "paymentStatus", header: "Payment", render: (s) => <StatusBadge status={s.paymentStatus} /> },
  ];

  return (
    <>
      <PageHeader
        title="Subscription Revenue"
        description="5 user tiers (Micro-Pass → VIP Concierge) and 3 agency tiers (Silver → Platinum)."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue", href: "/admin/revenue" }, { label: "Subscriptions" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by subscriber, plan, ID…" />
        <FilterDropdown
          label="Audience"
          value={audience}
          onChange={setAudience}
          options={[
            { label: "Users + Agencies", value: "all" },
            { label: "User plans", value: "user" },
            { label: "Agency plans", value: "agency" },
          ]}
        />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Expired", value: "expired" },
          ]}
        />
      </div>

      {status === "error" ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(s) => s.id}
            isLoading={status === "loading"}
            emptyState={<EmptyState icon={CreditCard} title="No subscriptions match these filters" />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
