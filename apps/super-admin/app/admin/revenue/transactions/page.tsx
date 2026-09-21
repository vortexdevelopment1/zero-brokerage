"use client";

import { useEffect, useState, useCallback } from "react";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { revenueService } from "@/services/revenueService";
import { TransactionEntry } from "@/types/revenue";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDateTime, titleCase } from "@/lib/utils/format";

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<TransactionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await revenueService.getTransactions(
        { search: debouncedSearch || undefined, type: typeFilter },
        { page, pageSize: PAGE_SIZE }
      );
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, typeFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debouncedSearch, typeFilter]);

  const columns: TableColumn<TransactionEntry>[] = [
    { key: "id", header: "Transaction ID", render: (t) => <span className="font-medium text-ink-800">{t.id}</span> },
    { key: "entity", header: "Entity / User" },
    { key: "type", header: "Type", render: (t) => <StatusBadge status="info" label={titleCase(t.type)} tone="info" /> },
    { key: "amount", header: "Amount", render: (t) => formatCurrencyINR(t.amount) },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
    { key: "gateway", header: "Gateway" },
    { key: "date", header: "Date", render: (t) => formatDateTime(t.date) },
  ];

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Consolidated payment history across subscriptions, commission payouts, and micro-transactions."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue", href: "/admin/revenue" }, { label: "Transactions" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by entity or transaction ID…" />
        <FilterDropdown
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: "All types", value: "all" },
            { label: "Subscription", value: "subscription" },
            { label: "Commission Payout", value: "commission-payout" },
            { label: "Micro Transaction", value: "micro-transaction" },
            { label: "Refund", value: "refund" },
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
            rowKey={(t) => t.id}
            isLoading={status === "loading"}
            emptyState={<EmptyState icon={Receipt} title="No transactions match these filters" />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
