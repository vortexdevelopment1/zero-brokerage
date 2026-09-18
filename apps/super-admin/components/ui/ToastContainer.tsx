"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils/cn";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONE_CLASSES = {
  success: "border-success-100 text-success-600",
  error: "border-danger-100 text-danger-600",
  info: "border-brand-100 text-brand-600",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              "animate-slide-in flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-popover",
              TONE_CLASSES[t.tone]
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm text-ink-700">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
