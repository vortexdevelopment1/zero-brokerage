"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle2, XCircle, Ban, PlayCircle, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { agencyService } from "@/services/agencyService";
import { Agency } from "@/types/agency";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;
type AgencyAction = "approve" | "reject" | "suspend" | "activate";

export default function AgenciesPage() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Agency[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<{ agency: Agency; action: AgencyAction } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await agencyService.getAgencies(
        { search: debouncedSearch || undefined, status: statusFilter as Agency["status"] | "all", plan: planFilter as Agency["plan"] | "all" },
        { page, pageSize: PAGE_SIZE }
      );
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, statusFilter, planFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, planFilter]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setSubmitting(true);
    const { agency, action } = confirmTarget;
    if (action === "approve") await agencyService.approveAgency(agency.id);
    if (action === "reject") await agencyService.rejectAgency(agency.id);
    if (action === "suspend") await agencyService.updateAgencyStatus(agency.id, "suspended");
    if (action === "activate") await agencyService.updateAgencyStatus(agency.id, "active");
    push(`${agency.name} was ${action}d.`, "success");
    setSubmitting(false);
    setConfirmTarget(null);
    load();
  }

  const columns: TableColumn<Agency>[] = [
    {
      key: "name",
      header: "Agency",
      render: (a) => (
        <div>
          <p className="text-sm font-medium text-ink-800">{a.name}</p>
          <p className="text-xs text-ink-500">{a.id} · {a.city}</p>
        </div>
      ),
    },
    { key: "owner", header: "Owner" },
    { key: "plan", header: "Plan", render: (a) => <StatusBadge status="info" label={a.plan} tone="info" /> },
    { key: "brokers", header: "Brokers" },
    { key: "activeListings", header: "Active Listings" },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/agencies/${a.id}`); }} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600" aria-label="View">
            <Eye className="h-4 w-4" />
          </button>
          {a.status === "pending" && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ agency: a, action: "approve" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600" aria-label="Approve">
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ agency: a, action: "reject" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-danger-100 hover:text-danger-600" aria-label="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {a.status === "active" ? (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ agency: a, action: "suspend" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-warning-100 hover:text-warning-600" aria-label="Suspend">
              <Ban className="h-4 w-4" />
            </button>
          ) : a.status === "suspended" ? (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ agency: a, action: "activate" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600" aria-label="Activate">
              <PlayCircle className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Agency Management" description="Builders and enterprise firms on the Agency Web Portal." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Agencies" }]} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by agency, owner, ID…" />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Rejected", value: "rejected" },
          ]}
        />
        <FilterDropdown
          label="Plan"
          value={planFilter}
          onChange={setPlanFilter}
          options={[
            { label: "All plans", value: "all" },
            { label: "Silver Partner", value: "Silver Partner" },
            { label: "Gold Agency", value: "Gold Agency" },
            { label: "Platinum Builder", value: "Platinum Builder" },
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
            rowKey={(a) => a.id}
            isLoading={status === "loading"}
            onRowClick={(a) => router.push(`/admin/agencies/${a.id}`)}
            emptyState={<EmptyState icon={Building2} title="No agencies match these filters" description="Try adjusting your search or filters." />}
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <ConfirmationDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isSubmitting={submitting}
        tone={confirmTarget?.action === "reject" || confirmTarget?.action === "suspend" ? "danger" : "brand"}
        title={confirmTarget ? `${confirmTarget.action.charAt(0).toUpperCase()}${confirmTarget.action.slice(1)} agency` : ""}
        description={`Are you sure you want to ${confirmTarget?.action} ${confirmTarget?.agency.name}?`}
      />
    </>
  );
}
