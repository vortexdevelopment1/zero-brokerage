"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, XCircle } from "lucide-react";

interface AgencyRejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comments?: string) => Promise<void> | void;
  agencyName: string;
  isSubmitting?: boolean;
  title?: string;
}

const REJECTION_REASONS = [
  "GST Certificate invalid or expired",
  "Identity details mismatch with registrar records",
  "Illegible or cutoff document scan",
  "Incomplete company registration details",
  "Regulatory or compliance policy violation",
  "Other",
] as const;

export function AgencyRejectModal({
  open,
  onClose,
  onConfirm,
  agencyName,
  isSubmitting = false,
  title = "Reject Agency Verification",
}: AgencyRejectModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REJECTION_REASONS[0]);
  const [comments, setComments] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleReject() {
    if (!selectedReason) {
      setValidationError("Please select a rejection reason.");
      return;
    }
    if (selectedReason === "Other" && !comments.trim()) {
      setValidationError("Please provide specific notes explaining the 'Other' reason.");
      return;
    }
    setValidationError(null);
    onConfirm(selectedReason, comments.trim() ? comments.trim() : undefined);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-700 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            {isSubmitting ? "Submitting…" : "Reject Agency"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-danger-50 border border-danger-100 p-3 text-xs text-danger-800 dark:bg-danger-950/40 dark:border-danger-900/50 dark:text-danger-300">
          <AlertTriangle className="h-4 w-4 text-danger-600 dark:text-danger-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Compliance Rejection Action</p>
            <p className="mt-0.5 text-danger-700 dark:text-danger-400">
              Rejecting <strong className="font-semibold">{agencyName}</strong> will mark the agency as rejected, restrict broker creation, and notify the owner with the specified feedback.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-2">
            Select Rejection Reason <span className="text-danger-500">*</span>
          </label>
          <div className="space-y-2">
            {REJECTION_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer text-sm transition-colors ${
                  selectedReason === reason
                    ? "border-danger-500 bg-danger-50/40 text-danger-900 font-medium dark:bg-danger-950/50 dark:text-danger-200"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:border-ink-600"
                }`}
              >
                <span>{reason}</span>
                <input
                  type="radio"
                  name="agency-rejection-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="h-4 w-4 text-danger-600 focus:ring-danger-500"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
            Internal Compliance Notes / Comments {selectedReason === "Other" && <span className="text-danger-500">*</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Add detailed explanation of what requires correction or why validation failed…"
            className="w-full rounded-lg border border-ink-200 bg-white p-3 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder-ink-500"
          />
        </div>

        {validationError && (
          <p className="text-xs font-medium text-danger-600 dark:text-danger-400">{validationError}</p>
        )}
      </div>
    </Modal>
  );
}
