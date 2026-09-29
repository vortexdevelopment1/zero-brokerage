"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { dealService } from "@/services/dealService";
import { Deal, AgreementReviewStatus } from "@/types/deal";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { AgreementViewerModal } from "@/components/deals/AgreementViewerModal";

const PAGE_SIZE = 10;

export default function AgreementReviewPage() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await dealService.getAgreementsForReview(
        {
          search: debouncedSearch || undefined,
          reviewStatus: reviewStatusFilter !== "all" ? reviewStatusFilter : undefined,
        },
        { page, pageSize: PAGE_SIZE }
      );
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, reviewStatusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, reviewStatusFilter]);

  async function handleApproveAgreements(dealId: string, notes?: string) {
    await dealService.approveAgreements(dealId, notes);
    load();
  }

  async function handleRequestChanges(dealId: string, reason: string) {
    await dealService.requestAgreementChanges(dealId, reason);
    load();
  }

  async function handleRejectAgreements(dealId: string, reason: string) {
    await dealService.rejectAgreements(dealId, reason);
    load();
  }

  const columns: TableColumn<Deal>[] = [
    {
      key: "id",
      header: "Deal ID",
      render: (d) => <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{d.id}</span>,
    },
    {
      key: "property",
      header: "Property",
      render: (d) => (
        <div className="max-w-[200px]">
          <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{d.property.title}</p>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400">{d.property.locality}, {d.property.city}</p>
        </div>
      ),
    },
    {
      key: "buyer",
      header: "Buyer / User",
      render: (d) => (
        <div className="max-w-[160px]">
          <p className="truncate text-sm font-medium text-ink-900 dark:text-white" title={d.buyer.name}>{d.buyer.name}</p>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400 font-mono">ID: {d.buyer.id}</p>
        </div>
      ),
    },
    {
      key: "broker",
      header: "Broker / Agency",
      render: (d) => (
        <div className="max-w-[160px]">
          <p className="truncate text-sm font-medium text-ink-900 dark:text-white" title={d.broker.name}>{d.broker.name}</p>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400" title={d.agency?.name ?? "Independent Broker"}>{d.agency?.name ?? "Independent Broker"}</p>
        </div>
      ),
    },
    {
      key: "agreementStatus",
      header: "Upload Records",
      render: (d) => {
        const hasUser = Boolean(d.userAgreement);
        const hasBroker = Boolean(d.brokerAgreement);
        if (hasUser && hasBroker) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-200 dark:bg-success-950/70 dark:text-success-300 dark:ring-success-900/50">
              <CheckCircle2 className="h-3 w-3" /> Both Uploaded
            </span>
          );
        }
        if (hasUser) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-950/70 dark:text-brand-300 dark:ring-brand-900/50">
              Buyer Only
            </span>
          );
        }
        if (hasBroker) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:ring-indigo-900/50">
              Broker Only
            </span>
          );
        }
        return <span className="text-xs text-ink-400 italic dark:text-ink-500">None Uploaded</span>;
      },
    },
    {
      key: "uploadedAt",
      header: "Uploaded Date",
      render: (d) => {
        const date = d.brokerAgreement?.uploadedAt ?? d.userAgreement?.uploadedAt ?? d.updatedAt;
        return <span className="text-xs text-ink-500 dark:text-ink-400">{formatDate(date)}</span>;
      },
    },
    {
      key: "reviewStatus",
      header: "Review Status",
      render: (d) => {
        if (d.reviewStatus === "changes_requested" || d.agreementStatus === "mismatch_flagged") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2.5 py-1 text-xs font-semibold text-warning-800 ring-1 ring-inset ring-warning-200 dark:bg-warning-950/70 dark:text-warning-300 dark:ring-warning-900/50">
              <AlertTriangle className="h-3.5 w-3.5 text-warning-600 dark:text-warning-400" /> Changes Requested
            </span>
          );
        }
        return <StatusBadge status={d.reviewStatus} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDeal(d);
            }}
            className="flex items-center gap-1 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/50"
          >
            <FileText className="h-3.5 w-3.5" /> Review
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Agreement Review Queue"
        description="Verify uploaded external legal agreements, inspect party signatures, and check valuation consistency."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Deals", href: "/admin/deals" },
          { label: "Agreement Review" },
        ]}
      />

      {/* Scope Disclaimer Alert */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-ink-200 bg-white p-3.5 text-xs text-ink-600 shadow-sm dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
        <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-ink-800 dark:text-white">Administrative Verification Scope:</strong> This queue enables administrative checks for dual-party upload completion and valuation consistency. Legal execution and enforceability of external deeds rests between the buyer and broker/seller parties.
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by Deal ID, buyer, broker, or property title…"
        />

        <FilterDropdown
          label="Review status"
          value={reviewStatusFilter}
          onChange={setReviewStatusFilter}
          options={[
            { label: "All review statuses", value: "all" },
            { label: "Pending Review", value: "pending_review" },
            { label: "Changes Requested / Flagged", value: "changes_requested" },
            { label: "Approved / Completed", value: "approved" },
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
            rowKey={(d) => d.id}
            isLoading={status === "loading"}
            onRowClick={(d) => setSelectedDeal(d)}
            emptyState={
              <EmptyState
                icon={FileCheck2}
                title="No agreements in review queue"
                description="Agreements uploaded by buyers or brokers will appear here for administrative verification."
              />
            }
          />
          {status !== "loading" && rows.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Agreement Review Modal */}
      <AgreementViewerModal
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onApprove={handleApproveAgreements}
        onRequestChanges={handleRequestChanges}
        onReject={handleRejectAgreements}
      />
    </>
  );
}
