import {
  CancellationRecord,
  CancellationFilters,
  CancellationStatus,
} from "@/types/cancellation";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { MOCK_CANCELLATIONS } from "./mock/cancellations.mock";
import { paginate } from "./mock/paginate";

class CancellationService {
  private cancellations: CancellationRecord[] = [...MOCK_CANCELLATIONS];

  async getCancellations(
    filters: CancellationFilters = {},
    params: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResult<CancellationRecord>> {
    let result = [...this.cancellations];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.dealId.toLowerCase().includes(q) ||
          c.buyer.name.toLowerCase().includes(q) ||
          c.broker.name.toLowerCase().includes(q) ||
          c.property.title.toLowerCase().includes(q) ||
          c.property.city.toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((c) => c.status === filters.status);
    }

    if (filters.initiatedBy && filters.initiatedBy !== "all") {
      result = result.filter((c) => c.initiatedBy === filters.initiatedBy);
    }

    if (filters.paymentMode && filters.paymentMode !== "all") {
      result = result.filter((c) => c.paymentMode === filters.paymentMode);
    }

    return paginate(result, params);
  }

  async getCancellation(id: string): Promise<CancellationRecord | null> {
    return this.cancellations.find((c) => c.id === id) ?? null;
  }

  async approveCancellation(id: string, notes?: string): Promise<CancellationRecord> {
    const idx = this.cancellations.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Cancellation record not found");

    const record = this.cancellations[idx];
    const isPlatformCollected = record.paymentMode === "platform_collected";

    const updated: CancellationRecord = {
      ...record,
      status: "cancelled",
      refundPaymentStatus: isPlatformCollected ? "auto_deducted" : "invoice_pending",
      auditTrail: [
        ...record.auditTrail,
        {
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          action: "Cancellation Approved & Executed",
          notes: notes ?? (isPlatformCollected
            ? `Fee auto-deducted from held deposit. Balance refund scheduled.`
            : `Payable invoice issued to user for ₹${record.cancellationFeeAmount.toLocaleString("en-IN")}.`),
        },
      ],
    };

    this.cancellations[idx] = updated;
    return updated;
  }

  async rejectCancellation(id: string, reason: string): Promise<CancellationRecord> {
    const idx = this.cancellations.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Cancellation record not found");

    const record = this.cancellations[idx];
    const updated: CancellationRecord = {
      ...record,
      status: "rejected",
      auditTrail: [
        ...record.auditTrail,
        {
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          action: "Cancellation Request Rejected",
          notes: `Rejection reason: ${reason}. Deal workflow remains active.`,
        },
      ],
    };

    this.cancellations[idx] = updated;
    return updated;
  }

  async markFeePaid(id: string): Promise<CancellationRecord> {
    const idx = this.cancellations.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Cancellation record not found");

    const record = this.cancellations[idx];
    const updated: CancellationRecord = {
      ...record,
      refundPaymentStatus: "invoice_paid",
      status: "cancelled",
      auditTrail: [
        ...record.auditTrail,
        {
          timestamp: new Date().toISOString(),
          actor: "Super Admin",
          action: "Cancellation Fee Payment Confirmed",
          notes: `External invoice settlement received in full.`,
        },
      ],
    };

    this.cancellations[idx] = updated;
    return updated;
  }
}

export const cancellationService = new CancellationService();
