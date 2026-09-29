import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasPermission,
  assertPermission,
  getRolePermissions,
  PERMISSIONS,
} from "../authorization/roles-and-permissions.js";

describe("Roles and Action-Oriented Permissions", () => {
  it("USER role has basic consumer permissions and no administrative access", () => {
    const permissions = getRolePermissions("USER");

    assert.ok(permissions.includes(PERMISSIONS.PROFILE_VIEW_OWN));
    assert.ok(permissions.includes(PERMISSIONS.PROFILE_EDIT_OWN));
    assert.ok(permissions.includes(PERMISSIONS.PROFILE_DELETE_OWN));
    assert.ok(permissions.includes(PERMISSIONS.LEADS_CREATE));

    // Must NOT have broker or admin permissions
    assert.equal(hasPermission("USER", PERMISSIONS.LISTINGS_CREATE), false);
    assert.equal(hasPermission("USER", PERMISSIONS.ADMIN_USERS_MANAGE), false);
    assert.equal(hasPermission("USER", PERMISSIONS.AUDIT_LOG_VIEW), false);
  });

  it("INDEPENDENT_BROKER role has broker listing and lead capabilities", () => {
    assert.equal(
      hasPermission("INDEPENDENT_BROKER", PERMISSIONS.LISTINGS_CREATE),
      true,
    );
    assert.equal(
      hasPermission("INDEPENDENT_BROKER", PERMISSIONS.LEADS_VIEW_OWN),
      true,
    );

    assert.equal(
      hasPermission(
        "INDEPENDENT_BROKER",
        PERMISSIONS.BROKER_VERIFICATION_SUBMIT,
      ),
      true,
    );

    // Cannot perform super admin actions
    assert.equal(
      hasPermission(
        "INDEPENDENT_BROKER",
        PERMISSIONS.BROKER_VERIFICATION_REVIEW,
      ),
      false,
    );
    assert.equal(
      hasPermission("INDEPENDENT_BROKER", PERMISSIONS.ADMIN_SYSTEM_CONFIG),
      false,
    );
  });

  it("AGENCY_ADMIN role has agency member and lead assignment permissions", () => {
    assert.equal(
      hasPermission("AGENCY_ADMIN", PERMISSIONS.AGENCY_MEMBERS_MANAGE),
      true,
    );
    assert.equal(
      hasPermission("AGENCY_ADMIN", PERMISSIONS.AGENCY_LEADS_ASSIGN),
      true,
    );
    assert.equal(
      hasPermission("AGENCY_ADMIN", PERMISSIONS.ADMIN_SYSTEM_CONFIG),
      false,
    );
  });

  it("AGENCY_BROKER role has agency lead view and listing creation permissions", () => {
    assert.equal(
      hasPermission("AGENCY_BROKER", PERMISSIONS.LISTINGS_CREATE),
      true,
    );
    assert.equal(
      hasPermission("AGENCY_BROKER", PERMISSIONS.LEADS_ASSIGN_AGENCY),
      false,
    );
    assert.equal(
      hasPermission("AGENCY_BROKER", PERMISSIONS.ADMIN_SYSTEM_CONFIG),
      false,
    );
  });

  it("SUPER_ADMIN role has full platform authorization", () => {
    assert.equal(
      hasPermission("SUPER_ADMIN", PERMISSIONS.ADMIN_SYSTEM_CONFIG),
      true,
    );
    assert.equal(
      hasPermission("SUPER_ADMIN", PERMISSIONS.AUDIT_LOG_VIEW),
      true,
    );
    assert.equal(
      hasPermission("SUPER_ADMIN", PERMISSIONS.SETTLEMENT_EXECUTE),
      true,
    );
  });

  it("assertPermission throws ForbiddenError when permission is lacking", () => {
    assert.throws(
      () => assertPermission("USER", PERMISSIONS.ADMIN_SYSTEM_CONFIG),
      { name: "ForbiddenError" },
    );
  });

  it("assertPermission succeeds without throwing when permission is granted", () => {
    assert.doesNotThrow(() =>
      assertPermission("SUPER_ADMIN", PERMISSIONS.ADMIN_SYSTEM_CONFIG),
    );
  });
});
