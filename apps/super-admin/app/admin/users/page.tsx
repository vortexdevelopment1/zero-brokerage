"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, Ban, CheckCircle2, Trash2, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { userService } from "@/services/userService";
import { AppUser, UserFilters } from "@/types/user";
import { TableColumn, ApiStatus } from "@/types/common";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";

const PAGE_SIZE = 10;

export default function UsersPage() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subFilter, setSubFilter] = useState<string>("all");
  const [verFilter, setVerFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [rows, setRows] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [confirmTarget, setConfirmTarget] = useState<{ user: AppUser; action: "block" | "unblock" | "delete" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const filters: UserFilters = {
        search: debouncedSearch || undefined,
        status: statusFilter as UserFilters["status"],
        subscription: subFilter as UserFilters["subscription"],
        verification: verFilter as UserFilters["verification"],
      };
      const res = await userService.getUsers(filters, { page, pageSize: PAGE_SIZE });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStatus(res.items.length === 0 ? "empty" : "success");
    } catch {
      setStatus("error");
    }
  }, [debouncedSearch, statusFilter, subFilter, verFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debouncedSearch, statusFilter, subFilter, verFilter]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setSubmitting(true);
    const { user, action } = confirmTarget;
    if (action === "delete") {
      await userService.deleteUser(user.id);
      push(`${user.name} was deleted.`, "success");
    } else {
      await userService.updateUserStatus(user.id, action === "block" ? "blocked" : "active");
      push(`${user.name} was ${action === "block" ? "blocked" : "unblocked"}.`, "success");
    }
    setSubmitting(false);
    setConfirmTarget(null);
    load();
  }

  const columns: TableColumn<AppUser>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {u.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-800">{u.name}</p>
            <p className="truncate text-xs text-ink-500">{u.id}</p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (u) => <span className="text-ink-600">{u.email}</span> },
    { key: "phone", header: "Phone" },
    { key: "verification", header: "Verification", render: (u) => <StatusBadge status={u.verification} /> },
    { key: "subscription", header: "Subscription", render: (u) => <span className="text-ink-600">{u.subscription}</span> },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    { key: "createdAt", header: "Created", render: (u) => <span className="text-ink-500">{formatDate(u.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${u.id}`); }}
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          {u.status === "blocked" ? (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmTarget({ user: u, action: "unblock" }); }}
              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-success-100 hover:text-success-600"
              aria-label="Unblock"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmTarget({ user: u, action: "block" }); }}
              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-warning-100 hover:text-warning-600"
              aria-label="Block"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmTarget({ user: u, action: "delete" }); }}
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="User Management" description="Seekers and renters from the User Mobile App." crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Users" }]} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone, ID…" />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Blocked", value: "blocked" },
            { label: "Pending", value: "pending" },
          ]}
        />
        <FilterDropdown
          label="Subscription"
          value={subFilter}
          onChange={setSubFilter}
          options={[
            { label: "All plans", value: "all" },
            { label: "None", value: "None" },
            { label: "Micro-Pass", value: "Micro-Pass" },
            { label: "Starter", value: "Starter" },
            { label: "Pro Seeker", value: "Pro Seeker" },
            { label: "Investor Pass", value: "Investor Pass" },
            { label: "VIP Concierge", value: "VIP Concierge" },
          ]}
        />
        <FilterDropdown
          label="Verification"
          value={verFilter}
          onChange={setVerFilter}
          options={[
            { label: "All verification", value: "all" },
            { label: "Verified", value: "verified" },
            { label: "Pending", value: "pending" },
            { label: "Unverified", value: "unverified" },
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
            onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
            emptyState={<EmptyState icon={UsersIcon} title="No users match these filters" description="Try adjusting your search or filters." />}
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
        tone={confirmTarget?.action === "delete" ? "danger" : "brand"}
        title={
          confirmTarget?.action === "delete" ? "Delete user" : confirmTarget?.action === "block" ? "Block user" : "Unblock user"
        }
        description={
          confirmTarget?.action === "delete"
            ? `This will permanently remove ${confirmTarget?.user.name} from the platform. This cannot be undone.`
            : `Are you sure you want to ${confirmTarget?.action} ${confirmTarget?.user.name}?`
        }
        confirmLabel={confirmTarget?.action === "delete" ? "Delete" : "Confirm"}
      />
    </>
  );
}
