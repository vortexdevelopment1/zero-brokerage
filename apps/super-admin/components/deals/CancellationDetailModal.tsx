"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CancellationRecord } from "@/types/cancellation";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertCircle,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wallet,
  FileText,
} from "lucide-react";
import { useToastStore } from "@/store/toastStore";

interface CancellationDetailModalProps {
  record: CancellationRecord | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
}

export function CancellationDetailModal({
  record,
  open,
  onClose,
  onApprove,
  onReject,
  onMarkPaid,
}: CancellationDetailModalProps) {
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!record) return null;

  const isPlatformCollected = record.paymentMode === "platform_collected";

  async function handleApprove() {
    setSubmitting(true);
    try {
      await onApprove(record!.id);
      push(`Cancellation ${record!.id} approved and fee processed.`, "success");
      onClose();
    } catch {
      push("Failed to approve cancellation.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      push("Please enter a rejection justification.", "info");
      return;
    }
    setSubmitting(true);
    try {
      await onReject(record!.id, rejectReason.trim());
      push(`Cancellation request rejected. Deal workflow reinstated.`, "info");
      setRejecting(false);
      setRejectReason("");
      onClose();
    } catch {
      push("Failed to reject cancellation.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkPaid() {
    setSubmitting(true);
    try {
      await onMarkPaid(record!.id);
      push(`Invoice settlement confirmed for ${record!.id}.`, "success");
      onClose();
    } catch {
      push("Failed to confirm invoice payment.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cancellation Audit Record — ${record.id}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <StatusBadge status={record.status} />
            <span className="text-xs text-ink-500">
              Initiated by: <strong className="text-ink-800 capitalize">{record.initiatedBy}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Close
            </button>

            {record.status !== "cancelled" && record.status !== "rejected" && (
              <>
                <button
                  onClick={() => setRejecting(true)}
                  disabled={submitting}
                  className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700 transition-colors"
                >
                  Reject Request
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                >
                  Approve & Deduct/Invoice Fee
                </button>
              </>
            )}

            {record.paymentMode === "external_transaction" &&
              record.refundPaymentStatus === "invoice_pending" &&
              record.status === "cancelled" && (
                <button
                  onClick={handleMarkPaid}
                  disabled={submitting}
                  className="rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700 transition-colors"
                >
                  Mark Invoice as Paid
                </button>
              )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Rejection input pop-in */}
        {rejecting && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-danger-900">
                Reject Cancellation Request
              </p>
              <button onClick={() => setRejecting(false)} className="text-xs text-danger-700 hover:underline">
                Cancel
              </button>
            </div>
            <textarea
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejecting this cancellation..."
              className="w-full rounded-lg border border-danger-200 bg-white p-2 text-xs text-ink-900 outline-none focus:ring-1 focus:ring-danger-500"
            />
            <div className="flex justify-end">
              <button
                onClick={handleReject}
                disabled={submitting}
                className="rounded-lg bg-danger-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-danger-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {/* Financial Settlement Card */}
        <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex items-center justify-between border-b border-ink-200 pb-3">
            <div>
              <p className="text-xs text-ink-500">Confirmed Deal Value</p>
              <p className="text-xl font-bold text-ink-900">{formatCurrencyINR(record.dealAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-500">Applicable Cancellation Fee ({record.cancellationFeePercent}%)</p>
              <p className="text-xl font-bold text-danger-600">{formatCurrencyINR(record.cancellationFeeAmount)}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-ink-200 bg-white p-3">
              <div className="flex items-center gap-1.5 font-semibold text-ink-700 mb-1">
                <Wallet className="h-4 w-4 text-brand-600" />
                Payment Mode & Execution Logic
              </div>
              <p className="text-ink-600">
                {isPlatformCollected
                  ? "Platform-collected: The cancellation fee is automatically deducted from the user's token deposit held on file."
                  : "External transaction: Platform generates a payable cancellation fee invoice to the user."}
              </p>
              <div className="mt-2 text-[11px] font-medium text-brand-700 bg-brand-50 rounded px-2 py-1 inline-block">
                Mode: {isPlatformCollected ? "Auto-Deduct from Held Deposit" : "External Invoice Dispatch"}
              </div>
            </div>

            <div className="rounded-lg border border-ink-200 bg-white p-3">
              <div className="flex items-center gap-1.5 font-semibold text-ink-700 mb-1">
                <Receipt className="h-4 w-4 text-brand-600" />
                Settlement Status
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-500">Deposit on file:</span>
                  <span className="font-medium text-ink-800">{formatCurrencyINR(record.heldDepositAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Fee charged:</span>
                  <span className="font-medium text-danger-600">- {formatCurrencyINR(record.cancellationFeeAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-1 font-semibold">
                  <span className="text-ink-900">{isPlatformCollected ? "Net Refund to User:" : "Payable by User:"}</span>
                  <span className="text-ink-900">{formatCurrencyINR(Math.abs(record.finalSettlementAmount))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Details Grid */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
            Transaction & Entity References
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-ink-400">Deal ID</p>
              <p className="font-mono font-medium text-ink-900">{record.dealId}</p>
            </div>
            <div>
              <p className="text-ink-400">Requested Date</p>
              <p className="font-medium text-ink-900">{formatDate(record.requestedAt)}</p>
            </div>
            <div>
              <p className="text-ink-400">Buyer / User</p>
              <p className="font-medium text-ink-900">{record.buyer.name}</p>
              <p className="text-[10px] text-ink-400">{record.buyer.id}</p>
            </div>
            <div>
              <p className="text-ink-400">Broker / Agency</p>
              <p className="font-medium text-ink-900">{record.broker.name}</p>
              <p className="text-[10px] text-ink-400">{record.agency?.name ?? record.broker.id}</p>
            </div>
          </div>

          <div className="mt-3 border-t border-ink-100 pt-3 text-xs">
            <p className="text-ink-400">Property</p>
            <p className="font-medium text-ink-900">{record.property.title} · {record.property.locality}, {record.property.city}</p>
          </div>

          <div className="mt-3 border-t border-ink-100 pt-3 text-xs">
            <p className="text-ink-400">Reason for Cancellation</p>
            <p className="mt-0.5 font-medium text-ink-800">{record.reason}</p>
          </div>

          {record.invoiceNumber && (
            <div className="mt-3 border-t border-ink-100 pt-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-ink-400">Invoice Reference: </span>
                <span className="font-mono font-bold text-ink-900">{record.invoiceNumber}</span>
              </div>
              <StatusBadge status={record.refundPaymentStatus} />
            </div>
          )}
        </div>

        {/* Audit Log Trail */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
            Permanent Audit Trail
          </h4>
          <div className="space-y-3">
            {record.auditTrail.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <div className="mt-1 h-2 w-2 rounded-full bg-brand-600 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink-900">{log.action}</span>
                    <span className="text-[11px] text-ink-400">{formatDate(log.timestamp)}</span>
                  </div>
                  <p className="text-ink-500 mt-0.5">{log.notes}</p>
                  <span className="text-[10px] text-ink-400">Actor: {log.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
