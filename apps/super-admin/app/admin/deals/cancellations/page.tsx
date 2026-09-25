"use client";

import { useEffect, useState, useCallback } from "react";
import {
  XCircle,
  Eye,
  AlertTriangle,
  Receipt,
  Download,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { cancellationService } from "@/services/cancellationService";
import { CancellationRecord } from "@/types/cancellation";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { CancellationDetailModal } from "@/components/deals/CancellationDetailModal";

const PAGE_SIZE = 10;

export default function CancellationsPage() {
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [initiatedByFilter, setInitiatedByFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<CancellationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedRecord, setSelectedRecord] = useState<CancellationRecord | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await cancellationService.getCancellations(
        {
          search: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          initiatedBy: initiatedByFilter !== "all" ? initiatedByFilter : undefined,
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
  }, [debouncedSearch, statusFilter, initiatedByFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, initiatedByFilter]);

  async function handleApprove(id: string, notes?: string) {
    await cancellationService.approveCancellation(id, notes);
    load();
  }

  async function handleReject(id: string, reason: string) {
    await cancellationService.rejectCancellation(id, reason);
    load();
  }

  async function handleMarkPaid(id: string) {
    await cancellationService.markFeePaid(id);
    load();
  }

  const columns: TableColumn<CancellationRecord>[] = [
    {
      key: "id",
      header: "Cancellation ID",
      render: (c) => (
        <div>
          <span className="font-mono text-xs font-semibold text-danger-700">{c.id}</span>
          <p className="text-[10px] text-ink-400">Deal: {c.dealId}</p>
        </div>
      ),
    },
    {
      key: "property",
      header: "Property",
      render: (c) => (
        <div className="max-w-[200px]">
          <p className="truncate text-sm font-medium text-ink-900">{c.property.title}</p>
          <p className="truncate text-xs text-ink-500">{c.property.locality}, {c.property.city}</p>
        </div>
      ),
    },
    {
      key: "buyer",
      header: "Buyer / User",
      render: (c) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{c.buyer.name}</p>
          <p className="text-xs text-ink-500">{c.buyer.phone}</p>
        </div>
      ),
    },
    {
      key: "broker",
      header: "Broker / Agency",
      render: (c) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{c.broker.name}</p>
          <p className="text-xs text-ink-500">{c.agency?.name ?? "Broker Direct"}</p>
        </div>
      ),
    },
    {
      key: "dealAmount",
      header: "Deal Amount",
      render: (c) => (
        <span className="text-sm font-semibold text-ink-900">
          {formatCurrencyINR(c.dealAmount)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Cancellation Reason",
      render: (c) => (
        <p className="max-w-[220px] truncate text-xs text-ink-700" title={c.reason}>
          {c.reason}
        </p>
      ),
    },
    {
      key: "fee",
      header: "Cancellation Fee",
      render: (c) => (
        <div>
          <span className="font-semibold text-danger-600">
            {formatCurrencyINR(c.cancellationFeeAmount)}
          </span>
          <p className="text-[10px] text-ink-400">Rate: {c.cancellationFeePercent}%</p>
        </div>
      ),
    },
    {
      key: "refundPaymentStatus",
      header: "Payment / Settlement",
      render: (c) => {
        if (c.refundPaymentStatus === "auto_deducted") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">
              Auto-Deducted
            </span>
          );
        }
        if (c.refundPaymentStatus === "invoice_pending") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700">
              Invoice Pending
            </span>
          );
        }
        if (c.refundPaymentStatus === "invoice_paid") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              Invoice Paid
            </span>
          );
        }
        return <StatusBadge status={c.refundPaymentStatus} />;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "requestedAt",
      header: "Requested Date",
      render: (c) => <span className="text-xs text-ink-500">{formatDate(c.requestedAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRecord(c);
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 transition-colors"
            title="View Cancellation Audit Record"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Deal Cancellations"
        description="Audit cancellation requests, manage 1–2% platform cancellation fee deductions, and track payable invoices."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Deals", href: "/admin/deals" },
          { label: "Cancellations" },
        ]}
        actions={
          <button
            onClick={() => push("Exporting cancellations ledger…", "info")}
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Export Ledger
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by Cancellation ID, Deal ID, buyer, or property…"
        />

        <FilterDropdown
          label="Cancellation status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Requested", value: "requested" },
            { label: "Under Review", value: "under_review" },
            { label: "Fee Pending", value: "fee_pending" },
            { label: "Payment Pending", value: "payment_pending" },
            { label: "Approved / Executed", value: "approved" },
            { label: "Cancelled", value: "cancelled" },
            { label: "Rejected", value: "rejected" },
          ]}
        />

        <FilterDropdown
          label="Initiated by"
          value={initiatedByFilter}
          onChange={setInitiatedByFilter}
          options={[
            { label: "All initiators", value: "all" },
            { label: "Buyer / User", value: "buyer" },
            { label: "Broker", value: "broker" },
            { label: "Agency", value: "agency" },
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
            rowKey={(c) => c.id}
            isLoading={status === "loading"}
            onRowClick={(c) => setSelectedRecord(c)}
            emptyState={
              <EmptyState
                icon={XCircle}
                title="No cancellation records found"
                description="Cancelled deal requests with calculated fee settlements will appear here."
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

      {/* Cancellation Audit Modal */}
      <CancellationDetailModal
        record={selectedRecord}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkPaid={handleMarkPaid}
      />
    </>
  );
}
