"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-3.5 dark:border-ink-800 sm:flex-row">
      <p className="text-xs text-ink-500 dark:text-ink-400">
        Showing <span className="font-medium text-ink-700 dark:text-ink-200">{start}</span>–
        <span className="font-medium text-ink-700 dark:text-ink-200">{end}</span> of{" "}
        <span className="font-medium text-ink-700 dark:text-ink-200">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[70px] text-center text-xs text-ink-500 dark:text-ink-400">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
