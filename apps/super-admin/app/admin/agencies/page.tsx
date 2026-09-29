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
import { KycStatusBadge } from "@/components/kyc/KycStatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AgencyRejectModal } from "@/components/agencies/AgencyRejectModal";
import { agencyService } from "@/services/agencyService";
import { Agency, getDerivedVerificationStatus } from "@/types/agency";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;
type AgencyAction = "approve" | "suspend" | "activate";

export default function AgenciesPage() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Agency[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [confirmTarget, setConfirmTarget] = useState<{ agency: Agency; action: AgencyAction } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Agency | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      let statusQuery = statusFilter as Agency["status"] | "all";
      if (statusQuery === "all" && verificationFilter !== "all") {
        if (verificationFilter === "pending_review") statusQuery = "pending";
        else if (verificationFilter === "rejected") statusQuery = "rejected";
      }

      const res = await agencyService.getAgencies(
        {
          search: debouncedSearch || undefined,
          status: statusQuery,
          plan: planFilter as Agency["plan"] | "all",
        },
        { page, pageSize: PAGE_SIZE }
      );

      let items = res.items;
      if (verificationFilter === "verified") {
        items = items.filter((a) => a.status === "active" || a.status === "suspended");
      }

      setRows(items);
      setTotal(verificationFilter === "verified" ? items.length : res.total);
      setTotalPages(verificationFilter === "verified" ? 1 : res.totalPages);
      setStatus(items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, statusFilter, verificationFilter, planFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, verificationFilter, planFilter]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setSubmitting(true);
    const { agency, action } = confirmTarget;
    try {
      if (action === "approve") await agencyService.approveAgency(agency.id);
      if (action === "suspend") await agencyService.updateAgencyStatus(agency.id, "suspended");
      if (action === "activate") await agencyService.updateAgencyStatus(agency.id, "active");
      push(`${agency.name} was ${action}d.`, "success");
      setConfirmTarget(null);
      load();
    } catch {
      push(`Failed to ${action} ${agency.name}.`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason: string, comments?: string) {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      await agencyService.rejectAgency(rejectTarget.id, reason, comments);
      push(`${rejectTarget.name} verification was rejected (${reason}).`, "info");
      setRejectTarget(null);
      load();
    } catch {
      push(`Failed to reject ${rejectTarget.name}.`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: TableColumn<Agency>[] = [
    {
      key: "name",
      header: "Agency",
      render: (a) => (
        <div className="max-w-[220px]">
          <p className="text-sm font-medium text-ink-800 dark:text-white truncate" title={a.name}>{a.name}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400 font-mono truncate">
            {a.id} · {a.city}
          </p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (a) => (
        <span className="max-w-[160px] truncate block text-ink-700 dark:text-ink-300" title={a.owner}>
          {a.owner}
        </span>
      ),
    },
    { key: "plan", header: "Plan", render: (a) => <StatusBadge status="info" label={a.plan} tone="info" /> },
    { key: "brokers", header: "Brokers" },
    { key: "activeListings", header: "Active Listings" },
    {
      key: "status",
      header: "Verification",
      render: (a) => <KycStatusBadge status={getDerivedVerificationStatus(a.status)} size="sm" />,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/agencies/${a.id}`);
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800 dark:hover:text-brand-400"
            aria-label="View Agency"
            title="View Agency Details"
          >
            <Eye className="h-4 w-4" />
          </button>

          {/* Action buttons respecting current state */}
          {a.status === "pending" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmTarget({ agency: a, action: "approve" });
                }}
                className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600 dark:hover:bg-success-950/60 dark:hover:text-success-400"
                aria-label="Approve"
                title="Approve Agency"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectTarget(a);
                }}
                className="rounded-md p-1.5 text-ink-400 hover:bg-danger-100 hover:text-danger-600 dark:hover:bg-danger-950/60 dark:hover:text-danger-400"
                aria-label="Reject"
                title="Reject Agency"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {a.status === "active" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget({ agency: a, action: "suspend" });
              }}
              className="rounded-md p-1.5 text-ink-400 hover:bg-warning-100 hover:text-warning-600 dark:hover:bg-warning-950/60 dark:hover:text-warning-400"
              aria-label="Suspend"
              title="Suspend Agency Operations"
            >
              <Ban className="h-4 w-4" />
            </button>
          ) : a.status === "suspended" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget({ agency: a, action: "activate" });
              }}
              className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600 dark:hover:bg-success-950/60 dark:hover:text-success-400"
              aria-label="Activate"
              title="Re-activate Agency"
            >
              <PlayCircle className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Agency Management"
        description="Builders and enterprise brokerage firms on the Agency Portal."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Agencies" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by agency, owner, city, ID…" />
        <FilterDropdown
          label="Operational Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All operational", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Rejected", value: "rejected" },
          ]}
        />
        <FilterDropdown
          label="Verification"
          value={verificationFilter}
          onChange={setVerificationFilter}
          options={[
            { label: "All verification", value: "all" },
            { label: "Verified", value: "verified" },
            { label: "Pending Review", value: "pending_review" },
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
            emptyState={
              <EmptyState
                icon={Building2}
                title="No agencies match these filters"
                description="Try adjusting your search criteria or filter options."
              />
            }
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Confirmation Dialog for Approve, Suspend, Activate */}
      <ConfirmationDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        isSubmitting={submitting}
        tone={confirmTarget?.action === "suspend" ? "danger" : "brand"}
        title={confirmTarget ? `${confirmTarget.action.charAt(0).toUpperCase()}${confirmTarget.action.slice(1)} agency` : ""}
        description={
          confirmTarget?.action === "suspend"
            ? `Are you sure you want to suspend ${confirmTarget?.agency.name}? Active listings will be hidden.`
            : confirmTarget?.action === "activate"
            ? `Are you sure you want to re-activate ${confirmTarget?.agency.name}?`
            : `Are you sure you want to approve ${confirmTarget?.agency.name} and mark their credentials as verified?`
        }
      />

      {/* Structured Rejection Modal */}
      {rejectTarget && (
        <AgencyRejectModal
          open={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
          agencyName={rejectTarget.name}
          isSubmitting={submitting}
        />
      )}
    </>
  );
}
