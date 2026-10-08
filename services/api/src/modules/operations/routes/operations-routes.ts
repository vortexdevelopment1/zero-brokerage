import type { FastifyInstance, FastifyRequest } from "fastify";
import { OperationsService } from "../services/operations-service.js";
import {
  createCanonicalSuccessResponse,
  adaptPaginationToCanonical,
} from "../../../common/http/contracts.js";
import type { Deal } from "../types.js";

function serializeDeal(deal: Deal) {
  return {
    ...deal,
    dealValueMinor: deal.dealValueMinor.toString(),
    tokenAmountMinor: deal.tokenAmountMinor.toString(),
    dealAmount: Number(deal.dealValueMinor) / 100,
    heldDepositAmount: Number(deal.tokenAmountMinor) / 100,
  };
}

export async function registerOperationsRoutes(app: FastifyInstance): Promise<void> {
  const opsService = new OperationsService(app.db);

  const adminPreHandlers = [
    app.authenticate,
    app.requireRole("SUPER_ADMIN"),
  ];

  function registerDualRoute(
    method: "get" | "post" | "patch" | "delete",
    pathSuffix: string,
    opts: any,
    handler: (request: FastifyRequest<any>, reply: any) => Promise<any>,
  ) {
    (app as any)[method](`/api/v1/admin${pathSuffix}`, opts, handler);
    (app as any)[method](`/api/admin${pathSuffix}`, opts, handler);
  }

  // ==========================================
  // 1. DEALS & AGREEMENTS
  // ==========================================

  registerDualRoute(
    "get",
    "/deals",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{
      Querystring: {
        limit?: number;
        cursor?: string;
        status?: string;
        agreementStatus?: string;
        search?: string;
      };
    }>, reply: any) => {
      const result = await opsService.listDeals(request.query);
      return reply.send(
        adaptPaginationToCanonical(
          {
            ...result,
            data: result.data.map(serializeDeal) as any,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "get",
    "/deals/agreements/review",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{
      Querystring: { limit?: number; cursor?: string; search?: string };
    }>, reply: any) => {
      const result = await opsService.listDeals({
        ...request.query,
        agreementStatus: "UNDER_REVIEW",
      });
      return reply.send(
        adaptPaginationToCanonical(
          {
            ...result,
            data: result.data.map(serializeDeal) as any,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "get",
    "/deals/:id",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: any) => {
      const deal = await opsService.getDealById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(serializeDeal(deal), request.id));
    },
  );

  registerDualRoute(
    "patch",
    "/deals/:id/agreements/approve",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { notes?: string } }>, reply: any) => {
      const updated = await opsService.approveAgreements(request.params.id, request.body?.notes);
      return reply.send(createCanonicalSuccessResponse(serializeDeal(updated), request.id));
    },
  );

  registerDualRoute(
    "patch",
    "/deals/:id/agreements/reject",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { notes?: string } }>, reply: any) => {
      const updated = await opsService.rejectAgreements(request.params.id, request.body?.notes);
      return reply.send(createCanonicalSuccessResponse(serializeDeal(updated), request.id));
    },
  );

  registerDualRoute(
    "patch",
    "/deals/:id/status",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { status: string; notes?: string };
    }>, reply: any) => {
      const updated = await opsService.updateDealStatus(
        request.params.id,
        request.body.status,
        request.body.notes,
      );
      return reply.send(createCanonicalSuccessResponse(serializeDeal(updated), request.id));
    },
  );

  // ==========================================
  // 2. CANCELLATIONS
  // ==========================================

  registerDualRoute(
    "get",
    "/cancellations",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{
      Querystring: { limit?: number; cursor?: string; status?: string; search?: string };
    }>, reply: any) => {
      const result = await opsService.listCancellations(request.query);
      return reply.send(
        adaptPaginationToCanonical(
          {
            ...result,
            data: result.data.map((c) => ({
              ...c,
              feeAmountMinor: c.feeAmountMinor.toString(),
              penaltyAmountMinor: c.penaltyAmountMinor.toString(),
            })) as any,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/cancellations/:id/approve",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { notes?: string } }>, reply: any) => {
      const updated = await opsService.approveCancellation(request.params.id, request.body?.notes);
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );

  registerDualRoute(
    "patch",
    "/cancellations/:id/reject",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: any) => {
      const updated = await opsService.rejectCancellation(request.params.id, request.body?.reason);
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );

  // ==========================================
  // 3. REVENUE & FINANCIAL OVERSIGHT
  // ==========================================

  registerDualRoute(
    "get",
    "/revenue/overview",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const overview = await opsService.getRevenueOverview();
      return reply.send(createCanonicalSuccessResponse(overview, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/revenue/subscriptions",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const subscriptions = await opsService.getRevenueSubscriptions();
      return reply.send(createCanonicalSuccessResponse(subscriptions, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/revenue/commission",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const commissions = await opsService.getRevenueCommissions();
      return reply.send(createCanonicalSuccessResponse(commissions, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/revenue/micro-transactions",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const microTransactions = await opsService.getRevenueMicroTransactions();
      return reply.send(createCanonicalSuccessResponse(microTransactions, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/revenue/transactions",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const transactions = await opsService.getRevenueTransactions();
      return reply.send(createCanonicalSuccessResponse(transactions, request.id));
    },
  );

  // ==========================================
  // 4. AD REVENUE & CAMPAIGNS
  // ==========================================

  registerDualRoute(
    "get",
    "/ad-revenue/overview",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const overview = await opsService.getAdRevenueOverview();
      return reply.send(createCanonicalSuccessResponse(overview, request.id));
    },
  );

  registerDualRoute(
    "get",
    "/ad-revenue/campaigns",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const campaigns = await opsService.getAdCampaigns();
      return reply.send(createCanonicalSuccessResponse(campaigns, request.id));
    },
  );

  // ==========================================
  // 5. VISITS
  // ==========================================

  registerDualRoute(
    "get",
    "/visits",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{
      Querystring: { limit?: number; cursor?: string; status?: string };
    }>, reply: any) => {
      const result = await opsService.listVisits(request.query);
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  registerDualRoute(
    "patch",
    "/visits/:id/status",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: any) => {
      const updated = await opsService.updateVisitStatus(request.params.id, request.body.status);
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );

  // ==========================================
  // 6. URGENT REQUIREMENTS
  // ==========================================

  registerDualRoute(
    "get",
    "/urgent-requirements",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{
      Querystring: { limit?: number; cursor?: string; status?: string };
    }>, reply: any) => {
      const result = await opsService.listUrgentRequirements(request.query);
      return reply.send(
        adaptPaginationToCanonical(
          {
            ...result,
            data: result.data.map((r) => ({
              ...r,
              budgetMaxMinor: r.budgetMaxMinor.toString(),
            })) as any,
          },
          request.id,
        ),
      );
    },
  );

  registerDualRoute(
    "patch",
    "/urgent-requirements/:id/status",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: any) => {
      const updated = await opsService.updateUrgentRequirementStatus(
        request.params.id,
        request.body.status,
      );
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );

  // ==========================================
  // 7. REPORTS
  // ==========================================

  registerDualRoute(
    "get",
    "/reports",
    { preHandler: adminPreHandlers },
    async (request: FastifyRequest, reply: any) => {
      const reports = [
        {
          id: "REP-01",
          name: "Monthly Financial Settlement Report",
          format: "PDF",
          generatedAt: new Date().toISOString(),
          status: "READY",
        },
        {
          id: "REP-02",
          name: "Platform Broker Compliance Audit",
          format: "CSV",
          generatedAt: new Date().toISOString(),
          status: "READY",
        },
      ];
      return reply.send(createCanonicalSuccessResponse(reports, request.id));
    },
  );
}
