"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { revenueService } from "@/services/revenueService";
import { MicroTransactionEntry } from "@/types/revenue";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils/format";

const PAGE_SIZE = 10;

export default function MicroTransactionsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<MicroTransactionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await revenueService.getMicroTransactions({ search: debouncedSearch || undefined }, { page, pageSize: PAGE_SIZE });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debouncedSearch]);

  const columns: TableColumn<MicroTransactionEntry>[] = [
    { key: "id", header: "Transaction ID", render: (m) => <span className="font-medium text-ink-800">{m.id}</span> },
    { key: "user", header: "User" },
    { key: "alertType", header: "Alert Type", render: (m) => <StatusBadge status="info" label={m.alertType} tone="info" /> },
    { key: "amount", header: "Amount", render: (m) => formatCurrencyINR(m.amount) },
    { key: "paymentStatus", header: "Payment Status", render: (m) => <StatusBadge status={m.paymentStatus} /> },
    { key: "date", header: "Date", render: (m) => formatDateTime(m.date) },
  ];

  return (
    <>
      <PageHeader
        title="Micro Transactions"
        description="₹5–₹10 fees for instant WhatsApp/SMS property alerts."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Revenue", href: "/admin/revenue" }, { label: "Micro Transactions" }]}
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by user or transaction ID…" />
      </div>

      {status === "error" ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(m) => m.id}
            isLoading={status === "loading"}
            emptyState={<EmptyState icon={MessageSquareText} title="No micro-transactions match this search" />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
