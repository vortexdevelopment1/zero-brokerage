/**
 * Centralized Status Presentation Mappings (Step 9A)
 *
 * Enforces:
 * 1. Presentation mapping only — NO local state-transition logic.
 * 2. Unknown states fail safely with a neutral, non-deceptive presentation.
 * 3. Status is never conveyed by color alone (always has textual label & accessible description).
 */

import type {
  PaymentTransactionStatus,
  SubscriptionState,
  RefundStatus,
} from "../types/subscription.types";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusPresentation {
  readonly label: string;
  readonly tone: StatusTone;
  readonly icon: string;
  readonly description: string;
  readonly accessibilityLabel: string;
}

/**
 * Maps payment transaction status to safe presentation properties.
 */
export function mapPaymentStatusToPresentation(
  status: PaymentTransactionStatus | string | null | undefined,
): StatusPresentation {
  switch (status) {
    case "SUCCEEDED":
      return {
        label: "Successful",
        tone: "success",
        icon: "✓",
        description: "Payment confirmed by billing authority.",
        accessibilityLabel: "Payment successful",
      };
    case "PENDING":
      return {
        label: "Pending",
        tone: "warning",
        icon: "⏳",
        description: "Awaiting provider confirmation.",
        accessibilityLabel: "Payment pending confirmation",
      };
    case "PROCESSING":
      return {
        label: "Processing",
        tone: "info",
        icon: "🔄",
        description: "Transaction is being processed securely.",
        accessibilityLabel: "Payment processing",
      };
    case "CREATED":
      return {
        label: "Initiated",
        tone: "neutral",
        icon: "⏱",
        description: "Payment session initiated.",
        accessibilityLabel: "Payment session initiated",
      };
    case "FAILED":
      return {
        label: "Failed",
        tone: "error",
        icon: "✕",
        description: "Payment was not completed.",
        accessibilityLabel: "Payment failed",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "neutral",
        icon: "⊘",
        description: "Payment was cancelled.",
        accessibilityLabel: "Payment cancelled",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        tone: "neutral",
        icon: "⌛",
        description: "Payment session timed out.",
        accessibilityLabel: "Payment expired",
      };
    case "REQUIRES_ACTION":
      return {
        label: "Action Required",
        tone: "warning",
        icon: "⚠",
        description: "Additional authentication or verification required.",
        accessibilityLabel: "Payment requires action",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        tone: "info",
        icon: "↩",
        description: "Amount refunded to source.",
        accessibilityLabel: "Payment refunded",
      };
    case "PARTIALLY_REFUNDED":
      return {
        label: "Partially Refunded",
        tone: "info",
        icon: "↩",
        description: "Partial refund processed.",
        accessibilityLabel: "Payment partially refunded",
      };
    case "RECONCILIATION_PENDING":
      return {
        label: "Verification Pending",
        tone: "warning",
        icon: "🔍",
        description: "Verifying payment with bank network. Please do not re-attempt payment.",
        accessibilityLabel: "Payment verification pending",
      };
    default:
      return {
        label: "Verification Pending",
        tone: "neutral",
        icon: "ℹ",
        description: "Transaction status is being confirmed by the billing authority.",
        accessibilityLabel: "Transaction status pending confirmation",
      };
  }
}

/**
 * Maps subscription lifecycle state to safe presentation properties.
 */
export function mapSubscriptionStatusToPresentation(
  state: SubscriptionState | string | null | undefined,
): StatusPresentation {
  switch (state) {
    case "ACTIVE":
      return {
        label: "Active",
        tone: "success",
        icon: "✓",
        description: "Membership active with full plan entitlements.",
        accessibilityLabel: "Membership active",
      };
    case "TRIALING":
      return {
        label: "Trial Period",
        tone: "info",
        icon: "✨",
        description: "Complimentary preview active.",
        accessibilityLabel: "Membership in trial period",
      };
    case "PENDING":
      return {
        label: "Activation Pending",
        tone: "warning",
        icon: "⏳",
        description: "Activation underway. Entitlements will be available shortly.",
        accessibilityLabel: "Membership activation pending",
      };
    case "PAST_DUE":
      return {
        label: "Past Due",
        tone: "warning",
        icon: "⚠",
        description: "Renewal payment overdue. Please update payment method.",
        accessibilityLabel: "Membership past due",
      };
    case "IN_GRACE_PERIOD":
      return {
        label: "Grace Period",
        tone: "warning",
        icon: "🛡",
        description: "Access temporarily retained during grace period.",
        accessibilityLabel: "Membership in grace period",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "neutral",
        icon: "⊘",
        description: "Membership cancelled.",
        accessibilityLabel: "Membership cancelled",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        tone: "neutral",
        icon: "⌛",
        description: "Membership period concluded.",
        accessibilityLabel: "Membership expired",
      };
    case "SUSPENDED":
      return {
        label: "Suspended",
        tone: "error",
        icon: "⛔",
        description: "Membership temporarily suspended.",
        accessibilityLabel: "Membership suspended",
      };
    case "PAYMENT_ACTION_REQUIRED":
      return {
        label: "Payment Action Needed",
        tone: "error",
        icon: "💳",
        description: "Payment verification required to maintain active status.",
        accessibilityLabel: "Payment action required for membership",
      };
    default:
      return {
        label: "Status Unavailable",
        tone: "neutral",
        icon: "ℹ",
        description: "Membership status details are currently updating.",
        accessibilityLabel: "Membership status unavailable",
      };
  }
}

/**
 * Maps refund status to safe presentation properties.
 */
export function mapRefundStatusToPresentation(
  status: RefundStatus | string | null | undefined,
): StatusPresentation {
  switch (status) {
    case "SUCCEEDED":
      return {
        label: "Refund Completed",
        tone: "success",
        icon: "✓",
        description: "Refund credited to the original payment source.",
        accessibilityLabel: "Refund completed",
      };
    case "PROCESSING":
      return {
        label: "Refund Processing",
        tone: "info",
        icon: "🔄",
        description: "Refund request is being processed by the banking network.",
        accessibilityLabel: "Refund processing",
      };
    case "REQUESTED":
      return {
        label: "Refund Requested",
        tone: "warning",
        icon: "⏳",
        description: "Refund request logged for review.",
        accessibilityLabel: "Refund requested",
      };
    case "FAILED":
      return {
        label: "Refund Issue",
        tone: "error",
        icon: "⚠",
        description: "Refund processing issue. Please contact support.",
        accessibilityLabel: "Refund issue",
      };
    default:
      return {
        label: "None",
        tone: "neutral",
        icon: "-",
        description: "No refund requested for this transaction.",
        accessibilityLabel: "No refund",
      };
  }
}
