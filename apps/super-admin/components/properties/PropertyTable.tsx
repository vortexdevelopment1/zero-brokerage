"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle2, XCircle, EyeOff, Ban, Boxes } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { propertyService } from "@/services/propertyService";
import { Property, PropertyMainCategory } from "@/types/property";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;
type PropertyAction = "approve" | "reject" | "unavailable" | "hidden";

export function PropertyTable({
  category,
  title,
  description,
}: {
  category: PropertyMainCategory;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const debouncedLocation = useDebounce(locationFilter, 300);
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<{ property: Property; action: PropertyAction } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await propertyService.getProperties(
        {
          category,
          search: debouncedSearch || undefined,
          status: statusFilter as Property["status"] | "all",
          location: debouncedLocation || undefined,
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
  }, [category, debouncedSearch, statusFilter, debouncedLocation, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, debouncedLocation, category]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setSubmitting(true);
    const { property, action } = confirmTarget;
    if (action === "approve") await propertyService.approveProperty(property.id);
    else if (action === "reject") await propertyService.rejectProperty(property.id);
    else await propertyService.updatePropertyStatus(property.id, action);
    push(`${property.title} marked ${action}.`, "success");
    setSubmitting(false);
    setConfirmTarget(null);
    load();
  }

  const columns: TableColumn<Property>[] = [
    {
      key: "title",
      header: "Property",
      render: (p) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="max-w-xs truncate text-sm font-medium text-ink-800">{p.title}</p>
            {p.isLuxury && <StatusBadge status="info" label="Luxury" tone="brand" />}
            {p.isPremium && !p.isLuxury && <StatusBadge status="info" label="Premium" tone="info" />}
          </div>
          <p className="text-xs text-ink-500">{p.id} · {p.subtype}</p>
        </div>
      ),
    },
    { key: "location", header: "Location", render: (p) => <span className="text-ink-600">{p.locality}, {p.city}</span> },
    {
      key: "price",
      header: "Price",
      render: (p) => (
        <span className="text-ink-700">
          {formatCurrencyINR(p.price)}
          {p.priceUnit === "rent-month" && <span className="text-ink-400"> /mo</span>}
        </span>
      ),
    },
    { key: "broker", header: "Broker / Agency", render: (p) => <span className="text-ink-600">{p.broker ?? p.agency ?? "—"}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "createdAt", header: "Listed", render: (p) => <span className="text-ink-500">{formatDate(p.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/properties/${p.id}`); }} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600" aria-label="View">
            <Eye className="h-4 w-4" />
          </button>
          {p.status === "pending" && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ property: p, action: "approve" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-success-100 hover:text-success-600" aria-label="Approve">
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ property: p, action: "reject" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-danger-100 hover:text-danger-600" aria-label="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {p.status !== "unavailable" && (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ property: p, action: "unavailable" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-warning-100 hover:text-warning-600" aria-label="Mark unavailable">
              <Ban className="h-4 w-4" />
            </button>
          )}
          {p.status !== "hidden" && (
            <button onClick={(e) => { e.stopPropagation(); setConfirmTarget({ property: p, action: "hidden" }); }} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-200 hover:text-ink-700" aria-label="Hide">
              <EyeOff className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={title} description={description} crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Properties" }, { label: title }]} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title, broker, agency, ID…" />
        <SearchBar value={locationFilter} onChange={setLocationFilter} placeholder="Filter by city or locality…" />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
            { label: "Unavailable", value: "unavailable" },
            { label: "Hidden", value: "hidden" },
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
            rowKey={(p) => p.id}
            isLoading={status === "loading"}
            onRowClick={(p) => router.push(`/admin/properties/${p.id}`)}
            emptyState={<EmptyState icon={Boxes} title="No properties match these filters" description="Try adjusting your search or filters." />}
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
        tone={confirmTarget?.action === "reject" || confirmTarget?.action === "unavailable" ? "danger" : "brand"}
        title={confirmTarget ? `Mark property as ${confirmTarget.action}` : ""}
        description={`Are you sure you want to mark "${confirmTarget?.property.title}" as ${confirmTarget?.action}?`}
      />
    </>
  );
}
