import { PaginatedResult, PaginationParams } from "@/types/common";

export function paginate<T>(items: T[], params?: PaginationParams): PaginatedResult<T> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return { items: pageItems, page, pageSize, total, totalPages };
}

export function matchesSearch(haystacks: (string | null | undefined)[], query?: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => h?.toLowerCase().includes(q));
}
