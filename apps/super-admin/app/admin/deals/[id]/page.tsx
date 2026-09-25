"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building,
  Building2,
  MapPin,
  FileText,
  AlertTriangle,
  Wallet,
  Receipt,
  Eye,
  ShieldCheck,
  Calendar,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { dealService } from "@/services/dealService";
import { Deal } from "@/types/deal";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";
import { DealStepper } from "@/components/deals/DealStepper";
import { AgreementViewerModal } from "@/components/deals/AgreementViewerModal";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await dealService.getDeal(id);
      setDeal(res);
      setStatus(res ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function handleMarkDone() {
    if (!deal) return;
    setSubmitting(true);
    try {
      await dealService.markDealDone(deal.id);
      push(`Deal ${deal.id} marked as Done. Listing deactivated from search.`, "success");
      setConfirmDoneOpen(false);
      load();
    } catch {
      push("Failed to mark deal done.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return <LoadingState label="Loading deal details…" />;
  if (status === "error") return <ErrorState onRetry={load} />;
  if (!deal) return <EmptyState title="Deal not found" description="The requested deal reference does not exist." />;

  const userDoc = deal.userAgreement;
  const brokerDoc = deal.brokerAgreement;
  const bothUploaded = Boolean(userDoc && brokerDoc);

  return (
    <>
      <PageHeader
        title={`Deal ${deal.id}`}
        description={`${deal.property.title} · ${deal.property.locality}, ${deal.property.city}`}
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Deals", href: "/admin/deals" },
          { label: deal.id },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {(deal.userAgreement || deal.brokerAgreement) && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <FileText className="h-4 w-4" /> Review Agreements
              </button>
            )}

            {deal.stage === "AGREEMENT_COMPLETED" && (
              <button
                onClick={() => setConfirmDoneOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-success-700 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Deal Done
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        {/* Deal Lifecycle Stepper */}
        <DealStepper
          currentStage={deal.stage}
          hasMismatch={deal.agreementStatus === "mismatch_flagged"}
          cancellationId={deal.cancellationId}
        />

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Agreements & Financial Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agreement Verification Status Card */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between border-b border-ink-100 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">
                    Agreement Verification & Upload Records
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Separate upload records are maintained for both parties per platform policy.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={deal.agreementStatus} />
                  {deal.reviewStatus && <StatusBadge status={deal.reviewStatus} />}
                </div>
              </div>

              {deal.mismatchReason && (
                <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Flagged Mismatch / Discrepancy:</span>
                    <p className="mt-0.5 text-warning-800">{deal.mismatchReason}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Upload Record */}
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-900">Buyer Uploaded Agreement</span>
                    {userDoc ? <StatusBadge status={userDoc.status} /> : <span className="text-xs text-ink-400">Pending</span>}
                  </div>
                  {userDoc ? (
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="text-ink-700 font-medium">{userDoc.title}</p>
                      <p className="text-ink-500">Ref: {userDoc.documentNumberMasked}</p>
                      <p className="text-ink-500">Uploaded: {formatDate(userDoc.uploadedAt)}</p>
                      <p className="text-ink-500">File size: {userDoc.fileSize}</p>
                      <button
                        onClick={() => setReviewModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Buyer Specimen
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-center py-6 text-xs text-ink-400">
                      Waiting for buyer to upload signed legal deed.
                    </div>
                  )}
                </div>

                {/* Broker Upload Record */}
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-900">Broker Uploaded Agreement</span>
                    {brokerDoc ? <StatusBadge status={brokerDoc.status} /> : <span className="text-xs text-ink-400">Pending</span>}
                  </div>
                  {brokerDoc ? (
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="text-ink-700 font-medium">{brokerDoc.title}</p>
                      <p className="text-ink-500">Ref: {brokerDoc.documentNumberMasked}</p>
                      <p className="text-ink-500">Uploaded: {formatDate(brokerDoc.uploadedAt)}</p>
                      <p className="text-ink-500">File size: {brokerDoc.fileSize}</p>
                      <button
                        onClick={() => setReviewModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Broker Specimen
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-center py-6 text-xs text-ink-400">
                      Waiting for broker to upload counter-signed copy.
                    </div>
                  )}
                </div>
              </div>

              {/* Action row */}
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  <span>Administrative document consistency check enabled.</span>
                </div>
                {(userDoc || brokerDoc) && (
                  <button
                    onClick={() => setReviewModalOpen(true)}
                    className="rounded-lg bg-ink-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-ink-800"
                  >
                    Open Agreement Review Modal
                  </button>
                )}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-brand-600" /> Activity & Audit History
              </h3>
              <div className="space-y-4">
                {deal.auditTimeline.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-xs">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-brand-100 shrink-0" />
                    <div className="flex-1 rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink-900 capitalize">
                          {item.stage.toLowerCase().replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-ink-400">{formatDate(item.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-ink-700 leading-relaxed">{item.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-400">
                        <span>Actor: <strong className="text-ink-600">{item.actor}</strong> ({item.role})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Financial, Parties, Property */}
          <div className="space-y-6">
            {/* Financial & Payment Logic Card */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <h3 className="text-sm font-semibold text-ink-900 border-b border-ink-100 pb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-brand-600" /> Financial & Consideration
              </h3>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-ink-500">Confirmed Deal Value:</span>
                  <p className="text-xl font-bold text-ink-900">{formatCurrencyINR(deal.dealAmount)}</p>
                </div>

                <div className="border-t border-ink-100 pt-2.5">
                  <span className="text-ink-500">Transaction Mode:</span>
                  <p className="font-medium text-ink-800 capitalize mt-0.5">
                    {deal.paymentMode === "platform_collected"
                      ? "Platform Collected (Escrow Held)"
                      : "External Transaction (Direct Settlement)"}
                  </p>
                </div>

                {deal.heldDepositAmount > 0 && (
                  <div className="flex justify-between border-t border-ink-100 pt-2 text-ink-700">
                    <span>Token Deposit Held:</span>
                    <span className="font-semibold text-ink-900">{formatCurrencyINR(deal.heldDepositAmount)}</span>
                  </div>
                )}

                <div className="rounded-lg bg-ink-50 p-3 text-[11px] text-ink-600 leading-relaxed border border-ink-100">
                  <strong>Cancellation Fee Exposure:</strong> If cancelled prior to agreement execution, 1–2% cancellation fee ({formatCurrencyINR((deal.dealAmount * 1.5) / 100)}) is {deal.paymentMode === "platform_collected" ? "auto-deducted from held deposit" : "invoiced directly to user"}.
                </div>
              </div>
            </div>

            {/* Buyer Info Card */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-600" /> Buyer / User
                </h3>
                <Link
                  href={`/admin/users/${deal.buyer.id}`}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  View Profile
                </Link>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-ink-700">
                <p className="text-sm font-medium text-ink-900">{deal.buyer.name}</p>
                <p><span className="text-ink-400">ID:</span> {deal.buyer.id}</p>
                <p><span className="text-ink-400">Email:</span> {deal.buyer.email}</p>
                <p><span className="text-ink-400">Phone:</span> {deal.buyer.phone}</p>
              </div>
            </div>

            {/* Broker & Agency Info Card */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-600" /> Broker & Agency
                </h3>
                <Link
                  href={`/admin/brokers/${deal.broker.id}`}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  View Broker
                </Link>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-ink-700">
                <p className="text-sm font-medium text-ink-900">{deal.broker.name}</p>
                <p><span className="text-ink-400">ID:</span> {deal.broker.id}</p>
                <p><span className="text-ink-400">Phone:</span> {deal.broker.phone}</p>
                <p><span className="text-ink-400">License:</span> {deal.broker.license}</p>
                {deal.agency && (
                  <div className="mt-2 border-t border-ink-100 pt-2">
                    <span className="text-ink-400">Agency Affiliation:</span>
                    <p className="font-semibold text-ink-900 mt-0.5">{deal.agency.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Property Card */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <Building className="h-4 w-4 text-brand-600" /> Property
                </h3>
                <Link
                  href={`/admin/properties/${deal.property.id}`}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  View Property
                </Link>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-ink-700">
                <p className="text-sm font-medium text-ink-900">{deal.property.title}</p>
                <p className="flex items-center gap-1 text-ink-500">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" />
                  {deal.property.locality}, {deal.property.city}
                </p>
                <p><span className="text-ink-400">Category:</span> {deal.property.subtype} ({deal.property.category})</p>
                <p><span className="text-ink-400">Listed Price:</span> {formatCurrencyINR(deal.property.price)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agreement Review Modal */}
      <AgreementViewerModal
        deal={deal}
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onApprove={handleApproveAgreements}
        onRequestChanges={handleRequestChanges}
        onReject={handleRejectAgreements}
      />

      {/* Confirmation to mark deal done */}
      <ConfirmationDialog
        open={confirmDoneOpen}
        onClose={() => setConfirmDoneOpen(false)}
        onConfirm={handleMarkDone}
        isSubmitting={submitting}
        tone="brand"
        title="Mark Deal as Done"
        description={`Are you sure you want to mark Deal ${deal.id} as Done? This will close the transaction lifecycle and remove the listing from active marketplace search visibility.`}
      />
    </>
  );
}
