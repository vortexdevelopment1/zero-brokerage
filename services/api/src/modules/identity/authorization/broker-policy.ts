import {
  VerificationRequiredError,
  ForbiddenError,
} from "../../../common/errors/index.js";
import type { BrokerVerification, BrokerVerificationStatus } from "../types.js";

/**
 * Validates that a broker's verification status meets the operational requirement.
 */
export function assertBrokerVerificationState(
  verification: BrokerVerification | null | undefined,
  allowedStatuses: BrokerVerificationStatus[] = ["APPROVED"],
): void {
  if (!verification || verification.status === "UNSUBMITTED") {
    throw new VerificationRequiredError(
      "Broker verification documents have not been submitted.",
    );
  }

  if (verification.status === "PENDING") {
    throw new VerificationRequiredError(
      "Your broker verification is currently under administrative review.",
    );
  }

  if (verification.status === "REJECTED") {
    throw new ForbiddenError(
      `Broker verification was rejected. Reason: ${verification.rejectionReason ?? "Documentation did not meet criteria"}.`,
    );
  }

  if (verification.status === "SUSPENDED") {
    throw new ForbiddenError(
      "Broker privileges have been temporarily suspended.",
    );
  }

  if (verification.status === "REVERIFICATION_REQUIRED") {
    throw new VerificationRequiredError(
      "Re-verification of broker credentials is required to perform this action.",
    );
  }

  if (!allowedStatuses.includes(verification.status)) {
    throw new ForbiddenError(
      `Broker status "${verification.status}" is not authorized for this operation.`,
    );
  }
}

export const assertBrokerVerified = assertBrokerVerificationState;
