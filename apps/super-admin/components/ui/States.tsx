import { AlertTriangle, Inbox, Loader2, LucideIcon, ShieldAlert } from "lucide-react";

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-white py-16 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-ink-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
            <div className="h-2.5 w-1/5 animate-pulse rounded bg-ink-100" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-full bg-ink-100" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description = "There's no data to show for the current filters.",
  icon: Icon = Inbox,
  action,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card">
        <Icon className="h-5 w-5 text-ink-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink-800">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this data",
  description = "Something went wrong while fetching from the service layer. Try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger-100 bg-danger-100/40 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card">
        <AlertTriangle className="h-5 w-5 text-danger-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink-800">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-600/90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function UnauthorizedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-warning-100 bg-warning-100/40 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card">
        <ShieldAlert className="h-5 w-5 text-warning-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink-800">Session expired</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">Your admin session is no longer valid. Please sign in again.</p>
      </div>
    </div>
  );
}
