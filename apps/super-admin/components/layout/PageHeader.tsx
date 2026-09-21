import { ReactNode } from "react";
import { Breadcrumbs, Crumb } from "./Breadcrumbs";

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-ink-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {crumbs && <Breadcrumbs crumbs={crumbs} />}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
