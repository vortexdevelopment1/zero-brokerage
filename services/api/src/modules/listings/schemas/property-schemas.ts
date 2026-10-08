import type { FastifySchema } from "fastify";
import { paginationQuerySchema } from "../../../common/http/pagination.js";

const UUID_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export const propertyIdParamsSchema = {
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

export const listPropertiesRouteSchema: FastifySchema = {
  querystring: {
    type: "object",
    properties: {
      ...paginationQuerySchema.properties,
      propertyType: {
        type: "string",
        enum: ["RESIDENTIAL", "COMMERCIAL", "LAND"],
      },
      city: { type: "string", maxLength: 100 },
      locality: { type: "string", maxLength: 100 },
      search: { type: "string", maxLength: 255 },
    },
    additionalProperties: false,
  },
};

export const getPropertyRouteSchema: FastifySchema = {
  params: propertyIdParamsSchema,
};

export const createPropertyRouteSchema: FastifySchema = {
  body: {
    type: "object",
    required: [
      "propertyType",
      "subType",
      "addressLine1",
      "locality",
      "city",
      "state",
      "postalCode",
      "latitude",
      "longitude",
    ],
    properties: {
      propertyType: {
        type: "string",
        enum: ["RESIDENTIAL", "COMMERCIAL", "LAND"],
      },
      subType: {
        type: "string",
        enum: [
          "APARTMENT", "PENTHOUSE", "VILLA", "BUILDER_FLOOR",
          "OFFICE", "CO_WORKING", "RETAIL", "COMMERCIAL_BUILDING",
          "AGRICULTURAL_LAND", "INDUSTRIAL_PLOT", "COMMERCIAL_PLOT",
        ],
      },
      title: { type: "string", maxLength: 255 },
      addressLine1: { type: "string", minLength: 1, maxLength: 255 },
      addressLine2: { type: "string", maxLength: 255 },
      locality: { type: "string", minLength: 1, maxLength: 100 },
      city: { type: "string", minLength: 1, maxLength: 100 },
      state: { type: "string", minLength: 1, maxLength: 100 },
      postalCode: { type: "string", minLength: 1, maxLength: 20 },
      countryCode: { type: "string", minLength: 2, maxLength: 2, default: "IN" },
      latitude: { type: "number", minimum: -90, maximum: 90 },
      longitude: { type: "number", minimum: -180, maximum: 180 },
      builtUpArea: { type: "number", minimum: 0 },
      carpetArea: { type: "number", minimum: 0 },
      plotArea: { type: "number", minimum: 0 },
      areaUnit: {
        type: "string",
        enum: ["SQ_FT", "SQ_M", "ACRES", "HECTARES", "SQ_YD"],
        default: "SQ_FT",
      },
      bedroomCount: { type: "integer", minimum: 0 },
      bathroomCount: { type: "integer", minimum: 0 },
      balconyCount: { type: "integer", minimum: 0 },
      floorNumber: { type: "integer" },
      totalFloors: { type: "integer", minimum: 0 },
      furnishingStatus: {
        type: "string",
        enum: ["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"],
      },
      amenities: {
        type: "array",
        items: { type: "string" },
      },
      attributes: {
        type: "object",
        additionalProperties: true,
      },
    },
    additionalProperties: false,
  },
};
