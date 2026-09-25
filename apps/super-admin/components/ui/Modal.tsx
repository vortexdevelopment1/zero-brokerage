"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative flex flex-col w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]",
          widths[size] || "max-w-lg",
          "animate-fade-in rounded-2xl bg-white shadow-popover overflow-hidden",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-ink-900 truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6 overscroll-contain">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-ink-100 bg-ink-50/50 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
