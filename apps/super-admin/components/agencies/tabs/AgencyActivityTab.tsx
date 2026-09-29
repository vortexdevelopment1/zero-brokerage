"use client";

import { History, ShieldAlert, FileClock, Info } from "lucide-react";
import { AgencyDetail, getDerivedVerificationStatus } from "@/types/agency";
import { formatDate } from "@/lib/utils/format";

interface AgencyActivityTabProps {
  agency: AgencyDetail;
}

export function AgencyActivityTab({ agency }: AgencyActivityTabProps) {
  const derivedVerification = getDerivedVerificationStatus(agency.status);

  return (
    <div className="space-y-6">
      {/* Activity Overview Card */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                Agency Activity & Audit History
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Administrative events and state changes
              </p>
            </div>
          </div>
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            Audit API Pending
          </span>
        </div>

        {/* Clear Notice: Backend Contract Status */}
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Backend Contract Status: Activity Log Endpoint Not Available
              </p>
              <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                The current backend contracts do not yet expose an Agency-level activity or audit-trail endpoint (`/api/admin/agencies/:id/activity`).
                To avoid inventing unconfirmed backend contracts or persisting synthetic audit entries, this section is kept in a ready state. Once the backend event-sourcing or audit-log endpoint is confirmed, historical events will populate here automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Available Lifecycle Metadata */}
        <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-xs dark:border-ink-800 dark:bg-ink-800/40">
          <h4 className="font-semibold text-ink-800 dark:text-ink-200 mb-2">
            Known Entity Milestones (from current Agency record)
          </h4>
          <div className="space-y-2.5 text-ink-600 dark:text-ink-300">
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800/60 pb-2">
              <span>Account Onboarding / Creation Date</span>
              <span className="font-medium text-ink-900 dark:text-white">{formatDate(agency.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800/60 pb-2">
              <span>Current Operational Status</span>
              <span className="font-semibold text-ink-900 dark:text-white capitalize">{agency.status}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800/60 pb-2">
              <span>Derived Verification Status</span>
              <span className="font-semibold text-ink-900 dark:text-white capitalize">{derivedVerification.replace(/_/g, " ")}</span>
            </div>
            {agency.reviewedAt && (
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800/60 pb-2">
                <span>Last Compliance Review Date</span>
                <span className="font-medium text-ink-900 dark:text-white">{formatDate(agency.reviewedAt)} ({agency.reviewedBy || "Admin"})</span>
              </div>
            )}
            {agency.rejectionReason && (
              <div className="flex items-center justify-between">
                <span>Rejection Reason</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">{agency.rejectionReason}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
