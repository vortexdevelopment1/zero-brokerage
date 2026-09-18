"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { TableColumn } from "@/types/common";
import { TableSkeleton } from "./States";

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, emptyState, onRowClick }: DataTableProps<T>) {
  if (isLoading) return <TableSkeleton />;
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  "whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "transition-colors hover:bg-brand-50/40",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-5 py-3.5 align-middle text-ink-700",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
