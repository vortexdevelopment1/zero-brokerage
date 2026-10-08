import type { Pool } from "pg";
import { NotFoundError } from "../../../common/errors/index.js";
import { OperationsRepository } from "../repositories/operations-repository.js";
import type { Deal, Visit, Cancellation, UrgentRequirement } from "../types.js";
import type { PaginatedResponse } from "../../../common/pagination/index.js";

export class OperationsService {
  private readonly opsRepo: OperationsRepository;

  constructor(private readonly pool: Pool) {
    this.opsRepo = new OperationsRepository(pool);
  }

  // --- Deals ---
  async listDeals(params: {
    limit?: number;
    cursor?: string;
    status?: string;
    agreementStatus?: string;
    search?: string;
  }): Promise<PaginatedResponse<Deal>> {
    return this.opsRepo.listDeals(params);
  }

  async getDealById(id: string): Promise<Deal> {
    const deal = await this.opsRepo.findDealById(id);
    if (!deal) {
      throw new NotFoundError(`Deal with id "${id}" was not found.`);
    }
    return deal;
  }

  async approveAgreements(dealId: string, notes?: string): Promise<Deal> {
    const deal = await this.getDealById(dealId);
    const updated = await this.opsRepo.updateDealAgreement(deal.id, "APPROVED", notes);
    if (!updated) {
      throw new NotFoundError(`Deal with id "${dealId}" was not found.`);
    }
    return updated;
  }

  async rejectAgreements(dealId: string, notes?: string): Promise<Deal> {
    const deal = await this.getDealById(dealId);
    const updated = await this.opsRepo.updateDealAgreement(deal.id, "REJECTED", notes);
    if (!updated) {
      throw new NotFoundError(`Deal with id "${dealId}" was not found.`);
    }
    return updated;
  }

  async updateDealStatus(dealId: string, status: string, notes?: string): Promise<Deal> {
    const deal = await this.getDealById(dealId);
    const updated = await this.opsRepo.updateDealStatus(deal.id, status, notes);
    if (!updated) {
      throw new NotFoundError(`Deal with id "${dealId}" was not found.`);
    }
    return updated;
  }

  // --- Cancellations ---
  async listCancellations(params: {
    limit?: number;
    cursor?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Cancellation>> {
    return this.opsRepo.listCancellations(params);
  }

  async approveCancellation(id: string, notes?: string): Promise<any> {
    const updated = await this.opsRepo.updateCancellationStatus(id, "APPROVED", notes);
    if (!updated) {
      throw new NotFoundError(`Cancellation with id "${id}" was not found.`);
    }
    return updated;
  }

  async rejectCancellation(id: string, notes?: string): Promise<any> {
    const updated = await this.opsRepo.updateCancellationStatus(id, "REJECTED", notes);
    if (!updated) {
      throw new NotFoundError(`Cancellation with id "${id}" was not found.`);
    }
    return updated;
  }

  // --- Visits ---
  async listVisits(params: {
    limit?: number;
    cursor?: string;
    status?: string;
  }): Promise<PaginatedResponse<Visit>> {
    return this.opsRepo.listVisits(params);
  }

  async updateVisitStatus(id: string, status: string): Promise<any> {
    const updated = await this.opsRepo.updateVisitStatus(id, status);
    if (!updated) {
      throw new NotFoundError(`Visit with id "${id}" was not found.`);
    }
    return updated;
  }

  // --- Urgent Requirements ---
  async listUrgentRequirements(params: {
    limit?: number;
    cursor?: string;
    status?: string;
  }): Promise<PaginatedResponse<UrgentRequirement>> {
    return this.opsRepo.listUrgentRequirements(params);
  }

  async updateUrgentRequirementStatus(id: string, status: string): Promise<any> {
    const updated = await this.opsRepo.updateUrgentRequirementStatus(id, status);
    if (!updated) {
      throw new NotFoundError(`Requirement with id "${id}" was not found.`);
    }
    return updated;
  }

  // --- Revenue Overviews & Monetization Streams ---
  async getRevenueOverview() {
    return {
      totalRevenue: 2450000,
      subscriptionRevenue: 980000,
      commissionRevenue: 1120000,
      microTransactionRevenue: 150000,
      adRevenue: 200000,
      cancellationRevenue: 0,
      growthRate: 14.8,
      currency: "INR",
      trend: [
        { month: "Jan", revenue: 210000 },
        { month: "Feb", revenue: 290000 },
        { month: "Mar", revenue: 380000 },
        { month: "Apr", revenue: 450000 },
        { month: "May", revenue: 520000 },
        { month: "Jun", revenue: 600000 },
      ],
    };
  }

  async getRevenueSubscriptions() {
    return [
      {
        id: "SUB-001",
        audience: "agency",
        plan: "Enterprise",
        subscriber: "Apex Realty",
        revenue: 49999,
        status: "active",
        purchaseDate: new Date().toISOString(),
        paymentStatus: "success",
      },
      {
        id: "SUB-002",
        audience: "user",
        plan: "Premium Buyer",
        subscriber: "Rahul Verma",
        revenue: 1999,
        status: "active",
        purchaseDate: new Date().toISOString(),
        paymentStatus: "success",
      },
    ];
  }

  async getRevenueCommissions() {
    return [
      {
        id: "COM-001",
        dealId: "DL-84210",
        property: "Emerald Towers 4BHK",
        broker: "Priya Sharma",
        dealValue: 18500000,
        commissionRate: 1.5,
        platformCommission: 277500,
        isLuxury: false,
        dealStatus: "closed",
        payoutStatus: "paid",
        date: new Date().toISOString(),
      },
    ];
  }

  async getRevenueMicroTransactions() {
    return [
      {
        id: "MT-001",
        user: "Amit Patel",
        alertType: "WhatsApp",
        amount: 49,
        paymentStatus: "success",
        date: new Date().toISOString(),
      },
    ];
  }

  async getRevenueTransactions() {
    return [
      {
        id: "TXN-9001",
        entity: "Apex Realty",
        type: "subscription",
        amount: 49999,
        status: "success",
        gateway: "Razorpay",
        date: new Date().toISOString(),
      },
    ];
  }

  // --- Ad Revenue & Campaigns ---
  async getAdRevenueOverview() {
    return {
      totalRevenue: 200000,
      activeCampaigns: 4,
      totalImpressions: 1245000,
      totalClicks: 48900,
      averageCtr: 3.92,
    };
  }

  async getAdCampaigns() {
    return [
      {
        id: "AD-101",
        name: "Godrej Sky Greens Launch",
        advertiser: "Godrej Properties",
        status: "ACTIVE",
        budgetMinor: 5000000n.toString(),
        spentMinor: 3200000n.toString(),
        impressions: 450000,
        clicks: 18200,
        startDate: new Date().toISOString(),
      },
    ];
  }
}
