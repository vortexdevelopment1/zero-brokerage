import { Deal, DealFilters, DealLifecycleStage, AgreementReviewStatus } from "@/types/deal";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { MOCK_DEALS } from "./mock/deals.mock";
import { paginate } from "./mock/paginate";

class DealService {
  private deals: Deal[] = [...MOCK_DEALS];

  async getDeals(
    filters: DealFilters = {},
    params: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResult<Deal>> {
    let result = [...this.deals];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.buyer.name.toLowerCase().includes(q) ||
          d.broker.name.toLowerCase().includes(q) ||
          (d.agency?.name.toLowerCase().includes(q) ?? false) ||
          d.property.title.toLowerCase().includes(q) ||
          d.property.city.toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((d) => d.status === filters.status);
    }

    if (filters.agreementStatus && filters.agreementStatus !== "all") {
      result = result.filter((d) => d.agreementStatus === filters.agreementStatus);
    }

    if (filters.broker && filters.broker !== "all") {
      result = result.filter((d) => d.broker.id === filters.broker || d.broker.name === filters.broker);
    }

    if (filters.property && filters.property !== "all") {
      result = result.filter((d) => d.property.id === filters.property || d.property.city === filters.property);
    }

    return paginate(result, params);
  }

  async getDeal(id: string): Promise<Deal | null> {
    return this.deals.find((d) => d.id === id) ?? null;
  }

  async getAgreementsForReview(
    filters: { search?: string; reviewStatus?: string } = {},
    params: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResult<Deal>> {
    // Return deals that have agreement uploads or are in agreement review status
    let result = this.deals.filter(
      (d) =>
        d.userAgreement !== undefined ||
        d.brokerAgreement !== undefined ||
        d.agreementStatus !== "pending" ||
        d.reviewStatus !== ("not_required" as any)
    );

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.buyer.name.toLowerCase().includes(q) ||
          d.broker.name.toLowerCase().includes(q) ||
          d.property.title.toLowerCase().includes(q)
      );
    }

    if (filters.reviewStatus && filters.reviewStatus !== "all") {
      result = result.filter((d) => d.reviewStatus === filters.reviewStatus);
    }

    return paginate(result, params);
  }

  async approveAgreements(dealId: string, notes?: string): Promise<Deal> {
    const idx = this.deals.findIndex((d) => d.id === dealId);
    if (idx === -1) throw new Error("Deal not found");

    const deal = this.deals[idx];
    const updatedUserAgreement = deal.userAgreement
      ? { ...deal.userAgreement, status: "approved" as const, notes }
      : undefined;
    const updatedBrokerAgreement = deal.brokerAgreement
      ? { ...deal.brokerAgreement, status: "approved" as const, notes }
      : undefined;

    const updated: Deal = {
      ...deal,
      stage: "AGREEMENT_COMPLETED",
      status: "agreement_completed",
      agreementStatus: "completed",
      reviewStatus: "approved",
      userAgreement: updatedUserAgreement,
      brokerAgreement: updatedBrokerAgreement,
      mismatchReason: undefined,
      updatedAt: new Date().toISOString(),
      auditTimeline: [
        ...deal.auditTimeline,
        {
          id: `AUD-APP-${Date.now()}`,
          stage: "AGREEMENT_COMPLETED",
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          role: "Super Admin",
          description: `Administrative agreement review approved. ${notes ? `Notes: ${notes}` : ""}`,
          status: "completed",
        },
      ],
    };

    this.deals[idx] = updated;
    return updated;
  }

  async requestAgreementChanges(dealId: string, reason: string): Promise<Deal> {
    const idx = this.deals.findIndex((d) => d.id === dealId);
    if (idx === -1) throw new Error("Deal not found");

    const deal = this.deals[idx];
    const updated: Deal = {
      ...deal,
      agreementStatus: "mismatch_flagged",
      reviewStatus: "changes_requested",
      mismatchReason: reason,
      updatedAt: new Date().toISOString(),
      auditTimeline: [
        ...deal.auditTimeline,
        {
          id: `AUD-REQ-${Date.now()}`,
          stage: "AGREEMENT_PENDING",
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          role: "Super Admin",
          description: `Discrepancy flagged / Changes requested: ${reason}`,
          status: "alert",
        },
      ],
    };

    this.deals[idx] = updated;
    return updated;
  }

  async rejectAgreements(dealId: string, reason: string): Promise<Deal> {
    const idx = this.deals.findIndex((d) => d.id === dealId);
    if (idx === -1) throw new Error("Deal not found");

    const deal = this.deals[idx];
    const updated: Deal = {
      ...deal,
      reviewStatus: "rejected",
      mismatchReason: reason,
      updatedAt: new Date().toISOString(),
      auditTimeline: [
        ...deal.auditTimeline,
        {
          id: `AUD-REJ-${Date.now()}`,
          stage: deal.stage,
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          role: "Super Admin",
          description: `Agreements rejected by Super Admin: ${reason}`,
          status: "alert",
        },
      ],
    };

    this.deals[idx] = updated;
    return updated;
  }

  async markDealDone(dealId: string): Promise<Deal> {
    const idx = this.deals.findIndex((d) => d.id === dealId);
    if (idx === -1) throw new Error("Deal not found");

    const deal = this.deals[idx];
    const updated: Deal = {
      ...deal,
      stage: "DEAL_DONE",
      status: "deal_done",
      reviewStatus: "completed",
      updatedAt: new Date().toISOString(),
      auditTimeline: [
        ...deal.auditTimeline,
        {
          id: `AUD-DONE-${Date.now()}`,
          stage: "DEAL_DONE",
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          role: "Super Admin",
          description: "Deal marked Closed. Listing visibility deactivated from search per SOW.",
          status: "completed",
        },
      ],
    };

    this.deals[idx] = updated;
    return updated;
  }

  async cancelDeal(dealId: string, reason: string, feeAmount: number): Promise<Deal> {
    const idx = this.deals.findIndex((d) => d.id === dealId);
    if (idx === -1) throw new Error("Deal not found");

    const deal = this.deals[idx];
    const updated: Deal = {
      ...deal,
      stage: "DEAL_CANCELLED",
      status: "cancelled",
      updatedAt: new Date().toISOString(),
      auditTimeline: [
        ...deal.auditTimeline,
        {
          id: `AUD-CN-${Date.now()}`,
          stage: "DEAL_CANCELLED",
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          role: "Super Admin",
          description: `Deal cancelled. Reason: ${reason}. Cancellation fee calculated: ₹${feeAmount.toLocaleString("en-IN")}.`,
          status: "completed",
        },
      ],
    };

    this.deals[idx] = updated;
    return updated;
  }
}

export const dealService = new DealService();
