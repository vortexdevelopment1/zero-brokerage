"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Mail, Phone, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { agencyService } from "@/services/agencyService";
import { AgencyDetail } from "@/types/agency";
import { formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";

export default function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await agencyService.getAgency(id);
      setAgency(res);
      setStatus(res ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleConfirm() {
    if (!agency || !confirmAction) return;
    setSubmitting(true);
    if (confirmAction === "approve") await agencyService.approveAgency(agency.id);
    else await agencyService.rejectAgency(agency.id);
    push(`${agency.name} was ${confirmAction}d.`, "success");
    setSubmitting(false);
    setConfirmAction(null);
    load();
  }

  if (status === "loading") return <LoadingState label="Loading agency profile…" />;
  if (status === "error") return <ErrorState onRetry={load} />;
  if (!agency) return <EmptyState title="Agency not found" />;

  return (
    <>
      <PageHeader
        title={agency.name}
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Agencies", href: "/admin/agencies" }, { label: agency.name }]}
        actions={
          agency.status === "pending" ? (
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">{agency.name.charAt(0)}</div>
            <div>
              <p className="font-semibold text-ink-900">{agency.name}</p>
              <p className="text-xs text-ink-500">{agency.id}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-ink-600"><Mail className="h-4 w-4 text-ink-400" />{agency.email}</div>
            <div className="flex items-center gap-2.5 text-ink-600"><Phone className="h-4 w-4 text-ink-400" />{agency.phone}</div>
            <div className="flex items-center gap-2.5 text-ink-600"><MapPin className="h-4 w-4 text-ink-400" />{agency.city}</div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <StatusBadge status={agency.status} />
            <StatusBadge status="info" label={agency.plan} tone="info" />
          </div>
          <p className="mt-3 text-xs text-ink-400">Onboarded {formatDate(agency.createdAt)}</p>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-4 gap-3">
            <MetricTile label="Owner" value={agency.owner} />
            <MetricTile label="Seats Used" value={`${agency.seatsUsed}/${agency.seatsAllowed}`} />
            <MetricTile label="Active Listings" value={agency.activeListings} />
            <MetricTile label="Boost Credits" value={agency.boostCredits} />
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
            <div className="border-b border-ink-100 px-5 py-4"><h3 className="text-sm font-semibold text-ink-900">Broker Team</h3></div>
            <div className="divide-y divide-ink-100">
              {agency.brokerTeam.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-400">No brokers assigned yet.</p>}
              {agency.brokerTeam.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm font-medium text-ink-800">{b.name}</p>
                  <span className="text-sm text-ink-500">{b.closures} closures</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-5 text-sm text-ink-500">
            <p className="font-medium text-ink-700">Extensible for future capabilities</p>
            <p className="mt-1">Bulk CSV ingestion, sponsored campaign management, and office/furniture packaging will connect here once the corresponding backend endpoints are available.</p>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        isSubmitting={submitting}
        tone={confirmAction === "reject" ? "danger" : "brand"}
        title={confirmAction === "approve" ? "Approve agency" : "Reject agency"}
        description={`Are you sure you want to ${confirmAction} ${agency.name}?`}
      />
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}
