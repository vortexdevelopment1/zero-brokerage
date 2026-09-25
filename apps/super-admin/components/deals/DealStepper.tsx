import { DealLifecycleStage } from "@/types/deal";
import { Check, Clock, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STAGES: Array<{ key: DealLifecycleStage; label: string; desc: string }> = [
  { key: "NEGOTIATION", label: "Negotiation", desc: "Inspection & initial talks" },
  { key: "DEAL_INITIATED", label: "Deal Initiated", desc: "Terms drafted" },
  { key: "AMOUNT_CONFIRMED", label: "Amount Confirmed", desc: "Both parties agreed" },
  { key: "AGREEMENT_PENDING", label: "Agreement Pending", desc: "External drafting" },
  { key: "AGREEMENT_UPLOADED_BY_USER", label: "Agreements Uploaded", desc: "Buyer & broker uploads" },
  { key: "AGREEMENT_COMPLETED", label: "Agreement Completed", desc: "Admin verified" },
  { key: "DEAL_DONE", label: "Deal Done", desc: "Closed & delisted" },
];

function getStageIndex(stage: DealLifecycleStage): number {
  switch (stage) {
    case "NEGOTIATION":
      return 0;
    case "DEAL_INITIATED":
      return 1;
    case "AMOUNT_CONFIRMED":
      return 2;
    case "AGREEMENT_PENDING":
      return 3;
    case "AGREEMENT_UPLOADED_BY_USER":
    case "AGREEMENT_UPLOADED_BY_BROKER":
      return 4;
    case "AGREEMENT_COMPLETED":
      return 5;
    case "DEAL_DONE":
      return 6;
    case "DEAL_CANCELLED":
      return -1;
    default:
      return 0;
  }
}

export function DealStepper({
  currentStage,
  hasMismatch,
  cancellationId,
}: {
  currentStage: DealLifecycleStage;
  hasMismatch?: boolean;
  cancellationId?: string;
}) {
  const currentIndex = getStageIndex(currentStage);
  const isCancelled = currentStage === "DEAL_CANCELLED";

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between border-b border-ink-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Deal Progress & Lifecycle</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            End-to-end transaction state machine per platform compliance workflow.
          </p>
        </div>
        {isCancelled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-100 px-3 py-1 text-xs font-semibold text-danger-700">
            <XCircle className="h-4 w-4" /> Deal Cancelled
          </span>
        ) : hasMismatch ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-100 px-3 py-1 text-xs font-semibold text-warning-700">
            <AlertTriangle className="h-4 w-4" /> Agreement Review Flagged
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1 text-xs font-medium text-success-700">
            <Clock className="h-4 w-4" /> Active Pipeline Stage
          </span>
        )}
      </div>

      {/* Primary Lifecycle Stepper */}
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-[760px] items-start justify-between relative">
          {/* Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-ink-200 -z-0" />

          {STAGES.map((step, idx) => {
            const isCompleted = !isCancelled && idx < currentIndex;
            const isCurrent = !isCancelled && idx === currentIndex;
            const isUpcoming = !isCancelled && idx > currentIndex;

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center text-center flex-1 px-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm",
                    isCompleted && "bg-brand-600 text-white ring-4 ring-brand-100",
                    isCurrent && !hasMismatch && "bg-brand-600 text-white ring-4 ring-brand-200 animate-pulse",
                    isCurrent && hasMismatch && "bg-warning-500 text-white ring-4 ring-warning-200",
                    isUpcoming && "bg-white text-ink-400 border-2 border-ink-300",
                    isCancelled && "bg-ink-100 text-ink-400 border border-ink-200"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : isCurrent && hasMismatch ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs font-semibold",
                    isCurrent ? "text-brand-700" : isCompleted ? "text-ink-900" : "text-ink-500"
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400 leading-tight max-w-[100px]">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parallel Cancellation Path Warning Banner */}
      {isCancelled && (
        <div className="mt-5 rounded-xl border border-danger-200 bg-danger-50/70 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-danger-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-danger-900">
                  Parallel Cancellation Path Executed
                </p>
                {cancellationId && (
                  <span className="text-xs font-mono font-medium text-danger-700 bg-danger-100 px-2 py-0.5 rounded">
                    Record: {cancellationId}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-danger-700 leading-relaxed">
                Deal terminated after amount confirmation prior to external agreement execution. Cancellation fee was calculated according to configured platform rules and an audit record was preserved.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-danger-800">
                <span className="rounded bg-danger-200/60 px-2 py-0.5">Cancellation Requested</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded bg-danger-200/60 px-2 py-0.5">Fee Calculated (1–2%)</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded bg-danger-200/60 px-2 py-0.5">Fee Deducted / Invoiced</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded bg-danger-600 text-white px-2 py-0.5">Deal Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
