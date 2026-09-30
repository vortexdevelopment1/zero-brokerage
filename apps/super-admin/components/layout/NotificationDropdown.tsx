"use client";

import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/States";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  return (
    <div
      role="region"
      aria-label="Notifications preview"
      className="absolute right-0 z-50 mt-2 w-80 sm:w-96 animate-fade-in rounded-xl border border-ink-200 bg-white shadow-popover dark:border-ink-800 dark:bg-ink-900 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Notifications</h3>
      </div>

      {/* Body / Honest Empty State */}
      <div className="p-3">
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="System notifications and alerts will appear here."
        />
      </div>

      {/* Footer */}
      <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-950/50">
        <Link
          href="/admin/notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
        >
          <span>See all notifications</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
