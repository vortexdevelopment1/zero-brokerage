"use client";

import { ChevronDown } from "lucide-react";
import { SelectOption } from "@/types/common";

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-8 text-sm text-ink-700 outline-none transition-colors hover:border-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-400" />
    </label>
  );
}
