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
  document: KycDocument;
  onView: (document: KycDocument) => void;
}

function getDocumentIcon(type: KycDocument["type"]) {
  switch (type) {
    case "aadhaar":
      return ShieldCheck;
    case "pan":
    case "business_pan":
      return CreditCard;
    case "rera_certificate":
    case "agency_license":
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
    <div className="flex flex-col justify-between rounded-xl border border-ink-200 bg-white p-4 shadow-sm transition-all hover:border-ink-300 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 border border-brand-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900 leading-tight">
              {document.title}
            </h4>
            <p className="mt-0.5 text-xs text-ink-500 font-mono">
              {document.documentNumberMasked ?? "Document ID: " + document.id}
            </p>
          </div>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
        <div>
          <span>Submitted: </span>
          <span className="font-medium text-ink-700">
            {formatDate(document.submittedAt)}
          </span>
          {document.fileSize && (
            <span className="ml-2 text-ink-400">({document.fileSize})</span>
          )}
        </div>

        <button
          onClick={() => onView(document)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <Eye className="h-3.5 w-3.5 text-ink-500" />
          View Document
        </button>
      </div>
    </div>
  );
}
