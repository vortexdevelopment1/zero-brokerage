import type { Pool } from "pg";
import {
  executeQuery,
  type QueryExecutor,
  type GeoCoordinates,
  type BoundingBox,
  buildRadiusCondition,
  buildBoundingBoxCondition,
  buildDistanceSelect,
  validateCoordinates,
} from "@zero-brokerage/database";
import type {
  Property,
  PropertyWithDistance,
  CreatePropertyParams,
  PropertyType,
} from "../types.js";

interface PropertyRow {
  id: string;
  property_type: Property["propertyType"];
  sub_type: Property["subType"];
  title: string | null;
  address_line_1: string;
  address_line_2: string | null;
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  latitude: number;
  longitude: number;
  built_up_area: string | null;
  carpet_area: string | null;
  plot_area: string | null;
  area_unit: Property["areaUnit"];
  bedroom_count: number | null;
  bathroom_count: number | null;
  balcony_count: number | null;
  floor_number: number | null;
  total_floors: number | null;
  furnishing_status: Property["furnishingStatus"];
  amenities: string[];
  attributes: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  distance_meters?: string | number | undefined;
}

function mapPropertyRow(row: PropertyRow): Property {
  return {
    id: row.id,
    propertyType: row.property_type,
    subType: row.sub_type,
    title: row.title,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    locality: row.locality,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    builtUpArea: row.built_up_area !== null ? Number(row.built_up_area) : null,
    carpetArea: row.carpet_area !== null ? Number(row.carpet_area) : null,
    plotArea: row.plot_area !== null ? Number(row.plot_area) : null,
    areaUnit: row.area_unit,
    bedroomCount: row.bedroom_count,
    bathroomCount: row.bathroom_count,
    balconyCount: row.balcony_count,
    floorNumber: row.floor_number,
    totalFloors: row.total_floors,
    furnishingStatus: row.furnishing_status,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    attributes: typeof row.attributes === "object" && row.attributes !== null ? row.attributes : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

const PROPERTY_SELECT_FIELDS = `
  id, property_type, sub_type, title, address_line_1, address_line_2,
  locality, city, state, postal_code, country_code, latitude, longitude,
  built_up_area, carpet_area, plot_area, area_unit, bedroom_count,
  bathroom_count, balcony_count, floor_number, total_floors,
  furnishing_status, amenities, attributes, created_at, updated_at, deleted_at
`;

export class PropertyRepository {
  constructor(private readonly pool: Pool) {}

  async createProperty(
    params: CreatePropertyParams,
    executor?: QueryExecutor,
  ): Promise<Property> {
    const exec = executor ?? this.pool;

    // Validate coordinates: longitude in [-180, 180], latitude in [-90, 90]
    validateCoordinates(params.longitude, params.latitude);

    const result = await executeQuery<PropertyRow>(
      exec,
      `INSERT INTO properties (
         property_type,
         sub_type,
         title,
         address_line_1,
         address_line_2,
         locality,
         city,
         state,
         postal_code,
         country_code,
         latitude,
         longitude,
         location,
         built_up_area,
         carpet_area,
         plot_area,
         area_unit,
         bedroom_count,
         bathroom_count,
         balcony_count,
         floor_number,
         total_floors,
         furnishing_status,
         amenities,
         attributes
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         ST_SetSRID(ST_MakePoint($12, $11), 4326)::geography,
         $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
       )
       RETURNING ${PROPERTY_SELECT_FIELDS};`,
      [
        params.propertyType,
        params.subType,
        params.title ?? null,
        params.addressLine1,
        params.addressLine2 ?? null,
        params.locality,
        params.city,
        params.state,
        params.postalCode,
        params.countryCode ?? "IN",
        params.latitude,
        params.longitude,
        params.builtUpArea ?? null,
        params.carpetArea ?? null,
        params.plotArea ?? null,
        params.areaUnit ?? "SQ_FT",
        params.bedroomCount ?? null,
        params.bathroomCount ?? null,
        params.balconyCount ?? null,
        params.floorNumber ?? null,
        params.totalFloors ?? null,
        params.furnishingStatus ?? null,
        JSON.stringify(params.amenities ?? []),
        JSON.stringify(params.attributes ?? {}),
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to insert property record.");
    }
    return mapPropertyRow(row);
  }

  async findById(
    id: string,
    executor?: QueryExecutor,
  ): Promise<Property | null> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<PropertyRow>(
      exec,
      `SELECT ${PROPERTY_SELECT_FIELDS}
       FROM properties
       WHERE id = $1 AND deleted_at IS NULL;`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapPropertyRow(row) : null;
  }

  async searchPropertiesByRadius(
    params: {
      center: GeoCoordinates;
      radiusMeters: number;
      limit?: number | undefined;
      propertyType?: PropertyType | undefined;
    },
    executor?: QueryExecutor,
  ): Promise<PropertyWithDistance[]> {
    const exec = executor ?? this.pool;
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

    const distanceFrag = buildDistanceSelect("p.location", params.center, 1, "distance_meters");
    const radiusFrag = buildRadiusCondition("p.location", params.center, params.radiusMeters, distanceFrag.nextParamIndex);

    const conditions: string[] = ["p.deleted_at IS NULL", radiusFrag.sql];
    const values: unknown[] = [...distanceFrag.params, ...radiusFrag.params];
    let nextIdx = radiusFrag.nextParamIndex;

    if (params.propertyType) {
      conditions.push(`p.property_type = $${nextIdx++}`);
      values.push(params.propertyType);
    }

    const query = `
      SELECT
        p.id, p.property_type, p.sub_type, p.title, p.address_line_1, p.address_line_2,
        p.locality, p.city, p.state, p.postal_code, p.country_code, p.latitude, p.longitude,
        p.built_up_area, p.carpet_area, p.plot_area, p.area_unit, p.bedroom_count,
        p.bathroom_count, p.balcony_count, p.floor_number, p.total_floors,
        p.furnishing_status, p.amenities, p.attributes, p.created_at, p.updated_at, p.deleted_at,
        ${distanceFrag.sql}
      FROM properties p
      WHERE ${conditions.join(" AND ")}
      ORDER BY distance_meters ASC
      LIMIT $${nextIdx};
    `;
    values.push(limit);

    const result = await executeQuery<PropertyRow>(exec, query, values);

    return result.rows.map((row) => ({
      ...mapPropertyRow(row),
      distanceMeters: Number(row.distance_meters ?? 0),
    }));
  }

  async searchPropertiesByBoundingBox(
    params: {
      bbox: BoundingBox;
      limit?: number | undefined;
      propertyType?: PropertyType | undefined;
    },
    executor?: QueryExecutor,
  ): Promise<Property[]> {
    const exec = executor ?? this.pool;
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

    const bboxFrag = buildBoundingBoxCondition("p.location", params.bbox, 1);
    const conditions: string[] = ["p.deleted_at IS NULL", bboxFrag.sql];
    const values: unknown[] = [...bboxFrag.params];
    let nextIdx = bboxFrag.nextParamIndex;

    if (params.propertyType) {
      conditions.push(`p.property_type = $${nextIdx++}`);
      values.push(params.propertyType);
    }

    const query = `
      SELECT
        p.id, p.property_type, p.sub_type, p.title, p.address_line_1, p.address_line_2,
        p.locality, p.city, p.state, p.postal_code, p.country_code, p.latitude, p.longitude,
        p.built_up_area, p.carpet_area, p.plot_area, p.area_unit, p.bedroom_count,
        p.bathroom_count, p.balcony_count, p.floor_number, p.total_floors,
        p.furnishing_status, p.amenities, p.attributes, p.created_at, p.updated_at, p.deleted_at
      FROM properties p
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $${nextIdx};
    `;
    values.push(limit);

    const result = await executeQuery<PropertyRow>(exec, query, values);
    return result.rows.map(mapPropertyRow);
  }
}
