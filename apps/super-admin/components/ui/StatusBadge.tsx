import { cn } from "@/lib/utils/cn";
import { BadgeTone } from "@/types/common";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  success: "bg-success-100 text-success-600 ring-success-100",
  warning: "bg-warning-100 text-warning-600 ring-warning-100",
  danger: "bg-danger-100 text-danger-600 ring-danger-100",
  info: "bg-brand-100 text-brand-700 ring-brand-100",
  brand: "bg-brand-600 text-white ring-brand-600",
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

  pending: "warning",
  "in-review": "warning",
  "in-progress": "warning",
  processing: "warning",
  scheduled: "warning",
  rescheduled: "warning",
  unverified: "warning",
  degraded: "warning",
  new: "info",
  contacted: "info",
  accepted: "info",

  blocked: "danger",
  suspended: "danger",
  rejected: "danger",
  failed: "danger",
  cancelled: "danger",
  down: "danger",
  refunded: "neutral",
  unavailable: "neutral",
  hidden: "neutral",
  expired: "neutral",
};

export function toneForStatus(status: string): BadgeTone {
  return STATUS_TONE_MAP[status.toLowerCase()] ?? "neutral";
}

export function StatusBadge({ status, tone, label }: { status?: string; tone?: BadgeTone; label?: string }) {
  const resolvedTone = tone ?? (status ? toneForStatus(status) : "neutral");
  const text = label ?? status ?? "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        TONE_CLASSES[resolvedTone]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text.charAt(0).toUpperCase() + text.slice(1).replace(/-/g, " ")}
    </span>
  );
}
