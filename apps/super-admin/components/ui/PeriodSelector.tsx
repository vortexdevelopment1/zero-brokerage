"use client";

import { ChevronDown, Calendar } from "lucide-react";
import { ChartPeriod } from "@/types/common";

const MONTHS = [
  { label: "All Months", value: 0 },
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 },
];

const YEARS = [
  { label: "2026", value: 2026 },
  { label: "2025", value: 2025 },
  { label: "2024", value: 2024 },
  { label: "All Years", value: 0 },
];

export interface PeriodSelectorProps {
  value: ChartPeriod;
  onChange: (period: ChartPeriod) => void;
  compact?: boolean;
  className?: string;
}

/**
 * Reusable Month / Year selector for analytics charts and report dashboards.
 * Follows the FilterDropdown styling and supports compact rendering for chart headers.
 */
export function PeriodSelector({
  value,
  onChange,
  compact = true,
  className = "",
}: PeriodSelectorProps) {
  const currentMonth = value.month ?? 0;
  const currentYear = value.year ?? 2026;

  const selectClasses = compact
    ? "appearance-none rounded-lg border border-ink-200 bg-white py-1.5 pl-2.5 pr-7 text-xs text-ink-700 outline-none transition-colors hover:border-ink-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-100 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-700 dark:focus:border-brand-500"
    : "appearance-none rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-8 text-sm text-ink-700 outline-none transition-colors hover:border-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-700 dark:focus:border-brand-500";

  const chevronClasses = compact
    ? "pointer-events-none absolute right-2 h-3 w-3 text-ink-400 dark:text-ink-500"
    : "pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-400 dark:text-ink-500";

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="hidden sm:inline-flex items-center text-ink-400 dark:text-ink-500">
        <Calendar className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>

      {/* Month Dropdown */}
      <label className="relative inline-flex items-center">
        <span className="sr-only">Select Month</span>
        <select
          value={currentMonth}
          onChange={(e) => {
            const m = parseInt(e.target.value, 10);
            onChange({
              ...value,
              month: m > 0 ? m : undefined,
            });
          }}
          className={selectClasses}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value} className="dark:bg-ink-900 dark:text-ink-200">
              {m.label}
            </option>
          ))}
        </select>
        <ChevronDown className={chevronClasses} />
      </label>

      {/* Year Dropdown */}
      <label className="relative inline-flex items-center">
        <span className="sr-only">Select Year</span>
        <select
          value={currentYear}
          onChange={(e) => {
            const y = parseInt(e.target.value, 10);
            onChange({
              ...value,
              year: y > 0 ? y : undefined,
            });
          }}
          className={selectClasses}
        >
          {YEARS.map((y) => (
            <option key={y.value} value={y.value} className="dark:bg-ink-900 dark:text-ink-200">
              {y.label}
            </option>
          ))}
        </select>
        <ChevronDown className={chevronClasses} />
      </label>
    </div>
  );
}
