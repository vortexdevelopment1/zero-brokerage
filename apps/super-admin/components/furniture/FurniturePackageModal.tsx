"use client";

import { Modal } from "@/components/ui/Modal";
import { FurniturePackage } from "@/types/furniture";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Sofa, Layers, CheckCircle, Tag, Clock } from "lucide-react";

interface FurniturePackageModalProps {
  pkg: FurniturePackage | null;
  open: boolean;
  onClose: () => void;
  onToggleStatus?: (id: string, newStatus: FurniturePackage["status"]) => void;
}

export function FurniturePackageModal({
  pkg,
  open,
  onClose,
  onToggleStatus,
}: FurniturePackageModalProps) {
  if (!pkg) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Furniture Package: ${pkg.name}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <StatusBadge status={pkg.status} />
            <span className="text-xs text-ink-500 font-medium">Availability: {pkg.availability}</span>
          </div>
          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                onClick={() => {
                  onToggleStatus(pkg.id, pkg.status === "active" ? "inactive" : "active");
                  onClose();
                }}
                className="rounded-lg border border-ink-200 px-3.5 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                {pkg.status === "active" ? "Deactivate Package" : "Activate Package"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-ink-900 px-4 py-2 text-xs font-medium text-white hover:bg-ink-800"
            >
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Details */}
        <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xs font-semibold text-brand-600">{pkg.id}</span>
              <h3 className="mt-1 text-base font-bold text-ink-900">{pkg.name}</h3>
              <p className="mt-1 text-xs text-ink-600 leading-relaxed">{pkg.description}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-xl font-bold text-ink-900">{formatCurrencyINR(pkg.price)}</p>
              <p className="text-[11px] text-ink-400 capitalize">{pkg.priceType.replace(/_/g, " ")}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-ink-200 pt-3 text-xs">
            <div>
              <p className="text-ink-400">Category</p>
              <p className="font-medium text-ink-800">{pkg.category}</p>
            </div>
            <div>
              <p className="text-ink-400">Assets Included</p>
              <p className="font-medium text-ink-800">{pkg.assetCount} individual items</p>
            </div>
            <div>
              <p className="text-ink-400">Listed Date</p>
              <p className="font-medium text-ink-800">{formatDate(pkg.createdAt)}</p>
            </div>
            <div>
              <p className="text-ink-400">Last Modified</p>
              <p className="font-medium text-ink-800">{formatDate(pkg.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Included Assets Breakdown */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-600" />
            Included Assets & Specifications
          </h4>
          <div className="divide-y divide-ink-100">
            {pkg.includedAssets.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between py-2.5 text-xs">
                <div>
                  <p className="font-medium text-ink-900">{item.name}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">{item.spec}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
