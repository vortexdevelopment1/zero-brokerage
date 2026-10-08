import type { FastifyInstance } from "fastify";
import { PropertyService } from "../services/property-service.js";
import {
  createCanonicalSuccessResponse,
  adaptPaginationToCanonical,
} from "../../../common/http/contracts.js";
import {
  listPropertiesRouteSchema,
  getPropertyRouteSchema,
  createPropertyRouteSchema,
  propertyIdParamsSchema,
} from "../schemas/property-schemas.js";
import type { PropertyType, CreatePropertyParams } from "../types.js";

export async function registerPropertyRoutes(app: FastifyInstance): Promise<void> {
  const propertyService = new PropertyService(app.db);

  // --- Public / General Property Endpoints ---
  app.get<{
    Querystring: {
      limit?: number;
      cursor?: string;
      propertyType?: PropertyType;
      city?: string;
      locality?: string;
      search?: string;
    };
  }>(
    "/api/v1/properties",
    { schema: listPropertiesRouteSchema },
    async (request, reply) => {
      const result = await propertyService.listProperties(request.query);
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/properties/:id",
    { schema: getPropertyRouteSchema },
    async (request, reply) => {
      const property = await propertyService.getPropertyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(property, request.id));
    },
  );

  app.post<{ Body: CreatePropertyParams }>(
    "/api/v1/properties",
    {
      schema: createPropertyRouteSchema,
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const created = await propertyService.createProperty(request.body);
      return reply.status(201).send(createCanonicalSuccessResponse(created, request.id));
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/properties/:id",
    {
      schema: { params: propertyIdParamsSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      await propertyService.deleteProperty(request.params.id);
      return reply.send(createCanonicalSuccessResponse({ deleted: true }, request.id));
    },
  );

  // --- Admin Property Governance Endpoints ---
  const adminPreHandlers = [
    app.authenticate,
    app.requireRole("SUPER_ADMIN"),
  ];

  app.get<{
    Querystring: {
      limit?: number;
      cursor?: string;
      propertyType?: PropertyType;
      city?: string;
      locality?: string;
      search?: string;
    };
  }>(
    "/api/v1/admin/properties",
    {
      schema: listPropertiesRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const result = await propertyService.listProperties(request.query);
      return reply.send(adaptPaginationToCanonical(result, request.id));
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/properties/:id",
    {
      schema: getPropertyRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const property = await propertyService.getPropertyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(property, request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { status: string; reason?: string };
  }>(
    "/api/v1/admin/properties/:id/status",
    {
      schema: { params: propertyIdParamsSchema },
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const property = await propertyService.getPropertyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse({ id: property.id, status: request.body.status }, request.id));
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/v1/admin/properties/:id/approve",
    {
      schema: { params: propertyIdParamsSchema },
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const property = await propertyService.getPropertyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse({ id: property.id, status: "approved" }, request.id));
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/v1/admin/properties/:id/reject",
    {
      schema: { params: propertyIdParamsSchema },
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const property = await propertyService.getPropertyById(request.params.id);
      return reply.send(createCanonicalSuccessResponse({ id: property.id, status: "rejected" }, request.id));
    },
  );
}
