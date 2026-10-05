/**
 * Furniture Domain API Route Constants
 */

export const FURNITURE_ROUTES = {
  CATALOG: "/api/v1/furniture/catalog",
  DETAIL: (id: string) => `/api/v1/furniture/catalog/${encodeURIComponent(id)}`,
  CHECKOUT_SUMMARY: "/api/v1/furniture/checkout/summary",
  ORDERS: "/api/v1/furniture/orders",
  ORDER_DETAIL: (orderId: string) =>
    `/api/v1/furniture/orders/${encodeURIComponent(orderId)}`,
  CANCEL_ORDER: (orderId: string) =>
    `/api/v1/furniture/orders/${encodeURIComponent(orderId)}/cancel`,
  RETURN_ORDER: (orderId: string) =>
    `/api/v1/furniture/orders/${encodeURIComponent(orderId)}/return`,
  CLAIM_ORDER: (orderId: string) =>
    `/api/v1/furniture/orders/${encodeURIComponent(orderId)}/claim`,
  RETRY_PAYMENT: (orderId: string) =>
    `/api/v1/furniture/orders/${encodeURIComponent(orderId)}/retry-payment`,
} as const;
