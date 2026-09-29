import { cn } from "@/lib/utils/cn";
import { BadgeTone } from "@/types/common";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700",
  success: "bg-success-100 text-success-700 ring-success-200 dark:bg-success-950/70 dark:text-success-300 dark:ring-success-900/50",
  warning: "bg-warning-100 text-warning-800 ring-warning-200 dark:bg-warning-950/70 dark:text-warning-300 dark:ring-warning-900/50",
  danger: "bg-danger-100 text-danger-700 ring-danger-200 dark:bg-danger-950/70 dark:text-danger-300 dark:ring-danger-900/50",
  info: "bg-brand-100 text-brand-700 ring-brand-200 dark:bg-brand-950/70 dark:text-brand-300 dark:ring-brand-900/50",
  brand: "bg-brand-600 text-white ring-brand-600 dark:bg-brand-600 dark:text-white dark:ring-brand-500",
};

// Maps common status strings across the app to a visual tone, so every
// module (users, brokers, properties, payouts...) reads consistently.
const STATUS_TONE_MAP: Record<string, BadgeTone> = {
  active: "success",
  approved: "success",
  verified: "success",
  paid: "success",
  success: "success",
  completed: "success",
  closed: "success",
  resolved: "success",
  operational: "success",
  deal_done: "success",
  "deal-done": "success",
  agreement_completed: "success",
  "agreement-completed": "success",
  amount_confirmed: "success",
  "amount-confirmed": "success",
  auto_deducted: "success",
  "auto-deducted": "success",
  invoice_paid: "success",
  "invoice-paid": "success",
  refund_processed: "success",
  "refund-processed": "success",
  visit_completed: "success",
  "visit-completed": "success",

  pending: "warning",
  pending_review: "warning",
  "pending-review": "warning",
  "in-review": "warning",
  in_review: "warning",
  "in-progress": "warning",
  in_progress: "warning",
  changes_requested: "warning",
  "changes-requested": "warning",
  mismatch_flagged: "warning",
  "mismatch-flagged": "warning",
  agreement_pending: "warning",
  "agreement-pending": "warning",
  under_review: "warning",
  "under-review": "warning",
  under_admin_review: "warning",
  "under-admin-review": "warning",
  requested: "warning",
  fee_pending: "warning",
  "fee-pending": "warning",
  payment_pending: "warning",
  "payment-pending": "warning",
  invoice_pending: "warning",
  "invoice-pending": "warning",
  processing: "warning",
  scheduled: "warning",
  rescheduled: "warning",
  unverified: "warning",
  degraded: "warning",
  negotiation: "warning",
  visit_scheduled: "warning",
  "visit-scheduled": "warning",

  new: "info",
  contacted: "info",
  accepted: "info",
  submitted: "info",
  user_uploaded: "info",
  "user-uploaded": "info",
  broker_uploaded: "info",
  "broker-uploaded": "info",
  both_uploaded: "info",
  "both-uploaded": "info",
  deal_initiated: "info",
  "deal-initiated": "info",

  blocked: "danger",
  suspended: "danger",
  rejected: "danger",
  failed: "danger",
  cancelled: "danger",
  down: "danger",
  deal_cancelled: "danger",
  "deal-cancelled": "danger",

  refunded: "neutral",
  unavailable: "neutral",
  hidden: "neutral",
  expired: "neutral",
  waived: "neutral",
  not_submitted: "neutral",
  "not-submitted": "neutral",
  draft: "neutral",
};

export function toneForStatus(status: string): BadgeTone {
  const normalized = status.toLowerCase().trim();
  return STATUS_TONE_MAP[normalized] ?? STATUS_TONE_MAP[normalized.replace(/[\s-]/g, "_")] ?? "neutral";
}

export function StatusBadge({ status, tone, label }: { status?: string; tone?: BadgeTone; label?: string }) {
  const resolvedTone = tone ?? (status ? toneForStatus(status) : "neutral");
  const rawText = label ?? status ?? "";
  const text = rawText.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        TONE_CLASSES[resolvedTone]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  );
}
