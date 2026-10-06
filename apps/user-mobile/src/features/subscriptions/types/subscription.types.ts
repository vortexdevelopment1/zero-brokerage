/**
 * Subscriptions, Payments & Entitlements Domain Types (Step 9A)
 *
 * Strict Compliance:
 * 1. Modeled strictly on Step 9 User App Blueprint vocabulary.
 * 2. NO invented database fields or provider payloads.
 * 3. NO local financial formulas, tax rates, or pricing calculations.
 * 4. NO fake payment confirmation or local entitlement derivation.
 */

export type PlanBillingInterval =
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUAL"
  | "ANNUAL"
  | "ONE_TIME";

export type PlanAvailability =
  | "AVAILABLE"
  | "COMING_SOON"
  | "INVITE_ONLY"
  | "UNAVAILABLE";

export interface PlanEntitlement {
  readonly key: string;
  readonly label: string;
  readonly limitDisplay?: string;
  readonly description?: string;
}

export interface SubscriptionPlan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly billingInterval: PlanBillingInterval;
  readonly displayPrice?: string;
  readonly currency?: string;
  readonly taxFeeLabels?: readonly string[];
  readonly includedEntitlements: readonly PlanEntitlement[];
  readonly usageLimits?: Readonly<Record<string, number | string>>;
  readonly eligibility?: string;
  readonly trialIntroductoryTerms?: string;
  readonly renewalCancellationInfo?: string;
  readonly availability: PlanAvailability;
  readonly isFeatured?: boolean;
}

export type SubscriptionState =
  | "PENDING"
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "IN_GRACE_PERIOD"
  | "CANCELLED"
  | "EXPIRED"
  | "SUSPENDED"
  | "PAYMENT_ACTION_REQUIRED"
  | "UNKNOWN";

export type SubscriptionRenewalState =
  | "AUTO_RENEW"
  | "MANUAL"
  | "DO_NOT_RENEW"
  | "UNKNOWN";

export interface UserSubscription {
  readonly id: string;
  readonly planId: string;
  readonly planName: string;
  readonly state: SubscriptionState;
  readonly billingInterval: PlanBillingInterval;
  readonly startDate?: string;
  readonly currentPeriodStart?: string;
  readonly currentPeriodEnd?: string;
  readonly nextBillingDate?: string;
  readonly renewalState?: SubscriptionRenewalState;
  readonly cancellationEffectiveDate?: string;
  readonly gracePeriodEnd?: string;
  readonly paymentActionRequired?: boolean;
  readonly displayPrice?: string;
  readonly currency?: string;
}

export interface EntitlementItem {
  readonly featureKey: string;
  readonly label: string;
  readonly description?: string;
  readonly usedCount?: number;
  readonly limitCount?: number;
  readonly remainingQuota?: number;
  readonly unlimited?: boolean;
  readonly isAllowed: boolean;
  readonly denialReason?: string;
}

export type PaymentTransactionStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REQUIRES_ACTION"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "RECONCILIATION_PENDING"
  | "UNKNOWN";

export type PaymentTransactionType =
  | "SUBSCRIPTION_PURCHASE"
  | "SUBSCRIPTION_RENEWAL"
  | "FURNITURE_RENTAL"
  | "FURNITURE_PURCHASE"
  | "OTHER";

export type RefundStatus =
  | "NONE"
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "UNKNOWN";

export interface PaymentHistoryItem {
  readonly id: string;
  readonly date: string;
  readonly transactionType: PaymentTransactionType;
  readonly productContext: string;
  readonly displayAmount?: string;
  readonly currency?: string;
  readonly status: PaymentTransactionStatus;
  readonly publicTransactionReference?: string;
  readonly invoiceAvailable: boolean;
  readonly invoiceId?: string;
  readonly refundStatus?: RefundStatus;
}

export interface PaymentHistoryResponse {
  readonly items: readonly PaymentHistoryItem[];
  readonly hasMore: boolean;
  readonly total?: number;
  readonly page?: number;
}
