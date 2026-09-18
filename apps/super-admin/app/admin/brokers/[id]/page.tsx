"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Mail, Phone, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { brokerService } from "@/services/brokerService";
import { BrokerDetail } from "@/types/broker";
import { formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";

export default function BrokerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [broker, setBroker] = useState<BrokerDetail | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await brokerService.getBroker(id);
      setBroker(res);
      setStatus(res ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleConfirm() {
    if (!broker || !confirmAction) return;
    setSubmitting(true);
    if (confirmAction === "approve") await brokerService.approveBroker(broker.id);
    else await brokerService.rejectBroker(broker.id);
    push(`${broker.name} was ${confirmAction}d.`, "success");
    setSubmitting(false);
    setConfirmAction(null);
    load();
  }

  if (status === "loading") return <LoadingState label="Loading broker profile…" />;
  if (status === "error") return <ErrorState onRetry={load} />;
  if (!broker) return <EmptyState title="Broker not found" />;

  return (
    <>
      <PageHeader
        title={broker.name}
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Brokers", href: "/admin/brokers" }, { label: broker.name }]}
        actions={
          broker.verification === "pending" ? (
            <>
              <button onClick={() => setConfirmAction("approve")} className="flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-success-600/90">
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button onClick={() => setConfirmAction("reject")} className="flex items-center gap-1.5 rounded-lg bg-danger-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-danger-600/90">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">{broker.name.charAt(0)}</div>
            <div>
              <p className="font-semibold text-ink-900">{broker.name}</p>
              <p className="text-xs text-ink-500">{broker.id}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-ink-600"><Mail className="h-4 w-4 text-ink-400" />{broker.email}</div>
            <div className="flex items-center gap-2.5 text-ink-600"><Phone className="h-4 w-4 text-ink-400" />{broker.phone}</div>
            <div className="flex items-center gap-2.5 text-ink-600"><MapPin className="h-4 w-4 text-ink-400" />{broker.city}</div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <StatusBadge status={broker.verification} />
            <StatusBadge status={broker.status} />
          </div>
          <p className="mt-3 text-xs text-ink-400">Joined {formatDate(broker.createdAt)}</p>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-4 gap-3">
            <MetricTile label="Rating" value={`★ ${broker.rating.toFixed(1)}`} />
            <MetricTile label="Properties" value={broker.propertiesListed} />
            <MetricTile label="Closures" value={broker.closures} />
            <MetricTile label="Rank Score" value={broker.rankScore.toFixed(2)} />
          </div>
          <p className="text-xs text-ink-400">
            Rank score = (Verification × 0.40) + (Rating × 0.30) + (Closures × 0.30) — computed by the backend ranking service.
          </p>

          <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
            <div className="border-b border-ink-100 px-5 py-4"><h3 className="text-sm font-semibold text-ink-900">Recent Listings</h3></div>
            <div className="divide-y divide-ink-100">
              {broker.recentListings.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-400">No listings yet.</p>}
              {broker.recentListings.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm font-medium text-ink-800">{l.title}</p>
                  <StatusBadge status={l.status.toLowerCase().replace(/\s+/g, "-")} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
            <div className="border-b border-ink-100 px-5 py-4"><h3 className="text-sm font-semibold text-ink-900">Reviews & Ratings</h3></div>
            <div className="divide-y divide-ink-100">
              {broker.reviews.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-400">No reviews yet.</p>}
              {broker.reviews.map((r) => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-800">{r.reviewer}</p>
                    <span className="text-sm font-medium text-accent-600">★ {r.rating}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{r.comment}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{formatDate(r.date)}</p>
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
        tone={confirmAction === "reject" ? "danger" : "brand"}
        title={confirmAction === "approve" ? "Approve broker" : "Reject broker"}
        description={`Are you sure you want to ${confirmAction} ${broker.name}?`}
      />
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
