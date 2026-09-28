import { ForbiddenError } from "../../../common/errors/index.js";
import type { AgencyMembership, AgencyMembershipRole } from "../types.js";

/**
 * Validates that an agency membership is active and possesses the required role.
 */
export function assertActiveAgencyMembership(
  membership: AgencyMembership | null | undefined,
  requiredRoles?: AgencyMembershipRole[],
): asserts membership is AgencyMembership {
  if (!membership) {
    throw new ForbiddenError("You do not belong to the requested agency.");
  }

  if (membership.status !== "ACTIVE") {
    throw new ForbiddenError(
      `Your agency membership is not active (current status: ${membership.status}).`,
    );
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenError(
        `This action requires one of the following agency roles: ${requiredRoles.join(", ")}.`,
      );
    }
  }
}

/**
 * Validates that a resource belonging to an agency matches the user's active agency.
 */
export function assertAgencyResourceScope(
  userMembership: AgencyMembership | null | undefined,
  resourceAgencyId: string,
): void {
  assertActiveAgencyMembership(userMembership);

  if (userMembership.agencyId !== resourceAgencyId) {
    throw new ForbiddenError(
      "Access denied. The requested resource does not belong to your agency.",
    );
  }
}

/**
 * Validates that the user has an active membership in the target agency,
 * optionally verifying that the user is an agency admin.
 */
export function assertAgencyMembership(
  membership: AgencyMembership | null | undefined,
  targetAgencyId: string,
  requireAdmin = false,
): asserts membership is AgencyMembership {
  assertActiveAgencyMembership(
    membership,
    requireAdmin ? ["ADMIN"] : undefined,
  );
  assertAgencyResourceScope(membership, targetAgencyId);
}
