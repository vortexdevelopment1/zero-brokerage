import type { FastifyInstance } from "fastify";
import { ListingService } from "../services/listing-service.js";
import {
  createCanonicalSuccessResponse,
  adaptPaginationToCanonical,
} from "../../../common/http/contracts.js";
import {
  listListingsRouteSchema,
  getListingRouteSchema,
  createListingRouteSchema,
  updateListingStatusRouteSchema,
  decisionListingRouteSchema,
} from "../schemas/listing-schemas.js";
import type { Listing, ListingStatus, ListingIntent, ListingOwnerType } from "../types.js";

function serializeListing(listing: Listing) {
  return {
    ...listing,
    priceMinor: listing.priceMinor.toString(),
    securityDepositMinor:
      listing.securityDepositMinor !== null ? listing.securityDepositMinor.toString() : null,
    maintenanceFeeMinor:
      listing.maintenanceFeeMinor !== null ? listing.maintenanceFeeMinor.toString() : null,
  };
}

export async function registerListingRoutes(app: FastifyInstance): Promise<void> {
  const listingService = new ListingService(app.db);

  // --- Public / General Listing Endpoints ---
  app.get<{
    Querystring: {
      limit?: number;
      cursor?: string;
      propertyId?: string;
      agencyId?: string;
      brokerId?: string;
      status?: ListingStatus;
      listingIntent?: ListingIntent;
      search?: string;
    };
  }>(
    "/api/v1/listings",
    { schema: listListingsRouteSchema },
    async (request, reply) => {
      const result = await listingService.listListings(request.query);
      const adapted = adaptPaginationToCanonical(
        {
          ...result,
          data: result.data.map(serializeListing) as any,
        },
        request.id,
      );
      return reply.send(adapted);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/listings/:id",
    { schema: getListingRouteSchema },
    async (request, reply) => {
      const listing = await listingService.getListingById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(serializeListing(listing), request.id));
    },
  );

  app.post<{
    Body: {
      propertyId: string;
      ownerType: ListingOwnerType;
      agencyId?: string;
      brokerId?: string;
      listingIntent: ListingIntent;
      title?: string;
      description?: string;
      priceMinor: string;
      currency?: string;
      pricePeriod?: any;
      securityDepositMinor?: string;
      maintenanceFeeMinor?: string;
      isNegotiable?: boolean;
      availableFrom?: string;
      status?: ListingStatus;
    };
  }>(
    "/api/v1/listings",
    {
      schema: createListingRouteSchema,
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const body = request.body;
      const created = await listingService.createListing({
        ...body,
        priceMinor: BigInt(body.priceMinor),
        securityDepositMinor: body.securityDepositMinor ? BigInt(body.securityDepositMinor) : null,
        maintenanceFeeMinor: body.maintenanceFeeMinor ? BigInt(body.maintenanceFeeMinor) : null,
        createdBy: request.user!.id,
      });
      return reply.status(201).send(createCanonicalSuccessResponse(serializeListing(created), request.id));
    },
  );

  // --- Admin Listing Governance Endpoints ---
  const adminPreHandlers = [
    app.authenticate,
    app.requireRole("SUPER_ADMIN"),
  ];

  app.get<{
    Querystring: {
      limit?: number;
      cursor?: string;
      propertyId?: string;
      agencyId?: string;
      brokerId?: string;
      status?: ListingStatus;
      listingIntent?: ListingIntent;
      search?: string;
    };
  }>(
    "/api/v1/admin/listings",
    {
      schema: listListingsRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const result = await listingService.listListings(request.query);
      const adapted = adaptPaginationToCanonical(
        {
          ...result,
          data: result.data.map(serializeListing) as any,
        },
        request.id,
      );
      return reply.send(adapted);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/listings/:id",
    {
      schema: getListingRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const listing = await listingService.getListingById(request.params.id);
      return reply.send(createCanonicalSuccessResponse(serializeListing(listing), request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { reason?: string; comments?: string };
  }>(
    "/api/v1/admin/listings/:id/approve",
    {
      schema: decisionListingRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await listingService.approveListing(request.params.id);
      return reply.send(createCanonicalSuccessResponse(serializeListing(updated), request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { reason?: string; comments?: string };
  }>(
    "/api/v1/admin/listings/:id/reject",
    {
      schema: decisionListingRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await listingService.rejectListing(request.params.id, request.body.reason);
      return reply.send(createCanonicalSuccessResponse(serializeListing(updated), request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { reason?: string; comments?: string };
  }>(
    "/api/v1/admin/listings/:id/suspend",
    {
      schema: decisionListingRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await listingService.suspendListing(request.params.id, request.body.reason);
      return reply.send(createCanonicalSuccessResponse(serializeListing(updated), request.id));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { status: ListingStatus; reason?: string; comments?: string };
  }>(
    "/api/v1/admin/listings/:id/status",
    {
      schema: updateListingStatusRouteSchema,
      preHandler: adminPreHandlers,
    },
    async (request, reply) => {
      const updated = await listingService.updateListingStatus(
        request.params.id,
        request.body.status,
      );
      return reply.send(createCanonicalSuccessResponse(serializeListing(updated), request.id));
    },
  );
}
