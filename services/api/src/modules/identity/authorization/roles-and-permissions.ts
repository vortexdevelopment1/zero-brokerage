import type { PlatformRole } from "../types.js";

export type Permission =
  // Profile
  | "profile:view_own"
  | "profile:edit_own"
  | "profile:delete_own"

  // Listings
  | "listing:create"
  | "listing:edit_own"
  | "listing:delete_own"
  | "listing:moderate"
  | "listing:publish"
  | "listing:view_all"

  // Leads
  | "lead:create"
  | "lead:view_own"
  | "lead:manage_own"
  | "lead:assign_agency"
  | "lead:view_agency"

  // Visits
  | "visit:request"
  | "visit:view_own"
  | "visit:manage_own"
  | "visit:complete"

  // Agency
  | "agency:create"
  | "agency:manage_profile"
  | "agency:manage_members"
  | "agency:assign_roles"
  | "agency:view_analytics"

  // Broker Verification
  | "broker:verify_submit"
  | "broker:verify_review"
  | "broker:suspend"

  // Subscriptions & Payments
  | "subscription:view_plans"
  | "subscription:subscribe"
  | "subscription:manage_plans"
  | "financial:manage_settlement"

  // Platform Administration
  | "admin:access_panel"
  | "admin:manage_users"
  | "admin:view_audit_logs"
  | "admin:manage_settings"
  | "admin:system_operations"

  // Reviews
  | "review:create_verified"
  | "review:moderate";

/**
 * Authoritative role-to-permission mapping matrix.
 */
const ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  USER: [
    "profile:view_own",
    "profile:edit_own",
    "profile:delete_own",
    "visit:request",
    "visit:view_own",
    "lead:create",
    "lead:view_own",
    "subscription:view_plans",
    "subscription:subscribe",
    "review:create_verified",
  ],

  INDEPENDENT_BROKER: [
    "profile:view_own",
    "profile:edit_own",
    "profile:delete_own",
    "listing:create",
    "listing:edit_own",
    "listing:delete_own",
    "lead:view_own",
    "lead:manage_own",
    "visit:view_own",
    "visit:manage_own",
    "visit:complete",
    "broker:verify_submit",
    "subscription:view_plans",
    "subscription:subscribe",
    "review:create_verified",
  ],

  AGENCY_BROKER: [
    "profile:view_own",
    "profile:edit_own",
    "profile:delete_own",
    "listing:create",
    "listing:edit_own",
    "listing:delete_own",
    "lead:view_own",
    "lead:manage_own",
    "lead:view_agency",
    "visit:view_own",
    "visit:manage_own",
    "visit:complete",
    "broker:verify_submit",
    "subscription:view_plans",
    "review:create_verified",
  ],

  AGENCY_ADMIN: [
    "profile:view_own",
    "profile:edit_own",
    "profile:delete_own",
    "agency:manage_profile",
    "agency:manage_members",
    "agency:assign_roles",
    "agency:view_analytics",
    "listing:create",
    "listing:edit_own",
    "listing:delete_own",
    "lead:view_own",
    "lead:manage_own",
    "lead:assign_agency",
    "lead:view_agency",
    "visit:view_own",
    "visit:manage_own",
    "visit:complete",
    "broker:verify_submit",
    "subscription:view_plans",
    "subscription:subscribe",
  ],

  SUPER_ADMIN: [
    "profile:view_own",
    "profile:edit_own",
    "listing:moderate",
    "listing:publish",
    "listing:view_all",
    "broker:verify_review",
    "broker:suspend",
    "agency:create",
    "agency:manage_profile",
    "agency:manage_members",
    "agency:assign_roles",
    "agency:view_analytics",
    "subscription:view_plans",
    "subscription:manage_plans",
    "financial:manage_settlement",
    "admin:access_panel",
    "admin:manage_users",
    "admin:view_audit_logs",
    "admin:manage_settings",
    "admin:system_operations",
    "review:moderate",
  ],
};

/**
 * Returns the complete list of permissions granted to a platform role.
 */
export function getRolePermissions(role: PlatformRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Evaluates whether a role possesses a specific permission.
 */
export function hasPermission(
  role: PlatformRole,
  permission: Permission,
): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

export const PERMISSIONS = {
  PROFILE_VIEW_OWN: "profile:view_own" as Permission,
  PROFILE_EDIT_OWN: "profile:edit_own" as Permission,
  PROFILE_DELETE_OWN: "profile:delete_own" as Permission,
  LISTINGS_CREATE: "listing:create" as Permission,
  LISTINGS_EDIT_OWN: "listing:edit_own" as Permission,
  LISTINGS_DELETE_OWN: "listing:delete_own" as Permission,
  LISTINGS_MODERATE: "listing:moderate" as Permission,
  LISTINGS_PUBLISH: "listing:publish" as Permission,
  LISTINGS_VIEW_ALL: "listing:view_all" as Permission,
  LEADS_CREATE: "lead:create" as Permission,
  LEADS_VIEW_OWN: "lead:view_own" as Permission,
  LEADS_ASSIGN_AGENCY: "lead:assign_agency" as Permission,
  AGENCY_MEMBERS_MANAGE: "agency:manage_members" as Permission,
  AGENCY_LEADS_ASSIGN: "lead:assign_agency" as Permission,
  BROKER_VERIFICATION_SUBMIT: "broker:verify_submit" as Permission,
  BROKER_VERIFICATION_REVIEW: "broker:verify_review" as Permission,
  ADMIN_SYSTEM_CONFIG: "admin:manage_settings" as Permission,
  ADMIN_USERS_MANAGE: "admin:manage_users" as Permission,
  AUDIT_LOG_VIEW: "admin:view_audit_logs" as Permission,
  SETTLEMENT_EXECUTE: "financial:manage_settlement" as Permission,
} as const;

import { ForbiddenError } from "../../../common/errors/index.js";

/**
 * Asserts that a role possesses a specific permission. Throws ForbiddenError if not.
 */
export function assertPermission(
  role: PlatformRole,
  permission: Permission,
): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(
      `Permission denied. Required permission: ${permission}.`,
    );
  }
}

/**
 * Evaluates whether a role possesses all specified permissions.
 */
export function hasAllPermissions(
  role: PlatformRole,
  permissions: readonly Permission[],
): boolean {
  const granted = getRolePermissions(role);
  return permissions.every((perm) => granted.includes(perm));
}
