"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCircle2, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { userService } from "@/services/userService";
import { AppUserDetail } from "@/types/user";
import { formatDate, formatDateTime, formatCurrencyINR } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [user, setUser] = useState<AppUserDetail | null>(null);
  const [confirmAction, setConfirmAction] = useState<"block" | "unblock" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await userService.getUser(id);
      setUser(res);
      setStatus(res ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm() {
    if (!user || !confirmAction) return;
    setSubmitting(true);
    await userService.updateUserStatus(user.id, confirmAction === "block" ? "blocked" : "active");
    setSubmitting(false);
    setConfirmAction(null);
    push(`${user.name} was ${confirmAction === "block" ? "blocked" : "unblocked"}.`, "success");
    load();
  }

  if (status === "loading") return <LoadingState label="Loading user profile…" />;
  if (status === "error") return <ErrorState onRetry={load} />;
  if (!user) return <EmptyState title="User not found" description="This user may have been removed." />;

  return (
    <>
      <PageHeader
        title={user.name}
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Users", href: "/admin/users" },
          { label: user.name },
        ]}
        actions={
          user.status === "blocked" ? (
            <button
              onClick={() => setConfirmAction("unblock")}
              className="flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-success-600/90"
            >
              <CheckCircle2 className="h-4 w-4" /> Unblock user
            </button>
          ) : (
            <button
              onClick={() => setConfirmAction("block")}
              className="flex items-center gap-1.5 rounded-lg bg-danger-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-600/90"
            >
              <Ban className="h-4 w-4" /> Block user
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-ink-900">{user.name}</p>
              <p className="text-xs text-ink-500">{user.id}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <InfoRow icon={Mail} label={user.email} />
            <InfoRow icon={Phone} label={user.phone} />
            <InfoRow icon={MapPin} label={user.city} />
            <InfoRow icon={Calendar} label={`Joined ${formatDate(user.createdAt)}`} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <StatusBadge status={user.status} />
            <StatusBadge status={user.verification} label={`${user.verification} · KYC`} />
            <StatusBadge status="info" label={user.subscription} tone="info" />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <MetricTile label="Searches" value={user.activity.searches} />
            <MetricTile label="Saved Properties" value={user.activity.savedProperties} />
            <MetricTile label="Owner Contacts Used" value={user.activity.ownerContactsUsed} />
          </div>
          <p className="text-xs text-ink-400">Last active {formatDateTime(user.activity.lastActiveAt)}</p>

          <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">Visit History</h3>
            </div>
            <div className="divide-y divide-ink-100">
              {user.visits.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-400">No visits scheduled yet.</p>}
              {user.visits.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{v.property}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(v.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={v.status.toLowerCase()} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">Transaction History</h3>
            </div>
            <div className="divide-y divide-ink-100">
              {user.transactions.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-400">No transactions yet.</p>}
              {user.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{t.type}</p>
                    <p className="text-xs text-ink-500">{formatDate(t.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink-700">{formatCurrencyINR(t.amount)}</span>
                    <StatusBadge status={t.status.toLowerCase()} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        isSubmitting={submitting}
        tone={confirmAction === "block" ? "danger" : "brand"}
        title={confirmAction === "block" ? "Block user" : "Unblock user"}
        description={`Are you sure you want to ${confirmAction} ${user.name}?`}
      />
    </>
  );
}

function InfoRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink-600">
      <Icon className="h-4 w-4 shrink-0 text-ink-400" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
