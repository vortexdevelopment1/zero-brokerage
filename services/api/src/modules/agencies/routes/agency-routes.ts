import type { FastifyInstance, FastifyRequest } from "fastify";
import { AgencyService } from "../services/agency-service.js";
import {
  createCanonicalSuccessResponse,
  adaptPaginationToCanonical,
} from "../../../common/http/contracts.js";
import {
  listAgenciesRouteSchema,
  getAgencyRouteSchema,
  createAgencyRouteSchema,
  updateAgencyStatusRouteSchema,
  decisionAgencyRouteSchema,
} from "../schemas/agency-schemas.js";
import type { AgencyStatus } from "../types.js";

export async function registerAgencyRoutes(app: FastifyInstance): Promise<void> {
  const agencyService = new AgencyService(app.db);

  // --- Public / General Agency Endpoints ---
  app.get<{
    Querystring: {
      limit?: number;
      cursor?: string;
      status?: AgencyStatus;
      city?: string;
      search?: string;
    };
  }>(
    "/api/v1/agencies",
    { schema: listAgenciesRouteSchema },
    async (request, reply) => {
      const result = await agencyService.listAgencies(request.query);
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/agencies/:id",
    { schema: getAgencyRouteSchema },
    async (request, reply) => {
      const agency = await agencyService.getAgencyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(agency, request.id));
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/agencies/:id/members",
    { schema: getAgencyRouteSchema },
    async (request, reply) => {
      const members = await agencyService.getAgencyMembers(request.params.id);
      return reply.send(createCanonicalSuccessResponse(members, request.id));
    },
  );

  // --- Admin Agency Governance Endpoints ---
  // Authenticated & authorized with SUPER_ADMIN role
  const adminPreHandlers = [
    app.authenticate,
    app.requireRole("SUPER_ADMIN"),
  ];

  app.get<{
    Querystring: {
      limit?: number;
      cursor?: string;
      status?: AgencyStatus;
      city?: string;
      search?: string;
    };
  }>(
    "/api/v1/admin/agencies",
    {
      schema: listAgenciesRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const result = await agencyService.listAgencies(request.query);
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/agencies/:id",
    {
      schema: getAgencyRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const agency = await agencyService.getAgencyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(agency, request.id));
    },
  );

  app.post<{
    Body: {
      name: string;
      slug: string;
      legalName?: string;
      licenseNumber?: string;
      status?: AgencyStatus;
      email?: string;
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    };
  }>(
    "/api/v1/admin/agencies",
    {
      schema: createAgencyRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const created = await agencyService.createAgency(request.body);
      return reply.status(201).send(createCanonicalSuccessResponse(created, request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { reason?: string; comments?: string };
  }>(
    "/api/v1/admin/agencies/:id/approve",
    {
      schema: decisionAgencyRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await agencyService.approveAgency(request.params.id);
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { reason?: string; comments?: string };
  }>(
    "/api/v1/admin/agencies/:id/reject",
    {
      schema: decisionAgencyRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await agencyService.rejectAgency(request.params.id, request.body.reason);
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { status: AgencyStatus; reason?: string; comments?: string };
  }>(
    "/api/v1/admin/agencies/:id/status",
    {
      schema: updateAgencyStatusRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await agencyService.updateAgencyStatus(
        request.params.id,
        request.body.status,
      );
      return reply.send(createCanonicalSuccessResponse(updated, request.id));
    },
  );
}
