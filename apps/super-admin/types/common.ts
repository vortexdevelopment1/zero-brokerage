// Shared, cross-module types used throughout the admin panel.
// Kept backend-agnostic: shapes here are what the UI needs, not a mirror of any table.

export type ApiStatus = "idle" | "loading" | "success" | "empty" | "error" | "unauthorized";

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface DateRangeParams {
  from?: string; // ISO date
  to?: string; // ISO date
}

export interface SortParams {
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
}

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

export interface SelectOption {
  label: string;
  value: string;
}

// A simulated network/API error the mock service layer can throw,
// so pages can be built against realistic error/loading/empty states
// before the real Fastify backend exists.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
