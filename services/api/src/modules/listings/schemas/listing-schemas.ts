import type { FastifySchema } from "fastify";
import { paginationQuerySchema } from "../../../common/http/pagination.js";

const UUID_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export const listingIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      pattern: UUID_PATTERN,
    },
  },
  additionalProperties: false,
} as const;

export const listListingsRouteSchema: FastifySchema = {
  querystring: {
    type: "object",
    properties: {
      ...paginationQuerySchema.properties,
      propertyId: { type: "string", pattern: UUID_PATTERN },
      agencyId: { type: "string", pattern: UUID_PATTERN },
      brokerId: { type: "string", pattern: UUID_PATTERN },
      status: {
        type: "string",
        enum: [
          "DRAFT", "PENDING_VERIFICATION", "PENDING_MODERATION",
          "PUBLISHED", "SUSPENDED", "EXPIRED", "ARCHIVED",
          "REJECTED", "WITHDRAWN",
        ],
      },
      listingIntent: {
        type: "string",
        enum: ["SALE", "RENT", "LEASE"],
      },
      search: { type: "string", maxLength: 255 },
    },
    additionalProperties: false,
  },
};

export const getListingRouteSchema: FastifySchema = {
  params: listingIdParamsSchema,
};

export const createListingRouteSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["propertyId", "ownerType", "listingIntent", "priceMinor"],
    properties: {
      propertyId: { type: "string", pattern: UUID_PATTERN },
      ownerType: {
        type: "string",
        enum: ["INDEPENDENT_BROKER", "AGENCY", "DIRECT_OWNER"],
      },
      agencyId: { type: "string", pattern: UUID_PATTERN },
      brokerId: { type: "string", pattern: UUID_PATTERN },
      listingIntent: {
        type: "string",
        enum: ["SALE", "RENT", "LEASE"],
      },
      title: { type: "string", maxLength: 255 },
      description: { type: "string", maxLength: 5000 },
      priceMinor: { type: "string", pattern: "^[0-9]+$" },
      currency: { type: "string", minLength: 3, maxLength: 3, default: "INR" },
      pricePeriod: {
        type: "string",
        enum: ["MONTHLY", "YEARLY", "DAILY", "ONE_TIME"],
      },
      securityDepositMinor: { type: "string", pattern: "^[0-9]+$" },
      maintenanceFeeMinor: { type: "string", pattern: "^[0-9]+$" },
      isNegotiable: { type: "boolean", default: false },
      availableFrom: { type: "string", format: "date" },
      status: {
        type: "string",
        enum: [
          "DRAFT", "PENDING_VERIFICATION", "PENDING_MODERATION",
          "PUBLISHED", "SUSPENDED", "EXPIRED", "ARCHIVED",
          "REJECTED", "WITHDRAWN",
        ],
        default: "DRAFT",
      },
    },
    additionalProperties: false,
  },
};

export const updateListingStatusRouteSchema: FastifySchema = {
  params: listingIdParamsSchema,
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: [
          "DRAFT", "PENDING_VERIFICATION", "PENDING_MODERATION",
          "PUBLISHED", "SUSPENDED", "EXPIRED", "ARCHIVED",
          "REJECTED", "WITHDRAWN",
        ],
      },
      reason: { type: "string", maxLength: 500 },
      comments: { type: "string", maxLength: 1000 },
    },
    additionalProperties: false,
  },
};

export const decisionListingRouteSchema: FastifySchema = {
  params: listingIdParamsSchema,
  body: {
    type: "object",
    properties: {
      reason: { type: "string", maxLength: 500 },
      comments: { type: "string", maxLength: 1000 },
    },
    additionalProperties: false,
  },
};
