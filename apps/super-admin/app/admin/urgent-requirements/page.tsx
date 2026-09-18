"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { urgentRequirementService } from "@/services/urgentRequirementService";
import { UrgentRequirement, UrgentRequirementStatus } from "@/types/urgentRequirement";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;

export default function UrgentRequirementsPage() {
  const push = useToastStore((s) => s.push);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<UrgentRequirement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await urgentRequirementService.getUrgentRequirements(
        { search: debouncedSearch || undefined, status: statusFilter as UrgentRequirementStatus | "all" },
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

  async function markContacted(item: UrgentRequirement) {
    await urgentRequirementService.updateStatus(item.id, "contacted");
    push(`${item.user} marked as contacted.`, "success");
    load();
  }

  const columns: TableColumn<UrgentRequirement>[] = [
    { key: "user", header: "User" },
    { key: "location", header: "Location" },
    { key: "requirementContext", header: "Requirement", render: (u) => <span className="max-w-[220px] truncate text-ink-600">{u.requirementContext}</span> },
    { key: "searchCount", header: "Searches", render: (u) => (
      <span className="text-ink-700">{u.searchCount} in {u.windowHours}h</span>
    ) },
    { key: "flaggedAt", header: "Flagged", render: (u) => formatDateTime(u.flaggedAt) },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) =>
        u.status === "new" ? (
          <button
            onClick={(e) => { e.stopPropagation(); markContacted(u); }}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            Mark contacted
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Urgent Requirement Engine"
        description="Users with repeated rental searches within a detection window, flagged by the backend for high-touch advisory matching. The detection algorithm runs in Redis on the backend — this view only displays the resulting flags."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Urgent Requirements" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by user, location, ID…" />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "New", value: "new" },
            { label: "In Review", value: "in-review" },
            { label: "Contacted", value: "contacted" },
            { label: "Resolved", value: "resolved" },
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
            rowKey={(u) => u.id}
            isLoading={status === "loading"}
            emptyState={<EmptyState icon={ShieldAlert} title="No urgent requirements match these filters" />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
