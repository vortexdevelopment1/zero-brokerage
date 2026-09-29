"use client";

import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Home,
  CreditCard,
  Megaphone,
  TrendingUp,
  History,
} from "lucide-react";
import { AgencyDetail, getDerivedVerificationStatus } from "@/types/agency";

export type AgencyTabKey =
  | "overview"
  | "verification"
  | "brokers"
  | "inventory"
  | "subscription"
  | "advertising"
  | "performance"
  | "activity";

interface AgencyTabsProps {
  activeTab: AgencyTabKey;
  onSelectTab: (tab: AgencyTabKey) => void;
  agency: AgencyDetail;
}

export function AgencyTabs({ activeTab, onSelectTab, agency }: AgencyTabsProps) {
  const derivedVerification = getDerivedVerificationStatus(agency.status);

  const tabs: {
    key: AgencyTabKey;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: string | number;
    badgeTone?: "brand" | "warning" | "success" | "neutral";
  }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    {
      key: "verification",
      label: "Verification",
      icon: ShieldCheck,
      badge: derivedVerification === "pending_review" ? "Pending" : undefined,
      badgeTone: "warning",
    },
    {
      key: "brokers",
      label: "Brokers",
      icon: Users,
      badge: agency.brokers,
      badgeTone: "neutral",
    },
    {
      key: "inventory",
      label: "Inventory",
      icon: Home,
      badge: agency.activeListings,
      badgeTone: "neutral",
    },
    { key: "subscription", label: "Subscription", icon: CreditCard },
    { key: "advertising", label: "Advertising", icon: Megaphone },
    { key: "performance", label: "Performance", icon: TrendingUp },
    { key: "activity", label: "Activity", icon: History },
  ];

  return (
    <div className="mb-6 border-b border-ink-200 dark:border-ink-800">
      <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Agency Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700 dark:text-ink-400 dark:hover:border-ink-700 dark:hover:text-ink-200"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-ink-400 group-hover:text-ink-600 dark:text-ink-500 dark:group-hover:text-ink-300"
                }`}
              />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                      : tab.badgeTone === "warning"
                      ? "bg-warning-100 text-warning-800 dark:bg-warning-950/60 dark:text-warning-300"
                      : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
