"use client";

import { CheckCircle2, XCircle, Ban, PlayCircle, Building2, MapPin, Calendar } from "lucide-react";
import { AgencyDetail, getDerivedVerificationStatus } from "@/types/agency";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { KycStatusBadge } from "@/components/kyc/KycStatusBadge";
import { formatDate } from "@/lib/utils/format";

interface AgencyHeaderProps {
  agency: AgencyDetail;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  isSubmitting?: boolean;
}

export function AgencyHeader({
  agency,
  onApprove,
  onReject,
  onSuspend,
  onActivate,
  isSubmitting = false,
}: AgencyHeaderProps) {
  const isPending = agency.status === "pending";
  const isActive = agency.status === "active";
  const isSuspended = agency.status === "suspended";
  const isRejected = agency.status === "rejected";

  const derivedVerification = getDerivedVerificationStatus(agency.status);

  return (
    <div className="mb-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Identity & Badges */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-700 border border-brand-100 dark:bg-brand-950/50 dark:border-brand-900/50 dark:text-brand-300">
            {agency.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-ink-900 dark:text-white truncate" title={agency.name}>{agency.name}</h1>
              <span className="font-mono text-xs text-ink-400 bg-ink-100 px-2 py-0.5 rounded dark:bg-ink-800 dark:text-ink-300 shrink-0">
                {agency.id}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-500 dark:text-ink-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-ink-400" />
                {agency.city}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-ink-400" />
                Onboarded {formatDate(agency.createdAt)}
              </span>
              <span>·</span>
              <span>Owner: <strong className="text-ink-700 dark:text-ink-200 font-medium">{agency.owner}</strong></span>
            </div>

            {/* Badges distinction: Operational vs Derived Verification vs Plan */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Operational:</span>
                <StatusBadge status={agency.status} />
              </div>
              <span className="text-ink-300 dark:text-ink-700">|</span>
              <div className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Verification:</span>
                <KycStatusBadge status={derivedVerification} size="sm" />
              </div>
              <span className="text-ink-300 dark:text-ink-700">|</span>
              <StatusBadge status="info" label={agency.plan} tone="info" />
            </div>
          </div>
        </div>

        {/* Right: State-Respecting Admin Actions */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
          {/* Approve button - only if pending */}
          {isPending && (
            <button
              onClick={onApprove}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Agency
            </button>
          )}

          {/* Reject button - available when pending or needing rejection */}
          {!isRejected && (
            <button
              onClick={onReject}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3.5 py-2 text-sm font-medium text-danger-700 shadow-sm transition-colors hover:bg-danger-50 disabled:opacity-50 dark:border-danger-900 dark:bg-ink-800 dark:text-danger-300 dark:hover:bg-danger-950/40"
            >
              <XCircle className="h-4 w-4" />
              Reject Agency
            </button>
          )}

          {/* Suspend button - only if currently active */}
          {isActive && (
            <button
              onClick={onSuspend}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-warning-300 bg-white px-3.5 py-2 text-sm font-medium text-warning-800 shadow-sm transition-colors hover:bg-warning-50 disabled:opacity-50 dark:border-warning-900 dark:bg-ink-800 dark:text-warning-300 dark:hover:bg-warning-950/40"
            >
              <Ban className="h-4 w-4" />
              Suspend
            </button>
          )}

          {/* Re-activate button - if suspended */}
          {(isSuspended || isRejected) && (
            <button
              onClick={onActivate}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              <PlayCircle className="h-4 w-4" />
              Re-activate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
