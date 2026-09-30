"use client";

import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="View system notifications and administrative alerts."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Notifications" }]}
      />

      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="System notifications and alerts will appear here when available."
        />
      </div>
    </>
  );
}
