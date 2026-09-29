"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";
import { AgencyDetail } from "@/types/agency";
import { SubscriptionEntry } from "@/types/revenue";
import { agencyService } from "@/services/agencyService";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";

interface AgencySubscriptionTabProps {
  agency: AgencyDetail;
}

// Plan listing capacity reference
const PLAN_LISTING_LIMITS: Record<string, number> = {
  "Silver Partner": 50,
  "Gold Agency": 200,
  "Platinum Builder": 5000,
};

export function AgencySubscriptionTab({ agency }: AgencySubscriptionTabProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<SubscriptionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const planName = agency.plan;
  const seatUsed = agency.seatsUsed;
  const seatAllowed = agency.seatsAllowed || 1;
  const seatPercent = Math.min(100, Math.round((seatUsed / seatAllowed) * 100));

  const listingLimit = PLAN_LISTING_LIMITS[planName] ?? 200;
  const listingUsed = agency.activeListings;
  const listingPercent = Math.min(100, Math.round((listingUsed / listingLimit) * 100));

  useEffect(() => {
    let mounted = true;
    agencyService.getAgencySubscriptions(agency.name).then((res) => {
      if (mounted) {
        setSubscriptions(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [agency.name]);

  const activeSub = subscriptions.find((s) => s.status === "active") ?? subscriptions[0];

  return (
    <div className="space-y-6">
      {/* Current Plan Overview Card */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink-100 dark:border-ink-800 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-950/50 dark:border-brand-900/50 dark:text-brand-300">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-ink-900 dark:text-white">{planName}</h3>
                <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 border border-success-200 dark:bg-success-950/40 dark:border-success-900/50 dark:text-success-400">
                  {activeSub?.status === "active" ? "Active Subscription" : "Subscription Active"}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                {activeSub?.expiryDate ? `Next renewal on ${formatDate(activeSub.expiryDate)}` : "Enterprise commercial agency plan"}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push(`/admin/revenue/subscriptions?search=${encodeURIComponent(agency.name)}`)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            <span>Manage in Revenue Module</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Plan Pricing & Term Details */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
          <div>
            <span className="text-ink-400">Billing Cycle</span>
            <p className="font-semibold text-ink-900 dark:text-white">Annual Recurring</p>
          </div>
          <div>
            <span className="text-ink-400">Registered Plan Fee</span>
            <p className="font-semibold text-ink-900 dark:text-white">
              {activeSub?.revenue ? formatCurrencyINR(activeSub.revenue) : (planName === "Silver Partner" ? "₹14,999" : planName === "Gold Agency" ? "₹49,999" : "₹1,49,999")} / yr
            </p>
          </div>
          <div>
            <span className="text-ink-400">Subscription Registered</span>
            <p className="font-semibold text-ink-900 dark:text-white">
              {activeSub?.purchaseDate ? formatDate(activeSub.purchaseDate) : formatDate(agency.createdAt)}
            </p>
          </div>
          <div>
            <span className="text-ink-400">Payment Status</span>
            <p className="font-semibold text-success-600 dark:text-success-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {activeSub?.paymentStatus || "Success"}
            </p>
          </div>
        </div>
      </div>

      {/* Resource Entitlements & Usage Quotas */}
      <div>
        <h4 className="text-sm font-semibold text-ink-900 dark:text-white mb-3">
          Resource Entitlements & Active Consumption
        </h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Seats meter */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-900 dark:text-white">Broker Seats</span>
              <span className="font-mono text-ink-500">{seatUsed} / {seatAllowed}</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className={`h-full rounded-full transition-all ${
                  seatPercent >= 90 ? "bg-warning-500" : "bg-brand-600"
                }`}
                style={{ width: `${seatPercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500 dark:text-ink-400">
              <span>{Math.max(0, seatAllowed - seatUsed)} seats available</span>
              <span>{seatPercent}% utilized</span>
            </div>
          </div>

          {/* Listings meter */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-900 dark:text-white">Property Listing Limit</span>
              <span className="font-mono text-ink-500">{listingUsed} / {listingLimit}</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${listingPercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500 dark:text-ink-400">
              <span>{Math.max(0, listingLimit - listingUsed)} listings remaining</span>
              <span>{listingPercent}% utilized</span>
            </div>
          </div>

          {/* Boost Credits meter */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-900 dark:text-white">Boost / Ad Credits</span>
              <span className="font-mono text-ink-500">{agency.boostCredits} active</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ width: agency.boostCredits > 0 ? "60%" : "0%" }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500 dark:text-ink-400">
              <span>Included in {planName}</span>
              <span>Available for campaigns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Invoices Table (queried from Revenue module) */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-100 p-4 dark:border-ink-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink-900 dark:text-white">
            Billing Transactions & Invoices
          </h4>
          <span className="text-xs text-ink-400">Queried from central Revenue service</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-700 dark:text-ink-300">
            <thead className="border-b border-ink-100 bg-ink-50/75 text-[11px] uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice / Reference</th>
                <th className="px-4 py-3 font-semibold">Plan Description</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Purchase Date</th>
                <th className="px-4 py-3 font-semibold">Expiry Date</th>
                <th className="px-4 py-3 font-semibold">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-400 animate-pulse">
                    Loading billing history…
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                    No recorded subscription invoices for this agency.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-800/40">
                    <td className="px-4 py-3 font-mono text-[11px] font-medium text-ink-900 dark:text-white">
                      {s.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">
                      {s.plan}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink-900 dark:text-white">
                      {formatCurrencyINR(s.revenue)}
                    </td>
                    <td className="px-4 py-3 text-ink-500 dark:text-ink-400">
                      {formatDate(s.purchaseDate)}
                    </td>
                    <td className="px-4 py-3 text-ink-500 dark:text-ink-400">
                      {formatDate(s.expiryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700 border border-success-200 dark:bg-success-950/40 dark:border-success-900/50 dark:text-success-400">
                        {s.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
