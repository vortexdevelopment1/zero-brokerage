export type PayoutStatus = "pending" | "processing" | "paid" | "failed";
export type DealStatus = "in-progress" | "closed" | "cancelled";
export type PaymentStatus = "success" | "pending" | "failed" | "refunded";

export interface CommissionEntry {
  id: string;
  dealId: string;
  property: string;
  broker: string;
  dealValue: number;
  commissionRate: number; // percentage, e.g. 1.5 (0 for luxury)
  platformCommission: number;
  isLuxury: boolean;
  dealStatus: DealStatus;
  payoutStatus: PayoutStatus;
  date: string;
}

export type SubscriptionAudience = "user" | "agency";

export interface SubscriptionEntry {
  id: string;
  audience: SubscriptionAudience;
  plan: string;
  subscriber: string;
  revenue: number;
  status: "active" | "expired";
  purchaseDate: string;
  expiryDate: string;
  paymentStatus: PaymentStatus;
}

export interface MicroTransactionEntry {
  id: string;
  user: string;
  alertType: "WhatsApp" | "SMS";
  amount: number;
  paymentStatus: PaymentStatus;
  date: string;
}

export type TransactionType =
  | "subscription"
  | "commission-payout"
  | "micro-transaction"
  | "refund";

export interface TransactionEntry {
  id: string;
  entity: string;
  type: TransactionType;
  amount: number;
  status: PaymentStatus;
  gateway: "Razorpay" | "Stripe";
  date: string;
}

export interface RevenueOverview {
  totalRevenue: number;
  subscriptionRevenue: number;
  commissionRevenue: number;
  microTransactionRevenue: number;
  revenueTrend: { month: string; revenue: number }[];
  revenueBySource: { source: string; value: number }[];
}
