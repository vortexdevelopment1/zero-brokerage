"use client";

import { Modal } from "@/components/ui/Modal";
import { KycDocument } from "@/types/kyc";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FileText,
  ShieldCheck,
  Calendar,
  Lock,
  ExternalLink,
  QrCode,
  User,
  Building,
  CheckCircle,
} from "lucide-react";

interface KycDocumentViewerProps {
  document: KycDocument | null;
  open: boolean;
  onClose: () => void;
  entityName: string;
}

export function KycDocumentViewer({
  document,
  open,
  onClose,
  entityName,
}: KycDocumentViewerProps) {
  if (!document) return null;

  const preview = document.previewData;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Document Preview: ${document.title}`}
      size="lg"
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-800"
        >
          Close Preview
        </button>
      }
    >
      <div className="space-y-4">
        {/* Specimen Disclaimer Banner */}
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Specimen Document Preview:</strong> Synthetic compliance data for admin evaluation.
            </span>
          </div>
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
            Internal Use Only
          </span>
        </div>

        {/* Visual Document Mockup Card */}
        <div className="relative overflow-hidden rounded-xl border border-ink-200 bg-ink-50/60 p-4 shadow-inner">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06] select-none">
            <span className="rotate-[-25deg] text-4xl font-extrabold tracking-widest text-ink-900 uppercase">
              {preview?.watermarkText ?? "SPECIMEN COPY"}
            </span>
          </div>

          {document.type === "aadhaar" && (
            <div className="relative rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between border-b border-ink-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                    UIDAI
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-900 uppercase tracking-wide">
                      Government of India
                    </p>
                    <p className="text-[11px] text-ink-500">
                      Unique Identification Authority of India (Simulated)
                    </p>
                  </div>
                </div>
                <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-orange-400 via-white to-emerald-500 border border-ink-200" />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1 flex flex-col items-center justify-center rounded-lg border border-ink-200 bg-ink-50 p-3">
                  <User className="h-16 w-16 text-ink-400" />
                  <span className="mt-1 text-[10px] text-ink-400">Photo Proof</span>
                </div>
                <div className="md:col-span-2 space-y-1.5 text-xs text-ink-700">
                  <p className="text-sm font-semibold text-ink-900">{entityName}</p>
                  <p><span className="text-ink-500">DOB:</span> 14/05/1991</p>
                  <p><span className="text-ink-500">Gender:</span> Male</p>
                  <p><span className="text-ink-500">Address:</span> {preview?.details?.Address ?? "Bengaluru, Karnataka"}</p>
                </div>
                <div className="md:col-span-1 flex flex-col items-center justify-center border-l border-ink-100 pl-2">
                  <QrCode className="h-16 w-16 text-ink-700" />
                  <span className="mt-1 text-[9px] text-ink-400">Digital Seal</span>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-orange-50 border border-orange-100 py-2 px-3 text-center">
                <p className="font-mono text-base font-bold tracking-widest text-ink-900">
                  {document.documentNumberMasked ?? "XXXX-XXXX-8910"}
                </p>
                <p className="text-[10px] text-ink-500">मेरा आधार, मेरी पहचान (Simulated)</p>
              </div>
            </div>
          )}

          {(document.type === "pan" || document.type === "business_pan") && (
            <div className="relative rounded-xl border border-sky-200 bg-gradient-to-br from-white via-sky-50/20 to-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                <div>
                  <p className="text-xs font-bold text-ink-900 uppercase">
                    Income Tax Department · Govt of India
                  </p>
                  <p className="text-[11px] text-ink-500">Permanent Account Number Card (Specimen)</p>
                </div>
                <div className="h-7 w-7 rounded bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-[10px]">
                  ITD
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] text-ink-400 uppercase">Cardholder Name</p>
                    <p className="font-semibold text-ink-900">{entityName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-400 uppercase">Father&apos;s Name</p>
                    <p className="text-ink-800">S. Sharma (Simulated)</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-400 uppercase">Date of Birth / Incorporation</p>
                    <p className="text-ink-800">14/05/1991</p>
                  </div>
                </div>

                <div className="col-span-1 flex flex-col items-end justify-between">
                  <div className="h-16 w-14 rounded border border-ink-200 bg-ink-100 flex items-center justify-center">
                    <User className="h-10 w-10 text-ink-400" />
                  </div>
                  <div className="w-20 border-b border-ink-400 pt-3 text-center">
                    <span className="font-serif italic text-[11px] text-ink-600">Signature</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-sky-100/70 border border-sky-200 px-4 py-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-sky-800">Permanent Account Number</p>
                  <p className="font-mono text-base font-bold tracking-widest text-sky-950">
                    {document.documentNumberMasked ?? "ABCDE1234F"}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full border border-sky-300 bg-white flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </div>
          )}

          {document.type === "rera_certificate" && (
            <div className="relative rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="text-center border-b border-ink-100 pb-3">
                <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Building className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  Real Estate Regulatory Authority (RERA)
                </p>
                <p className="text-[11px] text-ink-500">
                  Certificate of Registration of Real Estate Agent (Specimen Demo)
                </p>
              </div>

              <div className="mt-4 space-y-3 text-xs text-ink-700">
                <p>
                  This is to certify that <strong className="text-ink-900">{entityName}</strong> has been granted registration as a Real Estate Agent under Section 9 of the Real Estate (Regulation and Development) Act, 2016.
                </p>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-600 font-medium">Registration Number:</span>
                    <span className="font-mono font-bold text-emerald-900">{document.documentNumberMasked}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-ink-500">Jurisdiction:</span>
                    <span className="text-ink-800">Karnataka State Authority</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-ink-500">Validity:</span>
                    <span className="text-ink-800">31 Dec 2029 (Active)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {document.type === "profile_photo" && (
            <div className="relative rounded-xl border border-ink-200 bg-white p-6 shadow-sm text-center">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50">
                <User className="h-16 w-16 text-brand-600" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-900">{entityName}</p>
              <p className="text-xs text-ink-500">Live Identity Capture · Anti-Spoofing Verification</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-700 border border-success-200">
                <CheckCircle className="h-3.5 w-3.5 text-success-600" />
                Liveness Check Passed (99.1% Confidence)
              </div>
            </div>
          )}

          {document.type === "other" && (
            <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm text-xs text-ink-700">
              <p className="font-semibold text-ink-900">{document.title}</p>
              <p className="mt-1 text-ink-500">Document reference: {document.documentNumberMasked ?? document.id}</p>
            </div>
          )}
        </div>

        {/* Metadata Details Table */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-card">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
            Verification Metadata & Audit Record
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-ink-400">Document Type</p>
              <p className="font-medium text-ink-900 capitalize">{document.type.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-ink-400">Status</p>
              <div className="mt-0.5">
                <StatusBadge status={document.status} />
              </div>
            </div>
            <div>
              <p className="text-ink-400">Submitted Date</p>
              <p className="font-medium text-ink-900">{formatDate(document.submittedAt)}</p>
            </div>
            <div>
              <p className="text-ink-400">File Size</p>
              <p className="font-medium text-ink-900">{document.fileSize ?? "1.5 MB"}</p>
            </div>
          </div>
          {document.notes && (
            <div className="mt-3 border-t border-ink-100 pt-2.5 text-xs text-ink-600">
              <span className="font-medium text-ink-700">Compliance Notes: </span>
              {document.notes}
            </div>
          )}
        </div>

        {/* Production Storage & Security Architectural Notice */}
        <div className="flex items-start gap-2.5 rounded-lg border border-ink-200 bg-ink-50/70 p-3 text-[11px] text-ink-600">
          <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-800">
              Security Architecture (SOW / BRD Compliance)
            </p>
            <p className="mt-0.5 text-ink-500 leading-relaxed">
              In production, documents are encrypted at rest in isolated S3/GCS buckets. Previews are streamed via short-lived signed URLs with a strict 15-minute TTL. No permanent public URLs or unmasked Aadhaar identifiers are stored or exposed to client browsers.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
