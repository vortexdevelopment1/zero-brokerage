"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

const TABS = ["Profile", "Security", "Notifications", "Roles & Permissions"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");
  const { session } = useAuthStore();
  const push = useToastStore((s) => s.push);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your admin profile, security and notification preferences."
        crumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Settings" }]}
        actions={
          <Link
            href="/admin/settings/rules"
            className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors"
          >
            <Scale className="h-4 w-4" /> Deal & Cancellation Rules
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-ink-500 hover:text-ink-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {tab === "Profile" && (
          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            <Field label="Full name" defaultValue={session?.name ?? "Admin"} />
            <Field label="Email address" defaultValue={session?.email ?? "admin@vortexcubes.com"} />
            <Field label="Role" defaultValue={session?.role ?? "Super Admin"} disabled />
            <button
              onClick={() => push("Profile updated (mock — connect to PATCH /api/admin/auth/session).", "success")}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Save changes
            </button>
          </div>
        )}

        {tab === "Security" && (
          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            <Field label="Current password" type="password" placeholder="••••••••" />
            <Field label="New password" type="password" placeholder="••••••••" />
            <Field label="Confirm new password" type="password" placeholder="••••••••" />
            <button
              onClick={() => push("Password change is a UI placeholder pending the backend auth endpoint.", "info")}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Update password
            </button>
          </div>
        )}

        {tab === "Notifications" && (
          <div className="space-y-1 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            {[
              "New broker/agency approval requests",
              "Urgent Requirement Engine flags",
              "Payout failures",
              "System health degradation alerts",
              "Weekly revenue summary",
            ].map((label) => (
              <label key={label} className="flex items-center justify-between border-b border-ink-100 py-3 text-sm text-ink-700 last:border-0">
                {label}
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400" />
              </label>
            ))}
          </div>
        )}

        {tab === "Roles & Permissions" && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-sm text-ink-500">
            <p className="font-medium text-ink-700">Ready for role/permission APIs</p>
            <p className="mt-1">
              The BRD/SOW do not define detailed RBAC rules yet. This placeholder is intentionally simple —
              it will connect to role and permission endpoints once those are specified by the backend team.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Field({
  label, defaultValue, placeholder, type = "text", disabled,
}: { label: string; defaultValue?: string; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-600">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-400"
      />
    </div>
  );
}
