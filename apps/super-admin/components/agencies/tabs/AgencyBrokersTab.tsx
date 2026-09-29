"use client";

import { useRouter } from "next/navigation";
import { Users, UserCheck, ArrowUpRight, Phone, Mail, Star, ExternalLink } from "lucide-react";
import { AgencyDetail } from "@/types/agency";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AgencyBrokersTabProps {
  agency: AgencyDetail;
}

export function AgencyBrokersTab({ agency }: AgencyBrokersTabProps) {
  const router = useRouter();
  const brokers = agency.brokerTeam || [];
  const activeCount = brokers.filter((b) => b.status !== "suspended").length;
  const totalClosures = brokers.reduce((acc, b) => acc + b.closures, 0);
  const avgRating = brokers.length > 0
    ? (brokers.reduce((acc, b) => acc + (b.rating ?? 4.5), 0) / brokers.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      {/* Top Broker Team Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Total Brokers</p>
          <p className="mt-1 text-xl font-bold text-ink-900 dark:text-white">{agency.brokers}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Capacity: {agency.seatsAllowed} seats</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Active Brokers</p>
          <p className="mt-1 text-xl font-bold text-success-600 dark:text-success-400">{activeCount}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Currently active</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Team Closures</p>
          <p className="mt-1 text-xl font-bold text-ink-900 dark:text-white">{totalClosures}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Deals executed</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Average Rating</p>
          <p className="mt-1 text-xl font-bold text-amber-500 flex items-center gap-1">
            <span>{avgRating}</span>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </p>
          <p className="text-[11px] text-ink-400 mt-0.5">Client satisfaction</p>
        </div>
      </div>

      {/* Scope Notice: Broker KYC is in Brokers module */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50/70 p-4 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
        <div className="flex items-start gap-2.5">
          <UserCheck className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-800 dark:text-ink-200">
              Broker Verification Boundary
            </p>
            <p className="mt-0.5">
              Brokers are verified individually under the Broker module. Detailed RERA certificates, broker-level KYC, and commission splits are managed directly within their individual profiles.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/admin/brokers?search=${encodeURIComponent(agency.name)}`)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          <span>Open in Brokers Module</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Broker Team Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-100 p-4 dark:border-ink-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
            Brokers Assigned to {agency.name} ({brokers.length})
          </h3>
          <span className="text-xs text-ink-400">Click a broker row to view detailed profile</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-700 dark:text-ink-300">
            <thead className="border-b border-ink-100 bg-ink-50/75 text-[11px] uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Broker Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Properties Listed</th>
                <th className="px-4 py-3 font-semibold">Closures</th>
                <th className="px-4 py-3 font-semibold">Rating</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {brokers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                    No brokers assigned to this agency yet.
                  </td>
                </tr>
              ) : (
                brokers.map((broker) => (
                  <tr
                    key={broker.id}
                    onClick={() => router.push(`/admin/brokers/${broker.id}`)}
                    className="cursor-pointer transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/50"
                  >
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <p className="font-semibold text-ink-900 dark:text-white truncate" title={broker.name}>{broker.name}</p>
                      <p className="text-[11px] font-mono text-ink-400 truncate">{broker.id}</p>
                    </td>

                    <td className="px-4 py-3.5 max-w-[200px]">
                      <div className="space-y-0.5 text-[11px]">
                        <p className="text-ink-600 dark:text-ink-300 flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 text-ink-400 shrink-0" />
                          <span className="truncate">{broker.phone || "—"}</span>
                        </p>
                        <p className="text-ink-500 dark:text-ink-400 flex items-center gap-1 truncate" title={broker.email || undefined}>
                          <Mail className="h-3 w-3 text-ink-400 shrink-0" />
                          <span className="truncate">{broker.email || "—"}</span>
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-medium text-ink-800 dark:text-ink-200">
                        {broker.propertiesListed ?? 8} listings
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ink-900 dark:text-white">
                        {broker.closures} deals
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {broker.rating ?? 4.5}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={broker.status || "active"} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/brokers/${broker.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                      >
                        Profile <ArrowUpRight className="h-3 w-3" />
                      </button>
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
