"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { agencyService } from "@/services/agencyService";
import { AgencyDetail } from "@/types/agency";
import { useToastStore } from "@/store/toastStore";
import { ApiStatus } from "@/types/common";

import { AgencyHeader } from "@/components/agencies/AgencyHeader";
import { AgencyTabs, AgencyTabKey } from "@/components/agencies/AgencyTabs";
import { AgencyRejectModal } from "@/components/agencies/AgencyRejectModal";
import { KycApprovalModal } from "@/components/kyc/KycApprovalModal";

import { AgencyOverviewTab } from "@/components/agencies/tabs/AgencyOverviewTab";
import { AgencyVerificationTab } from "@/components/agencies/tabs/AgencyVerificationTab";
import { AgencyBrokersTab } from "@/components/agencies/tabs/AgencyBrokersTab";
import { AgencyInventoryTab } from "@/components/agencies/tabs/AgencyInventoryTab";
import { AgencySubscriptionTab } from "@/components/agencies/tabs/AgencySubscriptionTab";
import { AgencyAdvertisingTab } from "@/components/agencies/tabs/AgencyAdvertisingTab";
import { AgencyPerformanceTab } from "@/components/agencies/tabs/AgencyPerformanceTab";
import { AgencyActivityTab } from "@/components/agencies/tabs/AgencyActivityTab";

export default function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<ApiStatus>("loading");
  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [activeTab, setActiveTab] = useState<AgencyTabKey>("overview");

  // Action Dialog States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState(false);
  const [isActivateConfirmOpen, setIsActivateConfirmOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await agencyService.getAgency(id);
      setAgency(res);
      setStatus(res ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Action Handlers
  async function handleApprove() {
    if (!agency) return;
    setSubmittingAction(true);
    try {
      await agencyService.approveAgency(agency.id);
      push(`${agency.name} has been approved and compliance verified.`, "success");
      setIsApproveModalOpen(false);
      await load();
    } catch {
      push("Failed to approve agency. Please try again.", "error");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleReject(reason: string, comments?: string) {
    if (!agency) return;
    setSubmittingAction(true);
    try {
      await agencyService.rejectAgency(agency.id, reason, comments);
      push(`${agency.name} verification was rejected (${reason}).`, "info");
      setIsRejectModalOpen(false);
      await load();
    } catch {
      push("Failed to reject agency. Please try again.", "error");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleSuspend() {
    if (!agency) return;
    setSubmittingAction(true);
    try {
      await agencyService.updateAgencyStatus(agency.id, "suspended", "Administrative suspension by Super Admin");
      push(`${agency.name} has been suspended.`, "info");
      setIsSuspendConfirmOpen(false);
      await load();
    } catch {
      push("Failed to suspend agency.", "error");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleActivate() {
    if (!agency) return;
    setSubmittingAction(true);
    try {
      await agencyService.updateAgencyStatus(agency.id, "active", "Re-activated by Super Admin");
      push(`${agency.name} is now active.`, "success");
      setIsActivateConfirmOpen(false);
      await load();
    } catch {
      push("Failed to activate agency.", "error");
    } finally {
      setSubmittingAction(false);
    }
  }

  if (status === "loading") {
    return <LoadingState label="Loading agency profile and compliance data…" />;
  }

  if (status === "error") {
    return <ErrorState onRetry={load} />;
  }

  if (!agency) {
    return (
      <EmptyState
        title="Agency not found"
        description={`No agency profile found matching identifier '${id}'.`}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={agency.name}
        crumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Agencies", href: "/admin/agencies" },
          { label: agency.name },
        ]}
      />

      {/* Agency Identity & Operational Control Banner */}
      <AgencyHeader
        agency={agency}
        onApprove={() => setIsApproveModalOpen(true)}
        onReject={() => setIsRejectModalOpen(true)}
        onSuspend={() => setIsSuspendConfirmOpen(true)}
        onActivate={() => setIsActivateConfirmOpen(true)}
        isSubmitting={submittingAction}
      />

      {/* 8-Section Navigation Tabs */}
      <AgencyTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        agency={agency}
      />

      {/* Tab Content Panels */}
      <div>
        {activeTab === "overview" && (
          <AgencyOverviewTab
            agency={agency}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "verification" && (
          <AgencyVerificationTab
            agency={agency}
            onApprove={handleApprove}
            onReject={handleReject}
            isSubmitting={submittingAction}
          />
        )}

        {activeTab === "brokers" && <AgencyBrokersTab agency={agency} />}

        {activeTab === "inventory" && <AgencyInventoryTab agency={agency} />}

        {activeTab === "subscription" && <AgencySubscriptionTab agency={agency} />}

        {activeTab === "advertising" && <AgencyAdvertisingTab agency={agency} />}

        {activeTab === "performance" && <AgencyPerformanceTab agency={agency} />}

        {activeTab === "activity" && <AgencyActivityTab agency={agency} />}
      </div>

      {/* Modals for Header Actions */}
      <KycApprovalModal
        open={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApprove}
        entityName={agency.name}
        isSubmitting={submittingAction}
      />

      <AgencyRejectModal
        open={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleReject}
        agencyName={agency.name}
        isSubmitting={submittingAction}
      />

      <ConfirmationDialog
        open={isSuspendConfirmOpen}
        onClose={() => setIsSuspendConfirmOpen(false)}
        onConfirm={handleSuspend}
        isSubmitting={submittingAction}
        tone="danger"
        title="Suspend Agency Operations"
        description={`Are you sure you want to suspend ${agency.name}? This will hide all their active listings and restrict broker logins until re-activated.`}
      />

      <ConfirmationDialog
        open={isActivateConfirmOpen}
        onClose={() => setIsActivateConfirmOpen(false)}
        onConfirm={handleActivate}
        isSubmitting={submittingAction}
        tone="brand"
        title="Re-activate Agency"
        description={`Are you sure you want to re-activate ${agency.name}? This will restore listing visibility and allow brokers to operate normally.`}
      />
    </>
  );
}
