"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Scale,
  Percent,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { rulesService } from "@/services/rulesService";
import { PlatformRulesConfig, DealRules, CancellationRules } from "@/types/rules";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";

export default function DealCancellationRulesPage() {
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [config, setConfig] = useState<PlatformRulesConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<PlatformRulesConfig | null>(null);
  const [simulationAmount, setSimulationAmount] = useState<number>(5000000); // 50 Lakhs demo from PDF

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setStatus("loading");
    try {
      const res = await rulesService.getRules();
      setConfig(res);
      setEditedConfig(JSON.parse(JSON.stringify(res)));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (status === "loading") return <LoadingState label="Loading platform rules…" />;
  if (status === "error" || !editedConfig) return <ErrorState onRetry={load} />;

  const dealRules = editedConfig.dealRules;
  const canRules = editedConfig.cancellationRules;

  // Live calculation based on user configured percentage
  const calculatedFee = Math.round((simulationAmount * canRules.userCancellationFeePercent) / 100);

  function updateDealRule<K extends keyof DealRules>(key: K, val: DealRules[K]) {
    setEditedConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dealRules: {
          ...prev.dealRules,
          [key]: val,
        },
      };
    });
  }

  function updateCanRule<K extends keyof CancellationRules>(key: K, val: CancellationRules[K]) {
    setEditedConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cancellationRules: {
          ...prev.cancellationRules,
          [key]: val,
        },
      };
    });
  }

  async function handleSaveConfirm() {
    if (!editedConfig) return;
    setSubmitting(true);
    try {
      const updated = await rulesService.updateRules(editedConfig, "Super Admin");
      setConfig(updated);
      setEditedConfig(JSON.parse(JSON.stringify(updated)));
      push("Platform deal and cancellation rules updated successfully.", "success");
      setConfirmSaveOpen(false);
    } catch {
      push("Failed to update rules configuration.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetConfirm() {
    setSubmitting(true);
    try {
      const reset = await rulesService.resetToDefaults("Super Admin");
      setConfig(reset);
      setEditedConfig(JSON.parse(JSON.stringify(reset)));
      push("Rules reset to platform default values.", "info");
      setConfirmResetOpen(false);
    } catch {
      push("Failed to reset rules.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Deal & Cancellation Rules"
        description="Configure platform state machine policies, user cancellation fees, broker penalties, and agreement verification rules."
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings", href: "/admin/settings" },
          { label: "Deal & Cancellation Rules" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmResetOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Reset to Defaults
            </button>
            <button
              onClick={() => setConfirmSaveOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Save className="h-4 w-4" /> Save Changes
            </button>
          </div>
        }
      />

      <div className="space-y-6 max-w-5xl">
        {/* Info Banner */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 text-xs text-brand-900 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-semibold text-sm">Centralized Policy Engine</p>
            <p className="mt-0.5 text-brand-800">
              Changes applied here dynamically govern the Deal lifecycle state machine, the cancellation fee percentage (configurable between 1–2%), payment invoice generation, and listing search visibility delisting upon deal completion.
            </p>
            <p className="mt-1 text-[11px] text-brand-600">
              Last saved: {formatDate(editedConfig.updatedAt)} by {editedConfig.updatedBy}
            </p>
          </div>
        </div>

        {/* Section 1: Cancellation Fee & Policy Rules */}
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
          <div className="border-b border-ink-100 pb-4">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Percent className="h-5 w-5 text-brand-600" /> User Cancellation Fee Configuration
            </h3>
            <p className="mt-1 text-xs text-ink-500">
              Chargeable if the user cancels after final deal amount confirmation but before external legal agreement is uploaded. (Discussed requirement: 1–2%).
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                    Platform Cancellation Fee Percentage
                  </label>
                  <span className="font-mono text-sm font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded">
                    {canRules.userCancellationFeePercent.toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={canRules.userCancellationFeePercent}
                  onChange={(e) => updateCanRule("userCancellationFeePercent", parseFloat(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink-400 mt-1">
                  <span>0.5%</span>
                  <span className="font-semibold text-brand-700">Recommended: 1.0% – 2.0%</span>
                  <span>3.0%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">
                    Minimum Floor Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={canRules.userFeeMinAmount}
                    onChange={(e) => updateCanRule("userFeeMinAmount", parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-ink-200 p-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">
                    Maximum Cap Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={canRules.userFeeMaxAmount}
                    onChange={(e) => updateCanRule("userFeeMaxAmount", parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-ink-200 p-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Payment Mode Execution Rules */}
              <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-ink-900">Payment Deduction Logic</p>
                <label className="flex items-center justify-between text-xs text-ink-700">
                  <span>Platform-collected deposit: Automatically deduct fee</span>
                  <input
                    type="checkbox"
                    checked={canRules.autoDeductPlatformCollected}
                    onChange={(e) => updateCanRule("autoDeductPlatformCollected", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-ink-700">
                  <span>External transaction: Automatically generate payable invoice</span>
                  <input
                    type="checkbox"
                    checked={canRules.autoGenerateExternalInvoice}
                    onChange={(e) => updateCanRule("autoGenerateExternalInvoice", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                </label>
              </div>
            </div>

            {/* Interactive Live Calculation Simulator (from Q&A document example) */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-900 uppercase tracking-wide">
                  Live Fee Calculation Simulator
                </span>
                <span className="text-[10px] text-brand-600 bg-brand-100 px-2 py-0.5 rounded font-medium">
                  Matches SOW §7 Example
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">
                  Simulate Confirmed Deal Amount (₹):
                </label>
                <input
                  type="number"
                  step="500000"
                  value={simulationAmount}
                  onChange={(e) => setSimulationAmount(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-ink-200 bg-white p-2.5 text-sm font-semibold text-ink-900 outline-none"
                />
              </div>

              <div className="rounded-lg bg-white p-3.5 border border-ink-200 space-y-2 text-xs">
                <div className="flex justify-between text-ink-600">
                  <span>Confirmed Deal Amount:</span>
                  <span className="font-semibold text-ink-900">{formatCurrencyINR(simulationAmount)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Platform Fee Percentage:</span>
                  <span className="font-semibold text-brand-600">{canRules.userCancellationFeePercent}%</span>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-2 text-sm font-bold">
                  <span className="text-ink-900">Calculated Cancellation Fee:</span>
                  <span className="text-danger-600">{formatCurrencyINR(calculatedFee)}</span>
                </div>
              </div>

              <p className="text-[11px] text-ink-500 italic">
                * Example: A ₹50 Lakhs deal with a 1.0% fee results in ₹50,000 fee. With a 1.5% fee, it results in ₹75,000 fee.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Broker/Agency Cancellation Penalty (Separately Configurable) */}
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
          <div className="border-b border-ink-100 pb-4">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Scale className="h-5 w-5 text-brand-600" /> Broker & Agency Cancellation Penalty
            </h3>
            <p className="mt-1 text-xs text-ink-500">
              Separately configurable from user cancellation fees. Applies when a broker or agency unilaterally retracts from a confirmed deal.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Penalty Structure Type
              </label>
              <select
                value={canRules.brokerCancellationPenaltyType}
                onChange={(e) => updateCanRule("brokerCancellationPenaltyType", e.target.value as any)}
                className="w-full rounded-lg border border-ink-200 p-2 text-xs font-semibold text-ink-800 outline-none"
              >
                <option value="fixed">Fixed Penalty Fee (₹)</option>
                <option value="percentage">Percentage of Confirmed Deal (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Penalty Amount / Percentage
              </label>
              <input
                type="number"
                value={canRules.brokerCancellationPenaltyValue}
                onChange={(e) => updateCanRule("brokerCancellationPenaltyValue", parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-ink-200 p-2 text-xs text-ink-900 outline-none"
              />
              <p className="mt-1 text-[10px] text-ink-400">
                {canRules.brokerCancellationPenaltyType === "fixed" ? "Fixed INR penalty fine" : "Percentage fee"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Disciplinary Strike Points
              </label>
              <input
                type="number"
                value={canRules.brokerDisciplinaryStrikePoints}
                onChange={(e) => updateCanRule("brokerDisciplinaryStrikePoints", parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-ink-200 p-2 text-xs text-ink-900 outline-none"
              />
              <p className="mt-1 text-[10px] text-ink-400">3 strikes triggers automated account suspension review</p>
            </div>
          </div>
        </div>

        {/* Section 3: Deal Workflow & Completion Conditions */}
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
          <div className="border-b border-ink-100 pb-4">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-600" /> Deal Lifecycle & Agreement Rules
            </h3>
            <p className="mt-1 text-xs text-ink-500">
              State machine progression gates, document upload mandates, and listing delisting triggers.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-ink-200 p-4 space-y-3">
                <label className="flex items-center justify-between text-xs font-medium text-ink-800">
                  <span>Require dual-party final amount confirmation</span>
                  <input
                    type="checkbox"
                    checked={dealRules.requireDualPartyAmountConfirmation}
                    onChange={(e) => updateDealRule("requireDualPartyAmountConfirmation", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                </label>
                <p className="text-[11px] text-ink-500">
                  Both buyer and broker must mutually enter and confirm the agreed deal amount before proceeding to the agreement phase.
                </p>
              </div>

              <div className="rounded-xl border border-ink-200 p-4 space-y-3">
                <label className="flex items-center justify-between text-xs font-medium text-ink-800">
                  <span>Require dual agreement document upload</span>
                  <input
                    type="checkbox"
                    checked={dealRules.requireDualAgreementUpload}
                    onChange={(e) => updateDealRule("requireDualAgreementUpload", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                </label>
                <p className="text-[11px] text-ink-500">
                  Both parties must independently upload their externally signed copy to the platform.
                </p>
              </div>

              <div className="rounded-xl border border-ink-200 p-4 space-y-3">
                <label className="flex items-center justify-between text-xs font-medium text-ink-800">
                  <span>Auto-flag document discrepancies for admin review</span>
                  <input
                    type="checkbox"
                    checked={dealRules.autoFlagDiscrepancy}
                    onChange={(e) => updateDealRule("autoFlagDiscrepancy", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                </label>
                <p className="text-[11px] text-ink-500">
                  If uploaded agreements differ in valuation, terms, or signatures, flag for Super Admin review instead of auto-completing.
                </p>
              </div>

              <div className="rounded-xl border border-ink-200 p-4 space-y-3">
                <label className="flex items-center justify-between text-xs font-medium text-ink-800">
                  <span>Auto-remove listing from search upon Deal Done</span>
                  <input
                    type="checkbox"
                    checked={dealRules.autoRemoveListingOnDealDone}
                    onChange={(e) => updateDealRule("autoRemoveListingOnDealDone", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                </label>
                <p className="text-[11px] text-ink-500">
                  Per SOW: Setting deal status to Deal Done immediately removes property visibility from active marketplace search.
                </p>
              </div>
            </div>

            {/* Time Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">
                  Amount Confirmation Window (Hours)
                </label>
                <input
                  type="number"
                  value={dealRules.amountConfirmationWindowHours}
                  onChange={(e) => updateDealRule("amountConfirmationWindowHours", parseInt(e.target.value) || 24)}
                  className="w-full rounded-lg border border-ink-200 p-2 text-xs text-ink-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">
                  Agreement Upload Grace Period (Days)
                </label>
                <input
                  type="number"
                  value={dealRules.agreementUploadGracePeriodDays}
                  onChange={(e) => updateDealRule("agreementUploadGracePeriodDays", parseInt(e.target.value) || 7)}
                  className="w-full rounded-lg border border-ink-200 p-2 text-xs text-ink-900 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation before saving */}
      <ConfirmationDialog
        open={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        onConfirm={handleSaveConfirm}
        isSubmitting={submitting}
        tone="brand"
        title="Confirm Saving Platform Rules"
        description="Are you sure you want to apply these platform policy changes? This will immediately affect live deal fee calculations and workflow validation gates."
      />

      {/* Confirmation before reset */}
      <ConfirmationDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleResetConfirm}
        isSubmitting={submitting}
        tone="brand"
        title="Reset Rules to Defaults"
        description="Are you sure you want to restore the platform default deal and cancellation rules? All current custom thresholds will be reset."
      />
    </>
  );
}
