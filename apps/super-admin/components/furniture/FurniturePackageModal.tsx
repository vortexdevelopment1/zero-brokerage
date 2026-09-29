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
            <span className="text-xs text-ink-500 dark:text-ink-400 font-medium">Availability: {pkg.availability}</span>
          </div>
          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                onClick={() => {
                  onToggleStatus(pkg.id, pkg.status === "active" ? "inactive" : "active");
                  onClose();
                }}
                className="rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3.5 py-2 text-xs font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-700"
              >
                {pkg.status === "active" ? "Deactivate Package" : "Activate Package"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-ink-900 dark:bg-ink-800 dark:hover:bg-ink-700 dark:border dark:border-ink-700 px-4 py-2 text-xs font-medium text-white hover:bg-ink-800"
            >
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Details */}
        <div className="rounded-xl border border-ink-200 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-950/60 p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{pkg.id}</span>
              <h3 className="mt-1 text-base font-bold text-ink-900 dark:text-white">{pkg.name}</h3>
              <p className="mt-1 text-xs text-ink-600 dark:text-ink-300 leading-relaxed">{pkg.description}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-xl font-bold text-ink-900 dark:text-white">{formatCurrencyINR(pkg.price)}</p>
              <p className="text-[11px] text-ink-400 dark:text-ink-500 capitalize">{pkg.priceType.replace(/_/g, " ")}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-ink-200 dark:border-ink-800 pt-3 text-xs">
            <div>
              <p className="text-ink-400 dark:text-ink-500">Category</p>
              <p className="font-medium text-ink-800 dark:text-ink-200">{pkg.category}</p>
            </div>
            <div>
              <p className="text-ink-400 dark:text-ink-500">Assets Included</p>
              <p className="font-medium text-ink-800 dark:text-ink-200">{pkg.assetCount} individual items</p>
            </div>
            <div>
              <p className="text-ink-400 dark:text-ink-500">Listed Date</p>
              <p className="font-medium text-ink-800 dark:text-ink-200">{formatDate(pkg.createdAt)}</p>
            </div>
            <div>
              <p className="text-ink-400 dark:text-ink-500">Last Modified</p>
              <p className="font-medium text-ink-800 dark:text-ink-200">{formatDate(pkg.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Included Assets Breakdown */}
        <div className="rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500 mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Included Assets & Specifications
          </h4>
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {pkg.includedAssets.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between py-2.5 text-xs">
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">{item.name}</p>
                  <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{item.spec}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
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
