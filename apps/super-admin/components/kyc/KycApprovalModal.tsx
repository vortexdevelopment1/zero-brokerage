"use client";

import { Modal } from "@/components/ui/Modal";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface KycApprovalModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  entityName: string;
  isSubmitting?: boolean;
}

export function KycApprovalModal({
  open,
  onClose,
  onConfirm,
  entityName,
  isSubmitting = false,
}: KycApprovalModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve KYC?"
      size="sm"
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
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-700 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? "Approving…" : "Approve KYC"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-sm text-ink-600 leading-relaxed">
            Are you sure you want to approve this KYC for <strong className="text-ink-900">{entityName}</strong>?
            This will mark their identity verification as <strong className="text-success-700 font-medium">Verified</strong> and enable full verified platform capabilities.
          </p>
        </div>
      </div>
    </Modal>
  );
}
