import { ForbiddenError } from "../../../common/errors/index.js";

/**
 * Reusable ownership assertion primitives.
 */
export function assertResourceOwnership(
  authenticatedUserId: string,
  resourceOwnerId: string,
  resourceType = "resource",
  userRole?: string,
): void {
  if (userRole === "SUPER_ADMIN") {
    return;
  }
  if (authenticatedUserId !== resourceOwnerId) {
    throw new ForbiddenError(
      `Access denied. You do not have ownership of this ${resourceType}.`,
    );
  }
}

export const assertResourceOwner = assertResourceOwnership;

/**
 * Evaluates whether an authenticated user is the owner of a resource.
 */
export function isResourceOwner(
  authenticatedUserId: string,
  resourceOwnerId: string,
): boolean {
  return authenticatedUserId === resourceOwnerId;
}
