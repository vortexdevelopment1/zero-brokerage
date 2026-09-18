"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MapPin, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { propertyService } from "@/services/propertyService";
import { PropertyDetail } from "@/types/property";
import { formatCurrencyINR, formatDate, titleCase } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";

const CATEGORY_ROUTE: Record<string, string> = {
  residential: "/admin/properties/residential",
  commercial: "/admin/properties/commercial",
  land: "/admin/properties/land",
  furniture: "/admin/properties/furniture",
};

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await propertyService.getProperty(id);
      setProperty(res);
      setStatus(res ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleConfirm() {
    if (!property || !confirmAction) return;
    setSubmitting(true);
    if (confirmAction === "approve") await propertyService.approveProperty(property.id);
    else await propertyService.rejectProperty(property.id);
    push(`Property marked ${confirmAction}d.`, "success");
    setSubmitting(false);
    setConfirmAction(null);
    load();
  }

  if (status === "loading") return <LoadingState label="Loading property…" />;
  if (status === "error") return <ErrorState onRetry={load} />;
  if (!property) return <EmptyState title="Property not found" />;

  return (
    <>
      <PageHeader
        title={property.title}
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Properties", href: CATEGORY_ROUTE[property.category] },
          { label: property.title },
        ]}
        actions={
          property.status === "pending" ? (
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
        <div className="lg:col-span-2 space-y-4">
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50">
            <div className="text-center text-ink-400">
              <ImageIcon className="mx-auto h-8 w-8" />
              <p className="mt-2 text-xs">{property.images} media assets on file (gallery connects to media service)</p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
            <h3 className="text-sm font-semibold text-ink-900">Description</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{property.description}</p>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
            <h3 className="text-sm font-semibold text-ink-900">Attributes</h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(property.attributes).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-ink-50 px-3.5 py-2.5">
                  <dt className="text-xs text-ink-500">{k}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-ink-400">
              Stored as flexible PostgreSQL JSONB attributes per category, per SOW §4.1.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
            <p className="text-2xl font-semibold text-ink-900">
              {formatCurrencyINR(property.price)}
              {property.priceUnit === "rent-month" && <span className="text-sm font-normal text-ink-400"> /month</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={property.status} />
              {property.isLuxury && <StatusBadge status="info" label="Luxury (0% brokerage)" tone="brand" />}
              {property.isPremium && <StatusBadge status="info" label="Premium" tone="info" />}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-ink-600">
              <MapPin className="h-4 w-4 text-ink-400" /> {property.locality}, {property.city}
            </div>
            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <Row label="Category" value={titleCase(property.category)} />
              <Row label="Subtype" value={property.subtype} />
              <Row label="Broker" value={property.broker ?? "—"} />
              <Row label="Agency" value={property.agency ?? "—"} />
              <Row label="Listed" value={formatDate(property.createdAt)} />
              <Row label="Coordinates" value={`${property.coordinates.lat.toFixed(4)}, ${property.coordinates.lng.toFixed(4)}`} />
            </dl>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        isSubmitting={submitting}
        tone={confirmAction === "reject" ? "danger" : "brand"}
        title={confirmAction === "approve" ? "Approve property" : "Reject property"}
        description={`Are you sure you want to ${confirmAction} "${property.title}"?`}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-800">{value}</dd>
    </div>
  );
}
