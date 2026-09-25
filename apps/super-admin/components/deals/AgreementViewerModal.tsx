"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Deal } from "@/types/deal";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FileText,
  ShieldCheck,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Layers,
  FileCheck2,
} from "lucide-react";
import { useToastStore } from "@/store/toastStore";

interface AgreementViewerModalProps {
  deal: Deal | null;
  open: boolean;
  onClose: () => void;
  onApprove: (dealId: string, notes?: string) => Promise<void>;
  onRequestChanges: (dealId: string, reason: string) => Promise<void>;
  onReject: (dealId: string, reason: string) => Promise<void>;
}

export function AgreementViewerModal({
  deal,
  open,
  onClose,
  onApprove,
  onRequestChanges,
  onReject,
}: AgreementViewerModalProps) {
  const push = useToastStore((s) => s.push);
  const [activeTab, setActiveTab] = useState<"side_by_side" | "user_doc" | "broker_doc">("side_by_side");
  const [submitting, setSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showChangeInput, setShowChangeInput] = useState(false);
  const [reasonInput, setReasonInput] = useState("");

  if (!deal) return null;

  const userDoc = deal.userAgreement;
  const brokerDoc = deal.brokerAgreement;
  const bothUploaded = Boolean(userDoc && brokerDoc);

  const amountMismatch =
    userDoc?.specimenData.dealAmount &&
    brokerDoc?.specimenData.dealAmount &&
    userDoc.specimenData.dealAmount !== brokerDoc.specimenData.dealAmount;

  async function handleApprove() {
    setSubmitting(true);
    try {
      await onApprove(deal!.id, "Both parties submitted valid matching agreement copies.");
      push("Agreements administratively approved successfully.", "success");
      onClose();
    } catch {
      push("Failed to approve agreements.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    if (!reasonInput.trim()) {
      push("Please enter a reason or description of the required changes.", "info");
      return;
    }
    setSubmitting(true);
    try {
      await onRequestChanges(deal!.id, reasonInput.trim());
      push("Discrepancy flagged and re-upload requested.", "success");
      setShowChangeInput(false);
      setReasonInput("");
      onClose();
    } catch {
      push("Failed to flag discrepancy.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!reasonInput.trim()) {
      push("Please provide a rejection justification.", "info");
      return;
    }
    setSubmitting(true);
    try {
      await onReject(deal!.id, reasonInput.trim());
      push("Agreement documents rejected.", "info");
      setShowRejectInput(false);
      setReasonInput("");
      onClose();
    } catch {
      push("Failed to reject agreements.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Agreement Administrative Review — Deal ${deal.id}`}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="text-xs text-ink-500">
            Confirmed Platform Deal Consideration: <strong className="text-ink-900">{formatCurrencyINR(deal.dealAmount)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowChangeInput(true);
                setShowRejectInput(false);
              }}
              disabled={submitting}
              className="rounded-lg bg-warning-600 px-4 py-2 text-sm font-medium text-white hover:bg-warning-700 transition-colors"
            >
              Request Changes / Flag Discrepancy
            </button>
            <button
              onClick={() => {
                setShowRejectInput(true);
                setShowChangeInput(false);
              }}
              disabled={submitting}
              className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || !bothUploaded}
              className="rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700 transition-colors disabled:opacity-50"
              title={!bothUploaded ? "Both parties must upload documents before approval" : undefined}
            >
              Approve Agreement
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Regulatory & Administrative Scope Disclaimer */}
        <div className="flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50/70 p-3 text-xs text-brand-900">
          <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Administrative Review Notice:</strong> The platform verifies that both parties uploaded documents and performs administrative/consistency checks. The legal validity and enforceability of the externally executed agreement remains strictly between the contracting parties.
          </div>
        </div>

        {/* Mismatch Alert Banner if applicable */}
        {(amountMismatch || deal.mismatchReason) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-900">
            <AlertTriangle className="h-4 w-4 text-warning-600 shrink-0 mt-0.5" />
            <div>
              <strong>Discrepancy / Mismatch Flagged:</strong>
              <p className="mt-0.5 text-warning-800">
                {deal.mismatchReason ?? "Document stated amounts or terms differ between uploaded parties."}
              </p>
            </div>
          </div>
        )}

        {/* Change / Reject Input Pop-in */}
        {(showChangeInput || showRejectInput) && (
          <div className="rounded-xl border border-ink-300 bg-ink-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-900">
                {showChangeInput ? "Flag Discrepancy & Request Changes" : "Reject Agreement Submission"}
              </p>
              <button
                onClick={() => {
                  setShowChangeInput(false);
                  setShowRejectInput(false);
                }}
                className="text-xs text-ink-500 hover:text-ink-800"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={
                showChangeInput
                  ? "Describe the issue (e.g. Valuation amount mismatch, Missing signature on page 4, Blurred scan)..."
                  : "State reason for rejecting these agreements..."
              }
              className="w-full rounded-lg border border-ink-200 bg-white p-2.5 text-xs text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex justify-end gap-2">
              {showChangeInput ? (
                <button
                  onClick={handleRequestChanges}
                  disabled={submitting}
                  className="rounded-lg bg-warning-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-warning-700"
                >
                  Send Changes Request
                </button>
              ) : (
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="rounded-lg bg-danger-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-danger-700"
                >
                  Confirm Rejection
                </button>
              )}
            </div>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-ink-200 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("side_by_side")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "side_by_side"
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              Side-by-Side Comparison
            </button>
            <button
              onClick={() => setActiveTab("user_doc")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "user_doc"
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              Buyer Document {userDoc ? "(Uploaded)" : "(Pending)"}
            </button>
            <button
              onClick={() => setActiveTab("broker_doc")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "broker_doc"
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              Broker Document {brokerDoc ? "(Uploaded)" : "(Pending)"}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-500">Upload Status:</span>
            {bothUploaded ? (
              <span className="inline-flex items-center gap-1 text-success-600 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Both Parties Uploaded
              </span>
            ) : userDoc ? (
              <span className="inline-flex items-center gap-1 text-warning-600 font-semibold">
                <FileText className="h-3.5 w-3.5" /> Buyer Only Uploaded
              </span>
            ) : brokerDoc ? (
              <span className="inline-flex items-center gap-1 text-warning-600 font-semibold">
                <FileText className="h-3.5 w-3.5" /> Broker Only Uploaded
              </span>
            ) : (
              <span className="text-ink-400">Documents Pending</span>
            )}
          </div>
        </div>

        {/* Document Specimens View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User/Buyer Specimen Card */}
          {(activeTab === "side_by_side" || activeTab === "user_doc") && (
            <div className={`rounded-xl border ${userDoc ? "border-ink-200 bg-white" : "border-dashed border-ink-200 bg-ink-50/50"} p-4 shadow-sm`}>
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink-900">Buyer Uploaded Specimen</h4>
                    <p className="text-[11px] text-ink-500">{deal.buyer.name} ({deal.buyer.id})</p>
                  </div>
                </div>
                {userDoc ? <StatusBadge status={userDoc.status} /> : <span className="text-xs text-ink-400 italic">Not Uploaded</span>}
              </div>

              {userDoc ? (
                <div className="mt-3 space-y-3 text-xs">
                  {/* Visual Specimen Sheet */}
                  <div className="rounded-lg border border-ink-200 bg-gradient-to-b from-white to-ink-50 p-4 relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
                      <span className="rotate-[-25deg] text-3xl font-extrabold text-ink-900 uppercase">
                        {userDoc.specimenData.watermark}
                      </span>
                    </div>

                    <div className="text-center border-b border-ink-200 pb-2">
                      <p className="font-serif font-bold text-xs uppercase tracking-wide text-ink-900">
                        LEGAL DEED OF CONVEYANCE & SALE AGREEMENT
                      </p>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        Execution Reference: {userDoc.documentNumberMasked}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 text-[11px] text-ink-700">
                      <div>
                        <span className="text-ink-400">First Party (Executant): </span>
                        <span className="font-medium text-ink-900">{userDoc.specimenData.parties.firstParty}</span>
                      </div>
                      <div>
                        <span className="text-ink-400">Second Party (Claimant): </span>
                        <span className="font-medium text-ink-900">{userDoc.specimenData.parties.secondParty}</span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-ink-100/70 p-1.5">
                        <span className="font-semibold text-ink-700">Stated Agreement Value:</span>
                        <span className="font-mono font-bold text-ink-900">
                          {formatCurrencyINR(userDoc.specimenData.dealAmount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                        <div>
                          <span className="text-ink-400">Date: </span>
                          <span className="text-ink-800">{userDoc.specimenData.executionDate}</span>
                        </div>
                        <div>
                          <span className="text-ink-400">Location: </span>
                          <span className="text-ink-800">{userDoc.specimenData.place}</span>
                        </div>
                      </div>
                    </div>

                    {/* Signatures check */}
                    <div className="mt-3 border-t border-ink-200 pt-2 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-success-600">
                        <CheckCircle2 className="h-3 w-3" /> Party Signatures Verified
                      </div>
                      <div className="flex items-center gap-1 text-brand-600">
                        <Lock className="h-3 w-3" /> Official Notary Stamp
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span>Uploaded: {formatDate(userDoc.uploadedAt)}</span>
                    <span>File size: {userDoc.fileSize} ({userDoc.fileType.toUpperCase()})</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-ink-400">
                  <FileText className="mx-auto h-8 w-8 text-ink-300 mb-2" />
                  Buyer has not uploaded their signed copy yet.
                </div>
              )}
            </div>
          )}

          {/* Broker Specimen Card */}
          {(activeTab === "side_by_side" || activeTab === "broker_doc") && (
            <div className={`rounded-xl border ${brokerDoc ? "border-ink-200 bg-white" : "border-dashed border-ink-200 bg-ink-50/50"} p-4 shadow-sm`}>
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink-900">Broker Uploaded Specimen</h4>
                    <p className="text-[11px] text-ink-500">{deal.broker.name} ({deal.broker.id})</p>
                  </div>
                </div>
                {brokerDoc ? <StatusBadge status={brokerDoc.status} /> : <span className="text-xs text-ink-400 italic">Not Uploaded</span>}
              </div>

              {brokerDoc ? (
                <div className="mt-3 space-y-3 text-xs">
                  {/* Visual Specimen Sheet */}
                  <div className="rounded-lg border border-ink-200 bg-gradient-to-b from-white to-ink-50 p-4 relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
                      <span className="rotate-[-25deg] text-3xl font-extrabold text-ink-900 uppercase">
                        {brokerDoc.specimenData.watermark}
                      </span>
                    </div>

                    <div className="text-center border-b border-ink-200 pb-2">
                      <p className="font-serif font-bold text-xs uppercase tracking-wide text-ink-900">
                        COUNTER-EXECUTED LEGAL AGREEMENT RECORD
                      </p>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        Execution Reference: {brokerDoc.documentNumberMasked}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 text-[11px] text-ink-700">
                      <div>
                        <span className="text-ink-400">First Party (Executant): </span>
                        <span className="font-medium text-ink-900">{brokerDoc.specimenData.parties.firstParty}</span>
                      </div>
                      <div>
                        <span className="text-ink-400">Second Party (Claimant): </span>
                        <span className="font-medium text-ink-900">{brokerDoc.specimenData.parties.secondParty}</span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-ink-100/70 p-1.5">
                        <span className="font-semibold text-ink-700">Stated Agreement Value:</span>
                        <span className="font-mono font-bold text-ink-900">
                          {formatCurrencyINR(brokerDoc.specimenData.dealAmount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                        <div>
                          <span className="text-ink-400">Date: </span>
                          <span className="text-ink-800">{brokerDoc.specimenData.executionDate}</span>
                        </div>
                        <div>
                          <span className="text-ink-400">Location: </span>
                          <span className="text-ink-800">{brokerDoc.specimenData.place}</span>
                        </div>
                      </div>
                    </div>

                    {/* Signatures check */}
                    <div className="mt-3 border-t border-ink-200 pt-2 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-success-600">
                        <CheckCircle2 className="h-3 w-3" /> Broker Seal & Signature Affixed
                      </div>
                      <div className="flex items-center gap-1 text-brand-600">
                        <Lock className="h-3 w-3" /> Registration Seal Recorded
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span>Uploaded: {formatDate(brokerDoc.uploadedAt)}</span>
                    <span>File size: {brokerDoc.fileSize} ({brokerDoc.fileType.toUpperCase()})</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-ink-400">
                  <FileText className="mx-auto h-8 w-8 text-ink-300 mb-2" />
                  Broker has not uploaded their signed copy yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification Checklist */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2.5">
            Admin Verification Checklist
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              {userDoc ? <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" /> : <XCircle className="h-4 w-4 text-ink-300 shrink-0" />}
              <span className={userDoc ? "text-ink-800" : "text-ink-400"}>Buyer Executed Copy Uploaded</span>
            </div>
            <div className="flex items-center gap-2">
              {brokerDoc ? <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" /> : <XCircle className="h-4 w-4 text-ink-300 shrink-0" />}
              <span className={brokerDoc ? "text-ink-800" : "text-ink-400"}>Broker Counter-Signed Copy Uploaded</span>
            </div>
            <div className="flex items-center gap-2">
              {!amountMismatch ? <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" /> : <XCircle className="h-4 w-4 text-danger-600 shrink-0" />}
              <span className={!amountMismatch ? "text-ink-800" : "text-danger-600 font-medium"}>
                Consideration Matches Confirmed Amount ({formatCurrencyINR(deal.dealAmount)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
              <span className="text-ink-800">Property Title & Identification Corresponds</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
