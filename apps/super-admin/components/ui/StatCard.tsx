import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  tone?: "brand" | "accent" | "success" | "warning";
}

const TONE_ICON_BG: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-400/15 text-accent-600",
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "brand" }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition-shadow hover:shadow-popover">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TONE_ICON_BG[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              positive ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
    </div>
  );
}
