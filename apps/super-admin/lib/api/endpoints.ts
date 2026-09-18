/**
 * Centralized API endpoint configuration.
 *
 * IMPORTANT: These are PROPOSED FRONTEND CONTRACTS, not confirmed backend URLs.
 * The BRD/SOW do not finalize exact route paths — this file exists so every
 * service module points at one place, and the paths can change without
 * touching any component or page.
 *
 * Once the Fastify backend is live, only this file + lib/api/client.ts should
 * need to change to move off mock data.
 */

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiEndpoints = {
  base,
  admin: {
    auth: {
      login: "/api/admin/auth/login",
      logout: "/api/admin/auth/logout",
      session: "/api/admin/auth/session",
    },
    dashboard: {
      stats: "/api/admin/dashboard",
      revenueTrend: "/api/admin/dashboard/revenue-trend",
      userGrowth: "/api/admin/dashboard/user-growth",
      recentActivity: "/api/admin/dashboard/recent-activity",
    },
    users: {
      list: "/api/admin/users",
      detail: (id: string) => `/api/admin/users/${id}`,
      updateStatus: (id: string) => `/api/admin/users/${id}/status`,
      remove: (id: string) => `/api/admin/users/${id}`,
    },
    brokers: {
      list: "/api/admin/brokers",
      detail: (id: string) => `/api/admin/brokers/${id}`,
      approve: (id: string) => `/api/admin/brokers/${id}/approve`,
      reject: (id: string) => `/api/admin/brokers/${id}/reject`,
      updateStatus: (id: string) => `/api/admin/brokers/${id}/status`,
      reviews: (id: string) => `/api/admin/brokers/${id}/reviews`,
    },
    agencies: {
      list: "/api/admin/agencies",
      detail: (id: string) => `/api/admin/agencies/${id}`,
      approve: (id: string) => `/api/admin/agencies/${id}/approve`,
      reject: (id: string) => `/api/admin/agencies/${id}/reject`,
      updateStatus: (id: string) => `/api/admin/agencies/${id}/status`,
    },
    properties: {
      list: "/api/admin/properties",
      detail: (id: string) => `/api/admin/properties/${id}`,
      updateStatus: (id: string) => `/api/admin/properties/${id}/status`,
    },
    visits: {
      list: "/api/admin/visits",
      detail: (id: string) => `/api/admin/visits/${id}`,
      updateStatus: (id: string) => `/api/admin/visits/${id}/status`,
    },
    revenue: {
      overview: "/api/admin/revenue/overview",
      subscriptions: "/api/admin/revenue/subscriptions",
      commission: "/api/admin/revenue/commission",
      microTransactions: "/api/admin/revenue/micro-transactions",
      transactions: "/api/admin/revenue/transactions",
    },
    urgentRequirements: {
      list: "/api/admin/urgent-requirements",
      updateStatus: (id: string) => `/api/admin/urgent-requirements/${id}/status`,
    },
    reports: {
      base: "/api/admin/reports",
    },
    monitoring: {
      snapshot: "/api/admin/monitoring",
    },
  },
} as const;
