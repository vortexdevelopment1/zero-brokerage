"use client";

import { Mail, Phone, MapPin, Building, ArrowUpRight, AlertCircle } from "lucide-react";
import { AgencyDetail, getDerivedVerificationStatus } from "@/types/agency";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { KycStatusBadge } from "@/components/kyc/KycStatusBadge";

interface AgencyOverviewTabProps {
  agency: AgencyDetail;
  onNavigateTab: (tabKey: any) => void;
}

const PLAN_LISTING_LIMITS: Record<string, number> = {
  "Silver Partner": 50,
  "Gold Agency": 200,
  "Platinum Builder": 5000,
};

export function AgencyOverviewTab({ agency, onNavigateTab }: AgencyOverviewTabProps) {
  const derivedVerification = getDerivedVerificationStatus(agency.status);

  const seatPercent = Math.min(100, Math.round((agency.seatsUsed / (agency.seatsAllowed || 1)) * 100));
  const listingCap = PLAN_LISTING_LIMITS[agency.plan] ?? 200;
  const listingPercent = Math.min(100, Math.round((agency.activeListings / (listingCap || 1)) * 100));

  const totalClosures = agency.brokerTeam.reduce((acc, b) => acc + b.closures, 0);
  const estimatedVolume = totalClosures * 7200000;

  return (
    <div className="space-y-6">
      {/* Top High-Level Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Owner / Signatory" value={agency.owner} subtext="Agency proprietor" />
        <MetricCard
          label="Broker Seats"
          value={`${agency.seatsUsed} / ${agency.seatsAllowed}`}
          subtext={`${seatPercent}% seat utilization`}
        />
        <MetricCard
          label="Active Inventory"
          value={agency.activeListings}
          subtext={`of ${listingCap} allowed`}
        />
        <MetricCard
          label="Boost Credits"
          value={agency.boostCredits}
          subtext="Available boost credits"
        />
        <MetricCard
          label="Closed Deals"
          value={totalClosures}
          subtext="Team deal closures"
        />
        <MetricCard
          label="Gross Consideration"
          value={formatCurrencyINR(estimatedVolume)}
          subtext="Executed volume"
        />
      </div>

      {/* Main Content: 2-Column Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Col: Contact, Identity & Governance */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact Details Card */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white border-b border-ink-100 dark:border-ink-800 pb-3">
              Agency Contact & Headquarters
            </h3>
            <div className="mt-4 space-y-3.5 text-xs text-ink-600 dark:text-ink-300">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-400 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink-400">Official Email</p>
                  <p className="font-medium text-ink-900 dark:text-white truncate" title={agency.email}>{agency.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-400 shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink-400">Primary Phone</p>
                  <p className="font-medium text-ink-900 dark:text-white truncate">{agency.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-400 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink-400">Operating City & Region</p>
                  <p className="font-medium text-ink-900 dark:text-white truncate" title={`${agency.city}, India`}>{agency.city}, India</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-400 shrink-0">
                  <Building className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink-400">Agency Entity ID</p>
                  <p className="font-mono font-medium text-ink-900 dark:text-white truncate">{agency.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational vs Compliance Governance Card */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white border-b border-ink-100 dark:border-ink-800 pb-3 flex items-center justify-between">
              <span>Governance & Status</span>
              <button
                onClick={() => onNavigateTab("verification")}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 font-normal"
              >
                Inspect KYC <ArrowUpRight className="h-3 w-3" />
              </button>
            </h3>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-800/40">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-700 dark:text-ink-300">Operational Status</span>
                  <StatusBadge status={agency.status} />
                </div>
                <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
                  {agency.status === "active" && "Agency is live. Brokers can login, publish listings, and submit agreements."}
                  {agency.status === "pending" && "Agency is awaiting Super Admin verification approval before going live."}
                  {agency.status === "suspended" && "Operations are restricted. Listings hidden and broker logins temporarily blocked."}
                  {agency.status === "rejected" && "Onboarding was rejected. The agency cannot operate until re-submitted and cleared."}
                </p>
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-800/40">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-700 dark:text-ink-300">Derived Verification</span>
                  <KycStatusBadge status={derivedVerification} size="sm" />
                </div>
                <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
                  {derivedVerification === "verified" && `Cleared by compliance. Status: ${agency.status}.`}
                  {derivedVerification === "pending_review" && "GST Certificate, Owner PAN, and Aadhaar awaiting compliance evaluation."}
                  {derivedVerification === "rejected" && `Rejected: ${agency.rejectionReason ?? "Compliance criteria not satisfied."}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Resource Utilization, Team Snapshot, Quick Actions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Resource & Entitlement Allocation */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Plan Resource Entitlements</h3>
                <p className="text-xs text-ink-500 dark:text-ink-400">Allocated capacity based on {agency.plan}</p>
              </div>
              <button
                onClick={() => onNavigateTab("subscription")}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 font-medium"
              >
                Plan Details <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Broker Seats Bar */}
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-500 dark:text-ink-400">Broker Seats</span>
                  <span className="font-semibold text-ink-900 dark:text-white">{agency.seatsUsed} / {agency.seatsAllowed}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      seatPercent >= 90 ? "bg-warning-500" : "bg-brand-600"
                    }`}
                    style={{ width: `${seatPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-400">{agency.seatsAllowed - agency.seatsUsed} available seat(s)</p>
              </div>

              {/* Listings Quota Bar */}
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-500 dark:text-ink-400">Inventory Quota</span>
                  <span className="font-semibold text-ink-900 dark:text-white">{agency.activeListings} / {listingCap}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${listingPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-400">{Math.max(0, listingCap - agency.activeListings)} listings remaining</p>
              </div>

              {/* Boost Credits Bar */}
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-500 dark:text-ink-400">Boost Credits</span>
                  <span className="font-semibold text-ink-900 dark:text-white">{agency.boostCredits} Active</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: agency.boostCredits > 0 ? "60%" : "0%" }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-400">Promotional listing credits</p>
              </div>
            </div>
          </div>

          {/* Quick Broker Team Preview */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Broker Team Overview</h3>
                <p className="text-xs text-ink-500 dark:text-ink-400">{agency.brokers} affiliated agents registered</p>
              </div>
              <button
                onClick={() => onNavigateTab("brokers")}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 font-medium"
              >
                View All Brokers ({agency.brokers}) <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-ink-100 dark:divide-ink-800">
              {agency.brokerTeam.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-400">No brokers registered yet under this agency.</p>
              ) : (
                agency.brokerTeam.slice(0, 4).map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2.5 text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-800 dark:text-ink-200 truncate" title={b.name}>{b.name}</p>
                      <p className="text-[11px] text-ink-400 truncate">{b.id} {b.phone ? `· ${b.phone}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-ink-900 dark:text-white">{b.closures}</span>
                      <span className="text-ink-400 ml-1">closures</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Boundaries Notice */}
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
            <AlertCircle className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink-700 dark:text-ink-200">
                Agency Oversight & Module Separation
              </p>
              <p className="mt-0.5 leading-relaxed">
                This Agency command center summarizes agency-level capacity, inventory, and performance. In-depth property moderation is managed in <strong>Properties</strong>, individual broker verification in <strong>Brokers</strong>, billing in <strong>Revenue</strong>, and advertising runs in <strong>Ad Campaigns</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900 min-w-0">
      <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wider truncate" title={label}>{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-ink-900 dark:text-white" title={String(value)}>{value}</p>
      {subtext && <p className="mt-0.5 truncate text-[11px] text-ink-400" title={subtext}>{subtext}</p>}
    </div>
  );
}
