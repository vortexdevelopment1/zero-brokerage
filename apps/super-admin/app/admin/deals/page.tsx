"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake,
  Eye,
  FileCheck2,
  AlertTriangle,
  XCircle,
  Download,
  Building,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { dealService } from "@/services/dealService";
import { Deal, DealFilters } from "@/types/deal";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;

export default function AllDealsPage() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agreementStatusFilter, setAgreementStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await dealService.getDeals(
        {
          search: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          agreementStatus: agreementStatusFilter !== "all" ? agreementStatusFilter : undefined,
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
  }, [debouncedSearch, statusFilter, agreementStatusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, agreementStatusFilter]);

  const columns: TableColumn<Deal>[] = [
    {
      key: "id",
      header: "Deal ID",
      render: (d) => (
        <div>
          <span className="font-mono text-xs font-semibold text-brand-600">{d.id}</span>
          <p className="text-[11px] text-ink-400 capitalize">{d.stage.toLowerCase().replace(/_/g, " ")}</p>
        </div>
      ),
    },
    {
      key: "buyer",
      header: "Buyer / User",
      render: (d) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{d.buyer.name}</p>
          <p className="text-xs text-ink-500">{d.buyer.phone}</p>
        </div>
      ),
    },
    {
      key: "broker",
      header: "Broker / Agency",
      render: (d) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{d.broker.name}</p>
          <p className="text-xs text-ink-500">{d.agency?.name ?? "Independent Broker"}</p>
        </div>
      ),
    },
    {
      key: "property",
      header: "Property",
      render: (d) => (
        <div className="max-w-[220px]">
          <p className="truncate text-sm font-medium text-ink-900">{d.property.title}</p>
          <p className="truncate text-xs text-ink-500">{d.property.locality}, {d.property.city}</p>
        </div>
      ),
    },
    {
      key: "dealAmount",
      header: "Deal Amount",
      render: (d) => (
        <div>
          <span className="text-sm font-semibold text-ink-900">{formatCurrencyINR(d.dealAmount)}</span>
          <p className="text-[10px] text-ink-400">
            {d.paymentMode === "platform_collected" ? "Platform Escrow" : "External Settlement"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Deal Status",
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: "agreementStatus",
      header: "Agreement Status",
      render: (d) => {
        if (d.agreementStatus === "mismatch_flagged") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-100 px-2.5 py-0.5 text-xs font-medium text-danger-700">
              <AlertTriangle className="h-3 w-3" /> Mismatch
            </span>
          );
        }
        if (d.agreementStatus === "both_uploaded") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              <FileCheck2 className="h-3 w-3" /> Both Uploaded
            </span>
          );
        }
        return <StatusBadge status={d.agreementStatus} />;
      },
    },
    {
      key: "createdAt",
      header: "Created Date",
      render: (d) => <span className="text-xs text-ink-500">{formatDate(d.createdAt)}</span>,
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (d) => <span className="text-xs text-ink-500">{formatDate(d.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/deals/${d.id}`);
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 transition-colors"
            title="View Deal Details"
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
        title="All Deals"
        description="Monitor and manage the complete transaction deal lifecycle from negotiation to closing."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Deals" },
          { label: "All Deals" },
        ]}
        actions={
          <button
            onClick={() => push("Deal ledger export initiated.", "info")}
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
          placeholder="Search by Deal ID, buyer, broker, agency, or property…"
        />

        <FilterDropdown
          label="Deal status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Negotiation", value: "negotiation" },
            { label: "Deal Initiated", value: "deal_initiated" },
            { label: "Amount Confirmed", value: "amount_confirmed" },
            { label: "Agreement Pending", value: "agreement_pending" },
            { label: "Agreement Completed", value: "agreement_completed" },
            { label: "Deal Done", value: "deal_done" },
            { label: "Cancelled", value: "cancelled" },
          ]}
        />

        <FilterDropdown
          label="Agreement status"
          value={agreementStatusFilter}
          onChange={setAgreementStatusFilter}
          options={[
            { label: "All agreement statuses", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Buyer Uploaded Only", value: "user_uploaded" },
            { label: "Broker Uploaded Only", value: "broker_uploaded" },
            { label: "Both Uploaded", value: "both_uploaded" },
            { label: "Mismatch Flagged", value: "mismatch_flagged" },
            { label: "Completed / Verified", value: "completed" },
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
            onRowClick={(d) => router.push(`/admin/deals/${d.id}`)}
            emptyState={
              <EmptyState
                icon={Handshake}
                title="No deals found matching these filters"
                description="Try clearing search or filters to see all transaction records."
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
    </>
  );
}
