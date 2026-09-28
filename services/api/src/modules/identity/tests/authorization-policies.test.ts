import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertAgencyMembership } from "../authorization/agency-policy.js";
import { assertBrokerVerified } from "../authorization/broker-policy.js";
import { assertResourceOwner } from "../authorization/ownership-policy.js";
import {
  evaluateEntitlement,
  assertEntitlement,
} from "../authorization/entitlements.js";
import type { AgencyMembership, BrokerVerification } from "../types.js";

describe("Layered Authorization Policies", () => {
  describe("Agency Membership Policy", () => {
    const activeAdminMembership: AgencyMembership = {
      id: "mem-1",
      agencyId: "agency-100",
      userId: "user-1",
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const activeAgentMembership: AgencyMembership = {
      id: "mem-2",
      agencyId: "agency-100",
      userId: "user-2",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const suspendedMembership: AgencyMembership = {
      id: "mem-3",
      agencyId: "agency-100",
      userId: "user-3",
      role: "MEMBER",
      status: "SUSPENDED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("allows active member access to agency resources", () => {
      assert.doesNotThrow(() =>
        assertAgencyMembership(activeAgentMembership, "agency-100"),
      );
    });

    it("rejects access when membership is suspended", () => {
      assert.throws(
        () => assertAgencyMembership(suspendedMembership, "agency-100"),
        { name: "ForbiddenError" },
      );
    });

    it("rejects cross-agency resource access", () => {
      assert.throws(
        () => assertAgencyMembership(activeAdminMembership, "agency-999"),
        { name: "ForbiddenError" },
      );
    });

    it("enforces admin-only requirement when required", () => {
      assert.throws(
        () =>
          assertAgencyMembership(
            activeAgentMembership,
            "agency-100",
            true, // requireAdmin
          ),
        { name: "ForbiddenError" },
      );

      assert.doesNotThrow(() =>
        assertAgencyMembership(activeAdminMembership, "agency-100", true),
      );
    });
  });

  describe("Broker Verification Access Policy", () => {
    const approvedVerification: BrokerVerification = {
      id: "ver-1",
      userId: "broker-1",
      status: "APPROVED",
      licenseNumber: "RERA-MH-12345",
      documentUrls: ["https://docs.example.com/rera.pdf"],
      rejectionReason: null,
      reviewedBy: "admin-1",
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pendingVerification: BrokerVerification = {
      ...approvedVerification,
      status: "PENDING",
    };

    const rejectedVerification: BrokerVerification = {
      ...approvedVerification,
      status: "REJECTED",
    };

    it("permits operations when broker verification is approved", () => {
      assert.doesNotThrow(() => assertBrokerVerified(approvedVerification));
    });

    it("throws VerificationRequiredError when verification is null or unsubmitted", () => {
      assert.throws(() => assertBrokerVerified(null), {
        name: "VerificationRequiredError",
      });
    });

    it("throws VerificationRequiredError when verification is still pending", () => {
      assert.throws(() => assertBrokerVerified(pendingVerification), {
        name: "VerificationRequiredError",
      });
    });

    it("throws ForbiddenError when verification was rejected", () => {
      assert.throws(() => assertBrokerVerified(rejectedVerification), {
        name: "ForbiddenError",
      });
    });
  });

  describe("Resource Ownership Policy", () => {
    it("allows access when current user is the owner", () => {
      assert.doesNotThrow(() =>
        assertResourceOwner("user-1", "user-1", "listing"),
      );
    });

    it("rejects access when user is not the owner and not super admin", () => {
      assert.throws(() => assertResourceOwner("user-1", "user-2", "listing"), {
        name: "ForbiddenError",
      });
    });

    it("allows override when user is platform SUPER_ADMIN", () => {
      assert.doesNotThrow(() =>
        assertResourceOwner("admin-user", "user-2", "listing", "SUPER_ADMIN"),
      );
    });
  });

  describe("Entitlement Policy", () => {
    it("evaluates active entitlement with usage headroom as allowed", async () => {
      const result = await evaluateEntitlement({
        userId: "broker-1",
        featureKey: "featured_listings",
        currentUsage: 2,
      });

      assert.equal(result.isAllowed, true);
      assert.equal(result.planTier, "PRO_BROKER");
      assert.equal(result.remainingQuota, 8);
    });

    it("rejects entitlement when quota limit is reached", async () => {
      const result = await evaluateEntitlement({
        userId: "broker-1",
        featureKey: "featured_listings",
        currentUsage: 10,
      });

      assert.equal(result.isAllowed, false);
      assert.equal(result.reason, "USAGE_LIMIT_EXCEEDED");
    });

    it("throws EntitlementMissingError when quota is exhausted and assertEntitlement is used", async () => {
      await assert.rejects(
        async () => {
          await assertEntitlement({
            userId: "broker-1",
            featureKey: "featured_listings",
            currentUsage: 15,
          });
        },
        { name: "EntitlementMissingError" },
      );
    });
  });
});
