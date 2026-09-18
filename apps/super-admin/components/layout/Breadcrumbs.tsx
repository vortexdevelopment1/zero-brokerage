import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-ink-500">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-ink-300" />}
          {c.href ? (
            <Link href={c.href} className="transition-colors hover:text-brand-600">
              {c.label}
            </Link>
          ) : (
            <span className="text-ink-600">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
