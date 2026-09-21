"use client";

import { useEffect, useState, useCallback } from "react";
import { KycDocument, KycStatus, KycVerificationDetail } from "@/types/kyc";
import { KycStatusBadge } from "./KycStatusBadge";
import { KycDocumentCard } from "./KycDocumentCard";
import { KycDocumentViewer } from "./KycDocumentViewer";
import { KycApprovalModal } from "./KycApprovalModal";
import { KycRejectionModal } from "./KycRejectionModal";
import { userKycService } from "@/services/userKycService";
import { brokerKycService } from "@/services/brokerKycService";
import { useToastStore } from "@/store/toastStore";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import {
  ShieldCheck,
  XCircle,
  CheckCircle2,
  FileQuestion,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface KycVerificationPanelProps {
  entityId: string;
  entityType: "user" | "broker";
  entityName: string;
  entityEmail: string;
  entityPhone: string;
  entityCity?: string;
  agency?: string | null;
  onStatusChange?: (newStatus: KycStatus) => void;
}

export function KycVerificationPanel({
  entityId,
  entityType,
  entityName,
  entityEmail,
  entityPhone,
  entityCity,
  agency,
  onStatusChange,
}: KycVerificationPanelProps) {
  const push = useToastStore((s) => s.push);

  const [loading, setLoading] = useState(true);
  const [kycDetail, setKycDetail] = useState<KycVerificationDetail | null>(null);
  const [viewingDoc, setViewingDoc] = useState<KycDocument | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isRejectionOpen, setIsRejectionOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadKyc = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        entityType === "user"
          ? await userKycService.getUserKyc(entityId)
          : await brokerKycService.getBrokerKyc(entityId);
      setKycDetail(res);
    } catch {
      push("Failed to load KYC verification data.", "error");
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, push]);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  async function handleApprove() {
    setSubmittingAction(true);
    try {
      if (entityType === "user") {
        await userKycService.approveUserKyc(entityId);
      } else {
        await brokerKycService.approveBrokerKyc(entityId);
      }

      setKycDetail((prev) =>
        prev
          ? {
              ...prev,
              status: "verified",
              reviewedAt: new Date().toISOString(),
              reviewedBy: "Super Admin (You)",
              rejectionReason: undefined,
              rejectionComments: undefined,
              documents: prev.documents.map((d) => ({ ...d, status: "approved" })),
            }
          : null
      );

      push(`${entityName}'s KYC has been successfully verified.`, "success");
      onStatusChange?.("verified");
      setIsApprovalOpen(false);
    } catch {
      push("Failed to approve KYC. Please try again.", "error");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleReject(reason: string, comments?: string) {
    setSubmittingAction(true);
    try {
      if (entityType === "user") {
        await userKycService.rejectUserKyc(entityId, reason, comments);
      } else {
        await brokerKycService.rejectBrokerKyc(entityId, reason, comments);
      }

      setKycDetail((prev) =>
        prev
          ? {
              ...prev,
              status: "rejected",
              reviewedAt: new Date().toISOString(),
              reviewedBy: "Super Admin (You)",
              rejectionReason: reason,
              rejectionComments: comments,
              documents: prev.documents.map((d) => ({ ...d, status: "rejected" })),
            }
          : null
      );

      push(`${entityName}'s KYC has been rejected (${reason}).`, "info");
      onStatusChange?.("rejected");
      setIsRejectionOpen(false);
    } catch {
      push("Failed to reject KYC. Please try again.", "error");
    } finally {
      setSubmittingAction(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-2xl bg-ink-100/60" />
        <div className="h-44 rounded-2xl bg-ink-100/60" />
        <div className="h-64 rounded-2xl bg-ink-100/60" />
      </div>
    );
  }

  const status = kycDetail?.status ?? "not_submitted";
  const documents = kycDetail?.documents ?? [];
  const canApprove = status !== "verified" && documents.length > 0;
  const canReject = status !== "rejected" && documents.length > 0;

  return (
    <div className="space-y-5">
      {/* KYC Status & Action Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-ink-900">
                KYC Verification Status
              </h3>
              <KycStatusBadge status={status} size="md" />
            </div>
            <p className="mt-1 text-xs text-ink-500">
              {status === "pending_review" && "Submitted documents are awaiting compliance review and approval."}
              {status === "verified" && `Verified by ${kycDetail?.reviewedBy ?? "Admin"}${kycDetail?.reviewedAt ? ` on ${formatDate(kycDetail.reviewedAt)}` : ""}.`}
              {status === "rejected" && `Rejected${kycDetail?.reviewedAt ? ` on ${formatDate(kycDetail.reviewedAt)}` : ""}: ${kycDetail?.rejectionReason ?? "Details incomplete"}.`}
              {status === "not_submitted" && "User has not submitted identity documents for verification yet."}
            </p>
          </div>
        </div>

        {/* Verification Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canApprove && (
            <button
              onClick={() => setIsApprovalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve KYC
            </button>
          )}

          {canReject && (
            <button
              onClick={() => setIsRejectionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3.5 py-2 text-sm font-medium text-danger-700 shadow-sm transition-colors hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-danger-500/20"
            >
              <XCircle className="h-4 w-4" />
              Reject KYC
            </button>
          )}

          {status === "verified" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700 bg-success-50 border border-success-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-4 w-4" /> Verification Complete
            </span>
          )}
        </div>
      </div>

      {/* Rejection Alert Box if Status is Rejected */}
      {status === "rejected" && kycDetail?.rejectionReason && (
        <div className="rounded-xl border border-danger-200 bg-danger-50/70 p-4 text-xs text-danger-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-danger-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger-800">
                Reason for KYC Rejection: {kycDetail.rejectionReason}
              </p>
              {kycDetail.rejectionComments && (
                <p className="mt-1 text-danger-700">
                  {kycDetail.rejectionComments}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personal / Verification Information */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="border-b border-ink-100 pb-3 mb-4">
          <h4 className="text-sm font-semibold text-ink-900">
            Personal & Verification Information
          </h4>
          <p className="text-xs text-ink-500">
            Profile credentials submitted by the {entityType === "user" ? "user" : "broker"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2.5">
            <User className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-ink-400">Full Name</p>
              <p className="text-sm font-medium text-ink-900">{entityName}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-ink-400">Email Address</p>
              <p className="text-sm font-medium text-ink-900 truncate">{entityEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Phone className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-ink-400">Phone Number</p>
              <p className="text-sm font-medium text-ink-900">{entityPhone}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-ink-400">Verification Status</p>
              <div className="mt-0.5">
                <KycStatusBadge status={status} size="sm" />
              </div>
            </div>
          </div>

          {entityCity && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-ink-400">Operating City</p>
                <p className="text-sm font-medium text-ink-900">{entityCity}</p>
              </div>
            </div>
          )}

          {agency && (
            <div className="flex items-start gap-2.5">
              <Building className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-ink-400">Affiliated Agency</p>
                <p className="text-sm font-medium text-ink-900">{agency}</p>
              </div>
            </div>
          )}

          {kycDetail?.submittedAt && (
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-ink-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-ink-400">Submitted Date</p>
                <p className="text-sm font-medium text-ink-900">{formatDate(kycDetail.submittedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submitted Documents Section */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-ink-900">
              Submitted Documents
            </h4>
            <p className="text-xs text-ink-500">
              {entityType === "user"
                ? "Identity documents uploaded for Aadhaar / PAN compliance verification"
                : "Licensing and tax records submitted for broker verification"}
            </p>
          </div>
          <span className="text-xs font-medium text-ink-500 bg-ink-100 px-2.5 py-1 rounded-full">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400 mb-3">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h5 className="text-sm font-medium text-ink-800">
              No documents submitted
            </h5>
            <p className="mt-1 max-w-sm text-xs text-ink-500 leading-relaxed">
              This {entityType === "user" ? "user" : "broker"} has not uploaded identity or licensing documents yet. Status is currently <strong className="font-semibold text-ink-700">Not Submitted</strong>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <KycDocumentCard
                key={doc.id}
                document={doc}
                onView={(d) => setViewingDoc(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <KycDocumentViewer
        document={viewingDoc}
        open={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        entityName={entityName}
      />

      <KycApprovalModal
        open={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        onConfirm={handleApprove}
        entityName={entityName}
        isSubmitting={submittingAction}
      />

      <KycRejectionModal
        open={isRejectionOpen}
        onClose={() => setIsRejectionOpen(false)}
        onConfirm={handleReject}
        entityName={entityName}
        isSubmitting={submittingAction}
      />
    </div>
  );
}
