import type { FastifySchema } from "fastify";
import { paginationQuerySchema } from "../../../common/http/pagination.js";

const UUID_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export const agencyIdParamsSchema = {
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

export const listAgenciesRouteSchema: FastifySchema = {
  querystring: {
    type: "object",
    properties: {
      ...paginationQuerySchema.properties,
      status: {
        type: "string",
        enum: ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "TERMINATED"],
      },
      city: {
        type: "string",
        maxLength: 100,
      },
      search: {
        type: "string",
        maxLength: 255,
      },
    },
    additionalProperties: false,
  },
};

export const getAgencyRouteSchema: FastifySchema = {
  params: agencyIdParamsSchema,
};

export const createAgencyRouteSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["name", "slug"],
    properties: {
      name: { type: "string", minLength: 2, maxLength: 255 },
      slug: { type: "string", minLength: 2, maxLength: 255, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      legalName: { type: "string", maxLength: 255 },
      licenseNumber: { type: "string", maxLength: 100 },
      status: {
        type: "string",
        enum: ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "TERMINATED"],
        default: "ACTIVE",
      },
      email: { type: "string", format: "email", maxLength: 255 },
      phone: { type: "string", maxLength: 20 },
      addressLine1: { type: "string", maxLength: 255 },
      addressLine2: { type: "string", maxLength: 255 },
      city: { type: "string", maxLength: 100 },
      state: { type: "string", maxLength: 100 },
      postalCode: { type: "string", maxLength: 20 },
      countryCode: { type: "string", minLength: 2, maxLength: 2, default: "IN" },
    },
    additionalProperties: false,
  },
};

export const updateAgencyStatusRouteSchema: FastifySchema = {
  params: agencyIdParamsSchema,
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "TERMINATED"],
      },
      reason: { type: "string", maxLength: 500 },
      comments: { type: "string", maxLength: 1000 },
    },
    additionalProperties: false,
  },
};

export const decisionAgencyRouteSchema: FastifySchema = {
  params: agencyIdParamsSchema,
  body: {
    type: "object",
    properties: {
      reason: { type: "string", maxLength: 500 },
      comments: { type: "string", maxLength: 1000 },
    },
    additionalProperties: false,
  },
};
