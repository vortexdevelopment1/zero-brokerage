"use client";

import { Modal } from "@/components/ui/Modal";
import { FurnitureAsset } from "@/types/furniture";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tag, CheckCircle2, Box } from "lucide-react";

interface FurnitureAssetModalProps {
  asset: FurnitureAsset | null;
  open: boolean;
  onClose: () => void;
  onToggleStatus?: (id: string, newStatus: FurnitureAsset["status"]) => void;
}

export function FurnitureAssetModal({
  asset,
  open,
  onClose,
  onToggleStatus,
}: FurnitureAssetModalProps) {
  if (!asset) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Individual Asset: ${asset.name}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <StatusBadge status={asset.status} />
            <span className="text-xs text-ink-500 font-medium">Availability: {asset.availability}</span>
          </div>
          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                onClick={() => {
                  onToggleStatus(asset.id, asset.status === "active" ? "inactive" : "active");
                  onClose();
                }}
                className="rounded-lg border border-ink-200 px-3.5 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                {asset.status === "active" ? "Deactivate Asset" : "Activate Asset"}
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
              <span className="font-mono text-xs font-semibold text-brand-600">{asset.id}</span>
              <h3 className="mt-1 text-base font-bold text-ink-900">{asset.name}</h3>
              <p className="mt-0.5 text-xs text-ink-500">SKU: {asset.sku}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-xl font-bold text-ink-900">{formatCurrencyINR(asset.price)}</p>
              <p className="text-[11px] text-ink-400 capitalize">{asset.priceType.replace(/_/g, " ")}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-200 pt-3 text-xs">
            <div>
              <p className="text-ink-400">Category</p>
              <p className="font-medium text-ink-800">{asset.category}</p>
            </div>
            <div>
              <p className="text-ink-400">Stock Availability</p>
              <p className="font-medium text-ink-800">{asset.availability}</p>
            </div>
            <div>
              <p className="text-ink-400">Dimensions</p>
              <p className="font-medium text-ink-800">{asset.dimensions ?? "Standard"}</p>
            </div>
            <div>
              <p className="text-ink-400">Material / Composition</p>
              <p className="font-medium text-ink-800">{asset.material ?? "Commercial grade"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm text-xs space-y-2">
          <div className="flex justify-between text-ink-600">
            <span>Date Listed:</span>
            <span className="font-medium text-ink-800">{formatDate(asset.createdAt)}</span>
          </div>
          <div className="flex justify-between text-ink-600">
            <span>Last Updated:</span>
            <span className="font-medium text-ink-800">{formatDate(asset.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
