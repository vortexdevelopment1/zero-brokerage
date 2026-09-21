"use client";

import { Modal } from "./Modal";
import { cn } from "@/lib/utils/cn";

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "brand",
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "brand" | "danger";
  isSubmitting?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60",
              tone === "danger" ? "bg-danger-600 hover:bg-danger-600/90" : "bg-brand-600 hover:bg-brand-700"
            )}
          >
            {isSubmitting ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{description}</p>
    </Modal>
  );
}
