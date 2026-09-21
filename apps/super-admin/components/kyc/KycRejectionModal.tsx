"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, XCircle } from "lucide-react";

interface KycRejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comments?: string) => Promise<void> | void;
  entityName: string;
  isSubmitting?: boolean;
}

const REJECTION_REASONS = [
  "Document unclear",
  "Details mismatch",
  "Invalid document",
  "Other",
] as const;

export function KycRejectionModal({
  open,
  onClose,
  onConfirm,
  entityName,
  isSubmitting = false,
}: KycRejectionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REJECTION_REASONS[0]);
  const [comments, setComments] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleReject() {
    if (!selectedReason) {
      setValidationError("Please select a rejection reason.");
      return;
    }
    if (selectedReason === "Other" && !comments.trim()) {
      setValidationError("Please enter specific details for 'Other' reason.");
      return;
    }
    setValidationError(null);
    onConfirm(selectedReason, comments.trim() ? comments.trim() : undefined);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject KYC"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-700 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            {isSubmitting ? "Rejecting…" : "Reject KYC"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-danger-50 border border-danger-100 p-3 text-xs text-danger-800">
          <AlertTriangle className="h-4 w-4 text-danger-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Rejection Notification Notice</p>
            <p className="mt-0.5 text-danger-700">
              Rejecting KYC will notify <strong className="font-semibold">{entityName}</strong> and prompt them to re-upload corrected documents.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-2">
            Select Rejection Reason <span className="text-danger-500">*</span>
          </label>
          <div className="space-y-2">
            {REJECTION_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer text-sm transition-colors ${
                  selectedReason === reason
                    ? "border-danger-500 bg-danger-50/40 text-danger-900 font-medium"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                }`}
              >
                <span>{reason}</span>
                <input
                  type="radio"
                  name="kyc-rejection-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => {
                    setSelectedReason(reason);
                    setValidationError(null);
                  }}
                  className="h-4 w-4 text-danger-600 border-ink-300 focus:ring-danger-500"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">
            Additional Comments / Instructions {selectedReason === "Other" && <span className="text-danger-500">*</span>}
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => {
              setComments(e.target.value);
              setValidationError(null);
            }}
            placeholder={
              selectedReason === "Other"
                ? "Please explain the reason for rejection so the user can re-submit properly…"
                : "Optional note for internal audit log or user feedback…"
            }
            className="w-full rounded-lg border border-ink-200 p-2.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20 outline-none"
          />
        </div>

        {validationError && (
          <p className="text-xs font-medium text-danger-600">{validationError}</p>
        )}
      </div>
    </Modal>
  );
}
