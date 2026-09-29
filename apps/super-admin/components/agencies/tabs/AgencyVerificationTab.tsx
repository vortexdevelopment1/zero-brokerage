"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  Info,
} from "lucide-react";
import { AgencyDetail, AgencyKycDocument, getDerivedVerificationStatus } from "@/types/agency";
import { KycStatusBadge } from "@/components/kyc/KycStatusBadge";
import { KycDocumentCard } from "@/components/kyc/KycDocumentCard";
import { KycDocumentViewer } from "@/components/kyc/KycDocumentViewer";
import { KycApprovalModal } from "@/components/kyc/KycApprovalModal";
import { AgencyRejectModal } from "@/components/agencies/AgencyRejectModal";
import { formatDate } from "@/lib/utils/format";

interface AgencyVerificationTabProps {
  agency: AgencyDetail;
  onApprove: () => Promise<void>;
  onReject: (reason: string, comments?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function AgencyVerificationTab({
  agency,
  onApprove,
  onReject,
  isSubmitting = false,
}: AgencyVerificationTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<AgencyKycDocument | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const derivedStatus = getDerivedVerificationStatus(agency.status);
  const isPending = agency.status === "pending";
  const isRejected = agency.status === "rejected";

  const documents = (agency.kycDocuments ?? []).filter((doc) =>
    ["gst_certificate", "pan", "business_pan", "aadhaar"].includes(doc.type)
  );

  return (
    <div className="space-y-6">
      {/* Verification Status Banner & Decision Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-950/50 dark:border-brand-900/50 dark:text-brand-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-ink-900 dark:text-white">
                Agency Compliance & Verification
              </h3>
              <KycStatusBadge status={derivedStatus} size="md" />
            </div>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {derivedStatus === "pending_review" && "Company registration and owner identity documents are submitted and awaiting Super Admin review."}
              {derivedStatus === "verified" && `Verified by ${agency.reviewedBy ?? "Super Admin"}${agency.reviewedAt ? ` on ${formatDate(agency.reviewedAt)}` : ""}. Agency is verified to operate on the portal.`}
              {derivedStatus === "rejected" && `Rejected${agency.reviewedAt ? ` on ${formatDate(agency.reviewedAt)}` : ""}: ${agency.rejectionReason ?? "Documentation criteria not met"}.`}
            </p>
          </div>
        </div>

        {/* Action Controls using confirmed PATCH /approve and PATCH /reject */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isPending && (
            <button
              onClick={() => setIsApproveOpen(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Agency
            </button>
          )}

          {!isRejected && (
            <button
              onClick={() => setIsRejectOpen(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3.5 py-2 text-sm font-medium text-danger-700 shadow-sm transition-colors hover:bg-danger-50 disabled:opacity-50 dark:border-danger-900 dark:bg-ink-800 dark:text-danger-300 dark:hover:bg-danger-950/40"
            >
              <XCircle className="h-4 w-4" />
              Reject Agency
            </button>
          )}

          {derivedStatus === "verified" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-700 bg-success-50 border border-success-200 px-3 py-1.5 rounded-lg dark:bg-success-950/70 dark:border-success-900/50 dark:text-success-300">
              <CheckCircle2 className="h-4 w-4" /> Compliance Active
            </span>
          )}
        </div>
      </div>

      {/* Rejection Alert Box */}
      {isRejected && agency.rejectionReason && (
        <div className="rounded-xl border border-danger-200 bg-danger-50/70 p-4 text-xs text-danger-900 dark:border-danger-900/60 dark:bg-danger-950/50 dark:text-danger-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-danger-600 shrink-0 mt-0.5 dark:text-danger-400" />
            <div>
              <p className="font-semibold text-danger-800 dark:text-danger-200">
                Reason for Rejection: {agency.rejectionReason}
              </p>
              {agency.rejectionComments && (
                <p className="mt-1 text-danger-700 dark:text-danger-300 leading-relaxed">
                  {agency.rejectionComments}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scope Notice: Entity Boundaries */}
      <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
        <Building className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-ink-800 dark:text-ink-200">
            Agency Entity Verification Scope
          </p>
          <p className="leading-relaxed">
            Agency verification strictly evaluates <strong>(1) GST Certificate of the company</strong>, <strong>(2) PAN of the Agency owner</strong>, and <strong>(3) Aadhaar of the Agency owner</strong>. Individual broker KYC documents are verified independently under the <span className="font-medium text-brand-600 dark:text-brand-400">Brokers module</span> and are never mixed with agency-level governance.
          </p>
        </div>
      </div>

      {/* Backend Contract Dependency Notice */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Contract Isolation:</strong> GST registration review is structured in the frontend UI ready for production. Confirmation from the backend engineer is pending on the exact enum key (`gst_certificate` vs `agency_license`).
        </p>
      </div>

      {/* Document Grid (The 3 Agency Documents) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink-900 dark:text-white">
            Agency Regulatory Documents ({documents.length}/3 Submitted)
          </h4>
          <span className="text-xs text-ink-400">Encrypted at rest · Masked identifiers</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <KycDocumentCard key={doc.id} document={doc as any} onView={(d) => setSelectedDoc(d)} />
          ))}

          {documents.length === 0 && (
            <div className="col-span-3 rounded-2xl border border-dashed border-ink-200 p-8 text-center dark:border-ink-800">
              <p className="text-sm font-medium text-ink-700 dark:text-ink-300">No documents uploaded yet</p>
              <p className="mt-1 text-xs text-ink-400">Agency owner has not submitted verification files.</p>
            </div>
          )}
        </div>
      </div>

      {/* Secure Document Viewer Modal */}
      {selectedDoc && (
        <KycDocumentViewer
          document={selectedDoc as any}
          open={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          entityName={agency.name}
        />
      )}

      {/* Approval Confirmation Modal */}
      <KycApprovalModal
        open={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={async () => {
          await onApprove();
          setIsApproveOpen(false);
        }}
        entityName={agency.name}
        isSubmitting={isSubmitting}
      />

      {/* Rejection Modal with Structured Reasons */}
      <AgencyRejectModal
        open={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={async (reason, comments) => {
          await onReject(reason, comments);
          setIsRejectOpen(false);
        }}
        agencyName={agency.name}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
