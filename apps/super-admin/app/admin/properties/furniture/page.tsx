"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sofa,
  Boxes,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Layers,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { furnitureService } from "@/services/furnitureService";
import {
  FurniturePackage,
  FurnitureAsset,
  FurnitureTypeSelection,
} from "@/types/furniture";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { FurniturePackageModal } from "@/components/furniture/FurniturePackageModal";
import { FurnitureAssetModal } from "@/components/furniture/FurnitureAssetModal";

const PAGE_SIZE = 10;

export default function FurniturePropertiesPage() {
  const push = useToastStore((s) => s.push);

  // In-page Furniture Type Selector: "packages" vs "assets"
  const [furnitureType, setFurnitureType] = useState<FurnitureTypeSelection>("packages");

  // Common filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Data state
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [packageRows, setPackageRows] = useState<FurniturePackage[]>([]);
  const [assetRows, setAssetRows] = useState<FurnitureAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [selectedPackage, setSelectedPackage] = useState<FurniturePackage | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<FurnitureAsset | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
    type: "package" | "asset";
    action: "activate" | "deactivate" | "delete";
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load data based on current furniture type
  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      if (furnitureType === "packages") {
        const res = await furnitureService.getPackages(
          {
            search: debouncedSearch || undefined,
            category: categoryFilter !== "all" ? categoryFilter : undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            availability: availabilityFilter !== "all" ? availabilityFilter : undefined,
          },
          { page, pageSize: PAGE_SIZE }
        );
        setPackageRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setStatus(res.items.length === 0 ? "empty" : "success");
      } else {
        const res = await furnitureService.getAssets(
          {
            search: debouncedSearch || undefined,
            category: categoryFilter !== "all" ? categoryFilter : undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            availability: availabilityFilter !== "all" ? availabilityFilter : undefined,
          },
          { page, pageSize: PAGE_SIZE }
        );
        setAssetRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setStatus(res.items.length === 0 ? "empty" : "success");
      }
    } catch {
      setStatus("error");
    }
  }, [furnitureType, debouncedSearch, categoryFilter, statusFilter, availabilityFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page and filters when switching furniture types
  const handleTypeChange = (newType: FurnitureTypeSelection) => {
    setFurnitureType(newType);
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setAvailabilityFilter("all");
    setPage(1);
  };

  async function handleConfirmAction() {
    if (!confirmTarget) return;
    setSubmitting(true);
    const { id, name, type, action } = confirmTarget;

    try {
      if (action === "delete") {
        if (type === "package") await furnitureService.deletePackage(id);
        else await furnitureService.deleteAsset(id);
        push(`${name} deleted successfully.`, "success");
      } else {
        const newStatus = action === "activate" ? "active" : "inactive";
        if (type === "package") await furnitureService.updatePackageStatus(id, newStatus);
        else await furnitureService.updateAssetStatus(id, newStatus);
        push(`${name} marked ${newStatus}.`, "success");
      }
      loadData();
    } catch {
      push("Action failed to execute.", "error");
    } finally {
      setSubmitting(false);
      setConfirmTarget(null);
    }
  }

  // Packages Table Columns
  const packageColumns: TableColumn<FurniturePackage>[] = [
    {
      key: "id",
      header: "Package ID",
      render: (p) => <span className="font-mono text-xs font-semibold text-brand-600">{p.id}</span>,
    },
    {
      key: "name",
      header: "Package Name",
      render: (p) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{p.name}</p>
          <p className="text-xs text-ink-500 line-clamp-1">{p.description}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (p) => (
        <span className="inline-flex items-center rounded-md bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">
          {p.category}
        </span>
      ),
    },
    {
      key: "assetCount",
      header: "Assets",
      render: (p) => (
        <span className="text-xs font-medium text-ink-700">
          {p.assetCount} items
        </span>
      ),
    },
    {
      key: "price",
      header: "Package Price",
      render: (p) => (
        <div>
          <span className="text-sm font-semibold text-ink-900">{formatCurrencyINR(p.price)}</span>
          <p className="text-[10px] text-ink-400 capitalize">{p.priceType.replace(/_/g, " ")}</p>
        </div>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      render: (p) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            p.availability === "In Stock"
              ? "bg-success-50 text-success-700"
              : p.availability === "Limited Stock"
              ? "bg-warning-50 text-warning-700"
              : "bg-ink-100 text-ink-600"
          }`}
        >
          {p.availability}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      render: (p) => <span className="text-xs text-ink-500">{formatDate(p.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPackage(p);
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
            title="View Package Breakdown"
          >
            <Eye className="h-4 w-4" />
          </button>
          {p.status === "active" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget({
                  id: p.id,
                  name: p.name,
                  type: "package",
                  action: "deactivate",
                });
              }}
              className="rounded-md p-1.5 text-ink-400 hover:bg-warning-50 hover:text-warning-600"
              title="Deactivate"
            >
              <XCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget({
                  id: p.id,
                  name: p.name,
                  type: "package",
                  action: "activate",
                });
              }}
              className="rounded-md p-1.5 text-ink-400 hover:bg-success-50 hover:text-success-600"
              title="Activate"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmTarget({
                id: p.id,
                name: p.name,
                type: "package",
                action: "delete",
              });
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
            title="Delete Package"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Assets Table Columns
  const assetColumns: TableColumn<FurnitureAsset>[] = [
    {
      key: "id",
      header: "Asset ID",
      render: (a) => <span className="font-mono text-xs font-semibold text-brand-600">{a.id}</span>,
    },
    {
      key: "name",
      header: "Asset Name",
      render: (a) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{a.name}</p>
          <p className="text-xs text-ink-500">SKU: {a.sku}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (a) => (
        <span className="inline-flex items-center rounded-md bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">
          {a.category}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (a) => (
        <div>
          <span className="text-sm font-semibold text-ink-900">{formatCurrencyINR(a.price)}</span>
          <p className="text-[10px] text-ink-400 capitalize">{a.priceType.replace(/_/g, " ")}</p>
        </div>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      render: (a) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            a.availability === "In Stock"
              ? "bg-success-50 text-success-700"
              : a.availability === "Limited Stock"
              ? "bg-warning-50 text-warning-700"
              : "bg-ink-100 text-ink-600"
          }`}
        >
          {a.availability}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      render: (a) => <span className="text-xs text-ink-500">{formatDate(a.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAsset(a);
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
            title="View Asset Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {a.status === "active" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget({
                  id: a.id,
                  name: a.name,
                  type: "asset",
                  action: "deactivate",
                });
              }}
              className="rounded-md p-1.5 text-ink-400 hover:bg-warning-50 hover:text-warning-600"
              title="Deactivate"
            >
              <XCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmTarget({
                  id: a.id,
                  name: a.name,
                  type: "asset",
                  action: "activate",
                });
              }}
              className="rounded-md p-1.5 text-ink-400 hover:bg-success-50 hover:text-success-600"
              title="Activate"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmTarget({
                id: a.id,
                name: a.name,
                type: "asset",
                action: "delete",
              });
            }}
            className="rounded-md p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
            title="Delete Asset"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Furniture Management"
        description="Monitor complete setup packages and individual equipment assets within the property ecosystem."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Properties" },
          { label: "Furniture" },
        ]}
        actions={
          <button
            onClick={() =>
              push(
                `Add new ${furnitureType === "packages" ? "Package" : "Asset"} is wired for the backend creation modal.`,
                "info"
              )
            }
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add {furnitureType === "packages" ? "Package" : "Individual Asset"}
          </button>
        }
      />

      {/* Mandatory In-Page Furniture Type Switcher Dropdown & Controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
            Furniture Type
          </label>
          <div className="relative">
            <select
              value={furnitureType}
              onChange={(e) => handleTypeChange(e.target.value as FurnitureTypeSelection)}
              className="appearance-none rounded-lg border border-ink-300 bg-white py-2 pl-3.5 pr-9 text-sm font-semibold text-ink-900 shadow-sm outline-none transition-colors hover:border-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="packages">Packages (Complete Setups)</option>
              <option value="assets">Individual Assets (Single Items)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          </div>
        </div>

        {/* Informative pill indicating current active scope */}
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span className="h-2 w-2 rounded-full bg-brand-600" />
          {furnitureType === "packages"
            ? "Displaying turnkey packages (Office, Workspace, Residential, Custom)"
            : "Displaying standalone items (Chairs, Tables, Server Racks, Couches, Cafeteria)"}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={
            furnitureType === "packages"
              ? "Search by package name, ID, or specs…"
              : "Search by asset name, SKU, or specs…"
          }
        />

        <FilterDropdown
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={
            furnitureType === "packages"
              ? [
                  { label: "All Categories", value: "all" },
                  { label: "Office", value: "Office" },
                  { label: "Workspace", value: "Workspace" },
                  { label: "Residential", value: "Residential" },
                  { label: "Custom", value: "Custom" },
                  { label: "Enterprise", value: "Enterprise" },
                ]
              : [
                  { label: "All Categories", value: "all" },
                  { label: "Chairs & Seating", value: "Chairs & Seating" },
                  { label: "Conference Tables", value: "Conference Tables" },
                  { label: "Desks & Workstations", value: "Desks & Workstations" },
                  { label: "Storage & Cabinets", value: "Storage & Cabinets" },
                  { label: "Server Racks & IT", value: "Server Racks & IT" },
                  { label: "Reception & Couches", value: "Reception & Couches" },
                  { label: "Cafeteria Equipment", value: "Cafeteria Equipment" },
                  { label: "Other Equipment", value: "Other Equipment" },
                ]
          }
        />

        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All Statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Pending", value: "pending" },
          ]}
        />

        <FilterDropdown
          label="Availability"
          value={availabilityFilter}
          onChange={setAvailabilityFilter}
          options={[
            { label: "All Availabilities", value: "all" },
            { label: "In Stock", value: "In Stock" },
            { label: "Limited Stock", value: "Limited Stock" },
            { label: "Made to Order", value: "Made to Order" },
            { label: "Out of Stock", value: "Out of Stock" },
          ]}
        />
      </div>

      {/* Data Table */}
      {status === "error" ? (
        <ErrorState onRetry={loadData} />
      ) : (
        <>
          {furnitureType === "packages" ? (
            <DataTable
              columns={packageColumns}
              rows={packageRows}
              rowKey={(p) => p.id}
              isLoading={status === "loading"}
              onRowClick={(p) => setSelectedPackage(p)}
              emptyState={
                <EmptyState
                  icon={Boxes}
                  title="No furniture packages match these filters"
                  description="Adjust your search criteria or switch category."
                />
              }
            />
          ) : (
            <DataTable
              columns={assetColumns}
              rows={assetRows}
              rowKey={(a) => a.id}
              isLoading={status === "loading"}
              onRowClick={(a) => setSelectedAsset(a)}
              emptyState={
                <EmptyState
                  icon={Sofa}
                  title="No individual assets match these filters"
                  description="Adjust your search criteria or switch category."
                />
              }
            />
          )}

          {status !== "loading" && total > 0 && (
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

      {/* Package Detail Modal */}
      <FurniturePackageModal
        pkg={selectedPackage}
        open={!!selectedPackage}
        onClose={() => setSelectedPackage(null)}
        onToggleStatus={async (id, newStatus) => {
          await furnitureService.updatePackageStatus(id, newStatus);
          push(`Package ${id} marked ${newStatus}.`, "success");
          loadData();
        }}
      />

      {/* Asset Detail Modal */}
      <FurnitureAssetModal
        asset={selectedAsset}
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onToggleStatus={async (id, newStatus) => {
          await furnitureService.updateAssetStatus(id, newStatus);
          push(`Asset ${id} marked ${newStatus}.`, "success");
          loadData();
        }}
      />

      {/* Action Confirmation Dialog */}
      <ConfirmationDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
        isSubmitting={submitting}
        tone={confirmTarget?.action === "delete" ? "danger" : "brand"}
        title={
          confirmTarget?.action === "delete"
            ? `Delete ${confirmTarget.name}`
            : `${confirmTarget?.action === "activate" ? "Activate" : "Deactivate"} ${confirmTarget?.name}`
        }
        description={
          confirmTarget?.action === "delete"
            ? `Are you sure you want to permanently delete "${confirmTarget?.name}"? This action cannot be undone.`
            : `Are you sure you want to mark "${confirmTarget?.name}" as ${confirmTarget?.action}d?`
        }
      />
    </>
  );
}
