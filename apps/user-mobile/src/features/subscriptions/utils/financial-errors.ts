/**
 * Safe Financial Error Presentation & Mapping (Step 9A)
 *
 * Enforces:
 * 1. Privacy & Security: Strips provider diagnostics, database stack traces, and raw internal errors.
 * 2. Financial Safety: NEVER instructs user to retry payment when transaction status is uncertain.
 * 3. User Experience: Provides clear, accessible, and actionable guidance for known financial states.
 */

import { ApiError } from "@/services/api/errors";

export interface FinancialErrorPresentation {
  readonly title: string;
  readonly message: string;
  readonly actionLabel?: string;
  readonly canRetry: boolean;
  readonly requiresSupport: boolean;
  readonly isPendingVerification: boolean;
}

export function mapFinancialErrorToPresentation(
  error: unknown,
): FinancialErrorPresentation {
  const code = error instanceof ApiError ? String(error.code) : "";
  const status = error instanceof ApiError ? error.status : undefined;

  // 1. Pending/Uncertain Payment Status (CRITICAL SAFETY RULE: DO NOT RETRY)
  if (
    code === "PAYMENT_STATUS_UNCERTAIN" ||
    code === "RECONCILIATION_PENDING" ||
    code === "TRANSACTION_IN_FLIGHT" ||
    code === "IDEMPOTENCY_KEY_IN_FLIGHT" ||
    code === "PURCHASE_ALREADY_IN_PROGRESS"
  ) {
    return {
      title: "Payment Verification In Progress",
      message:
        "Your transaction is currently being verified with the banking authority. Please do not re-attempt payment to prevent duplicate debits. Check your payment history shortly.",
      actionLabel: "View Payment History",
      canRetry: false,
      requiresSupport: false,
      isPendingVerification: true,
    };
  }

  // 2. Contract Pending (Backend Step 9 not yet live)
  if (code === "CONTRACT_PENDING" || code === "FINANCIAL_SERVICE_UNAVAILABLE") {
    return {
      title: "Service Under Activation",
      message:
        "The digital membership and online payment gateway is currently completing activation. Please check back shortly.",
      actionLabel: "Return to Account",
      canRetry: false,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 3. Plan Unavailable / Not Found
  if (code === "PLAN_UNAVAILABLE" || code === "PLAN_NOT_FOUND") {
    return {
      title: "Plan Unavailable",
      message:
        "The selected membership plan is currently not available for new subscriptions. Please select another plan.",
      actionLabel: "Explore Available Plans",
      canRetry: false,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 4. Account Ineligible
  if (code === "ACCOUNT_INELIGIBLE" || code === "FORBIDDEN") {
    return {
      title: "Account Ineligible",
      message:
        "This membership plan is restricted to specific account roles. Please verify your account type or contact support.",
      actionLabel: "Contact Support",
      canRetry: false,
      requiresSupport: true,
      isPendingVerification: false,
    };
  }

  // 5. Entitlement Quota Exceeded / Missing
  if (code === "ENTITLEMENT_MISSING" || code === "QUOTA_EXCEEDED") {
    return {
      title: "Membership Limit Reached",
      message:
        "You have reached the usage limit for your current membership tier. Upgrade your plan to unlock additional capacity.",
      actionLabel: "View Membership Plans",
      canRetry: false,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 6. Session Expired / Unauthorized
  if (code === "SESSION_EXPIRED" || code === "UNAUTHORIZED" || status === 401) {
    return {
      title: "Session Expired",
      message:
        "For your financial security, your session has expired. Please sign in again to access membership management.",
      actionLabel: "Sign In",
      canRetry: false,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 7. Rate Limited
  if (code === "RATE_LIMITED" || status === 429) {
    return {
      title: "Too Many Requests",
      message:
        "Too many recent operations. For security, please wait a few moments before trying again.",
      canRetry: true,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 8. Payment Definitively Failed
  if (code === "PAYMENT_FAILED" || code === "CARD_DECLINED") {
    return {
      title: "Payment Unsuccessful",
      message:
        "The banking gateway was unable to complete this transaction. No funds were captured for this subscription.",
      actionLabel: "Try Different Method",
      canRetry: true,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 9. Invoice Unavailable
  if (code === "INVOICE_UNAVAILABLE" || code === "INVOICE_NOT_FOUND") {
    return {
      title: "Tax Invoice Generating",
      message:
        "Tax invoices are compiled after billing confirmation. If recently billed, please allow up to 24 hours for the document to finalize.",
      actionLabel: "Check Back Later",
      canRetry: false,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // 10. Service Unavailable / Network Error
  if (code === "NETWORK_ERROR" || code === "TIMEOUT" || status === 503) {
    return {
      title: "Service Temporarily Unavailable",
      message:
        "Our billing services are temporarily undergoing maintenance. Please check your connection or try again in a few moments.",
      actionLabel: "Retry Connection",
      canRetry: true,
      requiresSupport: false,
      isPendingVerification: false,
    };
  }

  // Generic Fallback
  return {
    title: "Unable to Complete Request",
    message:
      "A technical difficulty prevented this operation. Your account and financial information remain secure.",
    actionLabel: "Return to Account",
    canRetry: false,
    requiresSupport: true,
    isPendingVerification: false,
  };
}
