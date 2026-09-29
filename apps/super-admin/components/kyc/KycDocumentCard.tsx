"use client";

import { KycDocument } from "@/types/kyc";
import { formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FileText,
  CreditCard,
  Building,
  Eye,
  ShieldCheck,
  UserCheck,
  FileCheck,
} from "lucide-react";

interface KycDocumentCardProps {
  document: (Omit<KycDocument, "type"> & { type: string });
  onView: (document: any) => void;
}

function getDocumentIcon(type: string) {
  switch (type) {
    case "aadhaar":
      return ShieldCheck;
    case "pan":
    case "business_pan":
      return CreditCard;
    case "rera_certificate":
    case "agency_license":
    case "gst_certificate":
      return Building;
    case "profile_photo":
      return UserCheck;
    default:
      return FileText;
  }
}

export function KycDocumentCard({ document, onView }: KycDocumentCardProps) {
  const Icon = getDocumentIcon(document.type);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-4 shadow-sm transition-all hover:border-ink-300 dark:hover:border-ink-700 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-900/50">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-ink-900 dark:text-white leading-tight truncate" title={document.title}>
              {document.title}
            </h4>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400 font-mono truncate" title={document.documentNumberMasked ?? "Document ID: " + document.id}>
              {document.documentNumberMasked ?? "Document ID: " + document.id}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <StatusBadge status={document.status} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 dark:border-ink-800 pt-3 text-xs text-ink-500 dark:text-ink-400">
        <div className="min-w-0 flex-1">
          <span>Submitted: </span>
          <span className="font-medium text-ink-700 dark:text-ink-300">
            {formatDate(document.submittedAt)}
          </span>
          {document.fileSize && (
            <span className="ml-2 text-ink-400">({document.fileSize})</span>
          )}
        </div>

        <button
          onClick={() => onView(document)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-700 dark:text-ink-200 transition-colors hover:bg-ink-50 dark:hover:bg-ink-700 hover:text-ink-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <Eye className="h-3.5 w-3.5 text-ink-500 dark:text-ink-400" />
          View Document
        </button>
      </div>
    </div>
  );
}
