import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { Property, PropertyDetail, PropertyFilters, PropertyMainCategory } from "@/types/property";
import { MOCK_PROPERTIES, getMockPropertyDetail } from "@/services/mock/properties.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * Property service — proposed contract:
 * GET /api/admin/properties · GET /api/admin/properties/:id · PATCH /api/admin/properties/:id/status
 */
export const propertyService = {
  getProperties: (
    filters: PropertyFilters & { category?: PropertyMainCategory | "all" } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Property>> =>
    simulateNetwork(() => {
      let rows = MOCK_PROPERTIES;
      if (filters.category && filters.category !== "all") rows = rows.filter((p) => p.category === filters.category);
      if (filters.status && filters.status !== "all") rows = rows.filter((p) => p.status === filters.status);
      if (filters.location) rows = rows.filter((p) => matchesSearch([p.city, p.locality], filters.location));
      if (typeof filters.minPrice === "number") rows = rows.filter((p) => p.price >= filters.minPrice!);
      if (typeof filters.maxPrice === "number") rows = rows.filter((p) => p.price <= filters.maxPrice!);
      if (filters.search) rows = rows.filter((p) => matchesSearch([p.title, p.id, p.broker, p.agency], filters.search));
      return paginate(rows, pagination);
    }),

  getProperty: (id: string): Promise<PropertyDetail | null> => simulateNetwork(() => getMockPropertyDetail(id)),

  approveProperty: (id: string): Promise<{ id: string; status: string }> =>
    simulateNetwork(() => {
      const property = MOCK_PROPERTIES.find((p) => p.id === id);
      if (property) property.status = "approved";
      return { id, status: "approved" };
    }),

  rejectProperty: (id: string): Promise<{ id: string; status: string }> =>
    simulateNetwork(() => {
      const property = MOCK_PROPERTIES.find((p) => p.id === id);
      if (property) property.status = "rejected";
      return { id, status: "rejected" };
    }),

  updatePropertyStatus: (id: string, status: Property["status"]): Promise<{ id: string; status: Property["status"] }> =>
    simulateNetwork(() => {
      const property = MOCK_PROPERTIES.find((p) => p.id === id);
      if (property) property.status = status;
      return { id, status };
    }),
};
