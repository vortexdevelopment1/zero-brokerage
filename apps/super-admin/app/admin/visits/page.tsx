"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarCheck, ShieldCheck, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { visitService } from "@/services/visitService";
import { Visit } from "@/types/visit";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/utils/format";

const PAGE_SIZE = 10;

export default function VisitsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await visitService.getVisits(
        { search: debouncedSearch || undefined, status: statusFilter as Visit["status"] | "all" },
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

  const columns: TableColumn<Visit>[] = [
    { key: "user", header: "Seeker" },
    { key: "broker", header: "Broker" },
    { key: "property", header: "Property", render: (v) => <span className="max-w-[220px] truncate text-ink-600">{v.property}</span> },
    { key: "scheduledDate", header: "Date", render: (v) => formatDate(v.scheduledDate) },
    { key: "scheduledTime", header: "Time" },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v.status} /> },
    {
      key: "checkInVerified",
      header: "Check-in",
      align: "center",
      render: (v) =>
        v.status === "completed" ? (
          v.checkInVerified ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success-600"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-danger-600"><ShieldX className="h-3.5 w-3.5" /> Failed</span>
          )
        ) : (
          <span className="text-xs text-ink-400">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Visit Management"
        description="Seeker → Broker → Visit → Geolocation verification flow."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Visits" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by user, broker, property, ID…" />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Accepted", value: "accepted" },
            { label: "Rescheduled", value: "rescheduled" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
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
            rowKey={(v) => v.id}
            isLoading={status === "loading"}
            emptyState={<EmptyState icon={CalendarCheck} title="No visits match these filters" description="Try adjusting your search or filters." />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
