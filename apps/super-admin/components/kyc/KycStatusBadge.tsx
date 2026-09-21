import { KycStatus } from "@/types/kyc";
import { cn } from "@/lib/utils/cn";

const KYC_STATUS_CONFIG: Record<
  KycStatus,
  { label: string; toneClass: string; dotClass: string }
> = {
  not_submitted: {
    label: "Not Submitted",
    toneClass: "bg-ink-100 text-ink-700 ring-ink-200",
    dotClass: "bg-ink-400",
  },
  pending_review: {
    label: "Pending Review",
    toneClass: "bg-warning-100 text-warning-700 ring-warning-200",
    dotClass: "bg-warning-500",
  },
  verified: {
    label: "Verified",
    toneClass: "bg-success-100 text-success-700 ring-success-200",
    dotClass: "bg-success-500",
  },
  rejected: {
    label: "Rejected",
    toneClass: "bg-danger-100 text-danger-700 ring-danger-200",
    dotClass: "bg-danger-500",
  },
};

function normalizeStatus(status?: string): KycStatus {
  if (!status) return "not_submitted";
  const s = status.toLowerCase().replace(/[\s-]/g, "_");
  if (s === "pending" || s === "pending_review") return "pending_review";
  if (s === "verified" || s === "approved") return "verified";
  if (s === "rejected") return "rejected";
  return "not_submitted";
}

export function KycStatusBadge({
  status,
  size = "md",
  className,
}: {
  status?: string | KycStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const norm = normalizeStatus(status);
  const config = KYC_STATUS_CONFIG[norm];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap transition-colors",
        config.toneClass,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-subtle", config.dotClass)} />
      {config.label}
    </span>
  );
}
