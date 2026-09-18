"use client";

import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-8 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 transition-colors hover:text-ink-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
