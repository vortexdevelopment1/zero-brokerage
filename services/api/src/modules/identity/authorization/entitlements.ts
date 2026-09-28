import { EntitlementMissingError } from "../../../common/errors/index.js";
import { env } from "../../../config/env.js";

export interface EntitlementCheckParams {
  userId: string;
  agencyId?: string;
  featureKey: string;
  currentCount?: number;
  currentUsage?: number;
}

export interface EntitlementEvaluation {
  allowed: boolean;
  isAllowed?: boolean;
  reason?: string;
  remainingQuota?: number;
  gracePeriodActive?: boolean;
  planTier?: string;
}

/**
 * Central interface for evaluating platform subscription entitlements.
 * Future subscription module will implement live quota checks against subscription tables.
 */
export interface EntitlementEvaluator {
  check(params: EntitlementCheckParams): Promise<EntitlementEvaluation>;
}

/**
 * Default server-side entitlement evaluator contract implementation.
 * In production, it fails closed (disallowing actions) until the authoritative
 * subscription module (Step 09) is attached, preventing fabricated production entitlements.
 * In development and test environments, it provides mock quota evaluation for developer productivity.
 */
export class DefaultEntitlementEvaluator implements EntitlementEvaluator {
  private isProduction: boolean;

  constructor(options?: { isProduction?: boolean | undefined }) {
    this.isProduction = options?.isProduction ?? env.NODE_ENV === "production";
  }

  async check(params: EntitlementCheckParams): Promise<EntitlementEvaluation> {
    if (this.isProduction) {
      return {
        allowed: false,
        isAllowed: false,
        reason: "SUBSCRIPTION_SERVICE_UNCONFIGURED",
        remainingQuota: 0,
      };
    }

    const usage = params.currentUsage ?? params.currentCount ?? 0;
    const maxQuota = 10;
    if (usage >= maxQuota) {
      return {
        allowed: false,
        isAllowed: false,
        reason: "USAGE_LIMIT_EXCEEDED",
        remainingQuota: 0,
        planTier: "PRO_BROKER",
      };
    }

    return {
      allowed: true,
      isAllowed: true,
      remainingQuota: maxQuota - usage,
      planTier: "PRO_BROKER",
    };
  }
}

let activeEvaluator: EntitlementEvaluator = new DefaultEntitlementEvaluator();

export function setEntitlementEvaluator(evaluator: EntitlementEvaluator): void {
  activeEvaluator = evaluator;
}

export function getEntitlementEvaluator(): EntitlementEvaluator {
  return activeEvaluator;
}

export async function evaluateEntitlement(
  params: EntitlementCheckParams,
): Promise<EntitlementEvaluation> {
  return activeEvaluator.check(params);
}

/**
 * Asserts that a user or organization possesses the required subscription entitlement.
 */
export async function assertEntitlement(
  params: EntitlementCheckParams,
): Promise<void> {
  const result = await activeEvaluator.check(params);

  if (!result.allowed) {
    throw new EntitlementMissingError(
      result.reason ??
        `Feature "${params.featureKey}" requires an active subscription entitlement.`,
    );
  }
}
