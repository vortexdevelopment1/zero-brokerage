"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle2, XCircle, Ban, PlayCircle, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { brokerService } from "@/services/brokerService";
import { Broker } from "@/types/broker";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;
type BrokerAction = "approve" | "reject" | "suspend" | "activate";

export default function BrokersPage() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Broker[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<{ broker: Broker; action: BrokerAction } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await brokerService.getBrokers(
        { search: debouncedSearch || undefined, status: statusFilter as Broker["verification"] | "all" },
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

  async function handleConfirm() {
    if (!confirmTarget) return;
    setSubmitting(true);
    const { broker, action } = confirmTarget;
    if (action === "approve") await brokerService.approveBroker(broker.id);
    if (action === "reject") await brokerService.rejectBroker(broker.id);
    if (action === "suspend") await brokerService.updateBrokerStatus(broker.id, "suspended");
    if (action === "activate") await brokerService.updateBrokerStatus(broker.id, "active");
    push(`${broker.name} was ${action}d.`, "success");
    setSubmitting(false);
    setConfirmTarget(null);
    load();
  }

  const columns: TableColumn<Broker>[] = [
    {
      key: "name",
      header: "Broker",
      render: (b) => (
        <div>
          <p className="text-sm font-medium text-ink-800">{b.name}</p>
          <p className="text-xs text-ink-500">{b.id} · {b.city}</p>
        </div>
      ),
    },
    { key: "agency", header: "Agency", render: (b) => <span className="text-ink-600">{b.agency ?? "Independent"}</span> },
    { key: "rating", header: "Rating", render: (b) => <span className="font-medium text-ink-700">★ {b.rating.toFixed(1)}</span> },
    { key: "propertiesListed", header: "Properties" },
    { key: "closures", header: "Closures" },
    { key: "verification", header: "Verification", render: (b) => <StatusBadge status={b.verification} /> },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/brokers/${b.id}`); }} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600" aria-label="View">
            <Eye className="h-4 w-4" />
          </button>
          {b.verification === "pending" && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ broker: b, action: "approve" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600" aria-label="Approve">
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ broker: b, action: "reject" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-danger-100 hover:text-danger-600" aria-label="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {b.status === "active" ? (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ broker: b, action: "suspend" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-warning-100 hover:text-warning-600" aria-label="Suspend">
              <Ban className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ broker: b, action: "activate" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600" aria-label="Activate">
              <PlayCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Broker Management" description="Field partners and property brokers from the Broker App." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Brokers" }]} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, agency, ID…" />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Pending approval", value: "pending" },
            { label: "Verified", value: "verified" },
            { label: "Suspended", value: "suspended" },
            { label: "Rejected", value: "rejected" },
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
            rowKey={(b) => b.id}
            isLoading={status === "loading"}
            onRowClick={(b) => router.push(`/admin/brokers/${b.id}`)}
            emptyState={<EmptyState icon={UserCheck} title="No brokers match these filters" description="Try adjusting your search or filters." />}
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
        title={confirmTarget ? `${confirmTarget.action.charAt(0).toUpperCase()}${confirmTarget.action.slice(1)} broker` : ""}
        description={`Are you sure you want to ${confirmTarget?.action} ${confirmTarget?.broker.name}?`}
      />
    </>
  );
}
