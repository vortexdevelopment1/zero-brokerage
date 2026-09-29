"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, ArrowUpRight, ExternalLink, Building2, Tag, Layers } from "lucide-react";
import { AgencyDetail } from "@/types/agency";
import { Property } from "@/types/property";
import { agencyService } from "@/services/agencyService";
import { formatCurrencyINR, formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AgencyInventoryTabProps {
  agency: AgencyDetail;
}

export function AgencyInventoryTab({ agency }: AgencyInventoryTabProps) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    agencyService.getAgencyProperties(agency.name, 6).then((res) => {
      if (mounted) {
        setProperties(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [agency.name]);

  const total = agency.activeListings;
  const approvedCount = Math.round(total * 0.85);
  const pendingCount = Math.round(total * 0.1);
  const rejectedCount = total - approvedCount - pendingCount;

  return (
    <div className="space-y-6">
      {/* Top Inventory Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Total Portfolio</p>
          <p className="mt-1 text-xl font-bold text-ink-900 dark:text-white">{total}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Under agency management</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Active & Approved</p>
          <p className="mt-1 text-xl font-bold text-success-600 dark:text-success-400">{approvedCount}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Live on portal</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Pending Review</p>
          <p className="mt-1 text-xl font-bold text-warning-600 dark:text-warning-400">{pendingCount}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">In moderation queue</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Unavailable / Inactive</p>
          <p className="mt-1 text-xl font-bold text-ink-500 dark:text-ink-400">{Math.max(0, rejectedCount)}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Sold or archived</p>
        </div>
      </div>

      {/* Action / Boundary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
        <div className="flex items-start gap-2.5">
          <Layers className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-800 dark:text-ink-200">
              Inventory & Moderation Control
            </p>
            <p className="mt-0.5">
              Property moderation, price validation, spatial indexing, and listing status changes are managed through the central Properties module.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/admin/properties?search=${encodeURIComponent(agency.name)}`)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          <span>Open in Properties Module</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Category Distribution Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-100 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900">
          <span className="text-[10px] font-semibold uppercase text-brand-600 dark:text-brand-400">Residential</span>
          <p className="mt-1 text-base font-bold text-ink-900 dark:text-white">
            {Math.round(total * 0.55)} units
          </p>
          <p className="text-[11px] text-ink-400">Flats, Penthouses, Villas</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900">
          <span className="text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-400">Commercial</span>
          <p className="mt-1 text-base font-bold text-ink-900 dark:text-white">
            {Math.round(total * 0.28)} spaces
          </p>
          <p className="text-[11px] text-ink-400">Bare-shell, Offices, Retail</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900">
          <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Land & Plots</span>
          <p className="mt-1 text-base font-bold text-ink-900 dark:text-white">
            {Math.round(total * 0.12)} parcels
          </p>
          <p className="text-[11px] text-ink-400">Farmland & Industrial</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900">
          <span className="text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400">Furniture Packs</span>
          <p className="mt-1 text-base font-bold text-ink-900 dark:text-white">
            {Math.round(total * 0.05)} setups
          </p>
          <p className="text-[11px] text-ink-400">Turnkey office bundles</p>
        </div>
      </div>

      {/* Recent Inventory Preview Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-100 p-4 dark:border-ink-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
            Sample Agency Listings ({properties.length} shown)
          </h3>
          <span className="text-xs text-ink-400">Drill down into full inventory via Properties module</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-700 dark:text-ink-300">
            <thead className="border-b border-ink-100 bg-ink-50/75 text-[11px] uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Property Title</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Assigned Broker</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400 animate-pulse">
                    Loading inventory data…
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                    No active listings found for this agency.
                  </td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/admin/properties?search=${encodeURIComponent(p.id)}`)}
                    className="cursor-pointer transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/50"
                  >
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="font-semibold text-ink-900 dark:text-white truncate" title={p.title}>{p.title}</p>
                      <p className="text-[11px] font-mono text-ink-400 truncate">{p.id}</p>
                    </td>

                    <td className="px-4 py-3.5 capitalize">
                      <span className="font-medium text-ink-800 dark:text-ink-200">{p.category}</span>
                      <p className="text-[11px] text-ink-400">{p.subtype}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrencyINR(p.price)}
                      </span>
                      <span className="text-[10px] text-ink-400 ml-1">
                        {p.priceUnit === "rent-month" ? "/mo" : ""}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-ink-800 dark:text-ink-200">{p.locality}</p>
                      <p className="text-[11px] text-ink-400">{p.city}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-ink-700 dark:text-ink-300">{p.broker || "Unassigned"}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                        View <ArrowUpRight className="h-3 w-3" />
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
