"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, ExternalLink, Zap, Eye, MousePointer, TrendingUp } from "lucide-react";
import { AgencyDetail } from "@/types/agency";
import { AdCampaign } from "@/types/adRevenue";
import { agencyService } from "@/services/agencyService";
import { formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AgencyAdvertisingTabProps {
  agency: AgencyDetail;
}

export function AgencyAdvertisingTab({ agency }: AgencyAdvertisingTabProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    agencyService.getAgencyCampaigns(agency.name, 6).then((res) => {
      if (mounted) {
        setCampaigns(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [agency.name]);

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const impressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const clicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;

  return (
    <div className="space-y-6">
      {/* Advertising KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Active Campaigns</p>
          <p className="mt-1 text-xl font-bold text-ink-900 dark:text-white">{activeCount}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Running on portal</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Total Impressions</p>
          <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-400">{impressions.toLocaleString()}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Audience views</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Total Clicks</p>
          <p className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">{clicks.toLocaleString()}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Listing visits generated</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Average CTR</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{ctr}%</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Click-through rate</p>
        </div>
      </div>

      {/* Scope Disclaimer / Navigation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
        <div className="flex items-start gap-2.5">
          <Megaphone className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-800 dark:text-ink-200">
              Agency Advertising Overview
            </p>
            <p className="mt-0.5">
              Campaign budgets, creative banner moderation, geolocation targeting, and bid auctions are managed centrally under the Ad Campaigns module.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/admin/ad-campaigns?search=${encodeURIComponent(agency.name)}`)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          <span>Open in Ad Campaigns Module</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Agency Campaigns Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-100 p-4 dark:border-ink-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink-900 dark:text-white">
            Campaigns Running for {agency.name} ({campaigns.length})
          </h4>
          <span className="text-xs text-ink-400">Boost allowance remaining: {agency.boostCredits} credits</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-700 dark:text-ink-300">
            <thead className="border-b border-ink-100 bg-ink-50/75 text-[11px] uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Ad Type</th>
                <th className="px-4 py-3 font-semibold">Target Location</th>
                <th className="px-4 py-3 font-semibold">Impressions</th>
                <th className="px-4 py-3 font-semibold">Clicks</th>
                <th className="px-4 py-3 font-semibold">CTR</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400 animate-pulse">
                    Loading advertising campaigns…
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                    No active advertising campaigns for this agency.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-800/40">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink-900 dark:text-white">{c.title}</p>
                      <p className="text-[11px] font-mono text-ink-400">{c.id}</p>
                    </td>

                    <td className="px-4 py-3.5 capitalize">
                      <span className="font-medium text-ink-800 dark:text-ink-200">
                        {c.type.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-ink-600 dark:text-ink-300">
                      {c.targetLocation}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-ink-800 dark:text-ink-200">
                      {c.impressions.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-ink-800 dark:text-ink-200">
                      {c.clicks.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {c.ctr}%
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
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
