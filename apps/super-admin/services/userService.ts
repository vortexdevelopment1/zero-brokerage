import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { AppUser, AppUserDetail, UserFilters } from "@/types/user";
import { MOCK_USERS, getMockUserDetail } from "@/services/mock/users.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * User service — mock-backed today; proposed contract:
 * GET /api/admin/users · GET /api/admin/users/:id · PATCH /api/admin/users/:id/status · DELETE /api/admin/users/:id
 */
export const userService = {
  getUsers: (filters: UserFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<AppUser>> =>
    simulateNetwork(() => {
      let rows = MOCK_USERS;
      if (filters.status && filters.status !== "all") rows = rows.filter((u) => u.status === filters.status);
      if (filters.subscription && filters.subscription !== "all")
        rows = rows.filter((u) => u.subscription === filters.subscription);
      if (filters.verification && filters.verification !== "all")
        rows = rows.filter((u) => u.verification === filters.verification);
      if (filters.search) rows = rows.filter((u) => matchesSearch([u.name, u.email, u.phone, u.id], filters.search));
      return paginate(rows, pagination);
    }),

  getUser: (id: string): Promise<AppUserDetail | null> => simulateNetwork(() => getMockUserDetail(id)),

  updateUserStatus: (id: string, status: AppUser["status"]): Promise<{ id: string; status: AppUser["status"] }> =>
    simulateNetwork(() => {
      const user = MOCK_USERS.find((u) => u.id === id);
      if (user) user.status = status;
      return { id, status };
    }),

  deleteUser: (id: string): Promise<{ id: string; deleted: boolean }> =>
    simulateNetwork(() => ({ id, deleted: true })),
};
