/**
 * Support API Routes & Endpoints
 */

export const SUPPORT_ROUTES = {
  TICKETS: "/api/v1/support/tickets",
  TICKET_DETAIL: (ticketId: string) =>
    `/api/v1/support/tickets/${encodeURIComponent(ticketId.trim())}`,
} as const;
