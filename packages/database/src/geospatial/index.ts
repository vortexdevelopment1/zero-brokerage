/**
 * Geospatial Technical Utility
 *
 * Provides PostGIS spatial querying primitives and coordinate validation.
 * PostGIS Coordinate Rule: ST_MakePoint(longitude, latitude) — Longitude FIRST, Latitude SECOND.
 * CRS: SRID 4326 (WGS 84 geographic coordinates).
 * Units: Explicit meters for radius and distance queries.
 */

export class GeospatialValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeospatialValidationError";
  }
}

export interface GeoCoordinates {
  readonly longitude: number;
  readonly latitude: number;
}

export interface BoundingBox {
  readonly minLongitude: number;
  readonly minLatitude: number;
  readonly maxLongitude: number;
  readonly maxLatitude: number;
}

export interface ParameterizedSqlFragment {
  readonly sql: string;
  readonly params: readonly (number | string)[];
  readonly nextParamIndex: number;
}

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;

function assertSafeColumnIdentifier(columnName: string): string {
  const trimmed = columnName.trim();
  if (!SAFE_IDENTIFIER_REGEX.test(trimmed)) {
    throw new GeospatialValidationError(
      `Invalid column identifier for geospatial predicate: "${columnName}".`,
    );
  }
  return trimmed;
}

/**
 * Validates WGS 84 coordinates strictly.
 * Coordinate bounds:
 *   Longitude: -180.0 to +180.0 degrees
 *   Latitude:  -90.0 to +90.0 degrees
 * Rejects NaN, Infinity, and non-numeric types.
 */
export function validateCoordinates(longitude: number, latitude: number): void {
  if (typeof longitude !== "number" || isNaN(longitude) || !isFinite(longitude)) {
    throw new GeospatialValidationError(
      `Invalid longitude value: expected finite number, received ${longitude}.`,
    );
  }

  if (typeof latitude !== "number" || isNaN(latitude) || !isFinite(latitude)) {
    throw new GeospatialValidationError(
      `Invalid latitude value: expected finite number, received ${latitude}.`,
    );
  }

  if (longitude < -180 || longitude > 180) {
    throw new GeospatialValidationError(
      `Longitude out of range: must be between -180 and 180, received ${longitude}.`,
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new GeospatialValidationError(
      `Latitude out of range: must be between -90 and 90, received ${latitude}.`,
    );
  }
}

/**
 * Creates and validates a GeoCoordinates object.
 */
export function createGeoPoint(longitude: number, latitude: number): GeoCoordinates {
  validateCoordinates(longitude, latitude);
  return { longitude, latitude };
}

/**
 * Validates a bounding box ensuring min <= max and all coordinates are valid.
 *
 * NOTE (Antimeridian contract):
 * Bounding-box queries strictly support standard, non-wrapping longitude ranges where minLongitude <= maxLongitude.
 * Antimeridian-crossing bounding boxes (where minLongitude > maxLongitude) are explicitly unsupported in this batch
 * and are deterministically rejected with a GeospatialValidationError.
 * Degenerate bounding boxes where minLongitude == maxLongitude (single meridian) or
 * minLatitude == maxLatitude (single parallel) are valid.
 */
export function validateBoundingBox(bbox: BoundingBox): void {
  validateCoordinates(bbox.minLongitude, bbox.minLatitude);
  validateCoordinates(bbox.maxLongitude, bbox.maxLatitude);

  if (bbox.minLongitude > bbox.maxLongitude) {
    throw new GeospatialValidationError(
      `Antimeridian-crossing bounding boxes (minLongitude > maxLongitude) are unsupported: received minLongitude = ${bbox.minLongitude}, maxLongitude = ${bbox.maxLongitude}.`,
    );
  }

  if (bbox.minLatitude > bbox.maxLatitude) {
    throw new GeospatialValidationError(
      `Invalid bounding box: minLatitude (${bbox.minLatitude}) cannot exceed maxLatitude (${bbox.maxLatitude}).`,
    );
  }
}

/**
 * Builds a parameterized ST_DWithin SQL condition using PostGIS geography.
 * Utilizes the spatial GiST index on the geography column.
 *
 * Distance unit: METERS.
 */
export function buildRadiusCondition(
  columnName: string,
  target: GeoCoordinates,
  radiusMeters: number,
  startParamIndex = 1,
): ParameterizedSqlFragment {
  const safeCol = assertSafeColumnIdentifier(columnName);
  validateCoordinates(target.longitude, target.latitude);

  if (typeof radiusMeters !== "number" || isNaN(radiusMeters) || !isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new GeospatialValidationError(
      `Radius must be a positive finite number of meters, received ${radiusMeters}.`,
    );
  }

  const p1 = startParamIndex;
  const p2 = startParamIndex + 1;
  const p3 = startParamIndex + 2;

  // PostGIS ST_MakePoint(longitude, latitude)
  const sql = `ST_DWithin(${safeCol}, ST_SetSRID(ST_MakePoint($${p1}, $${p2}), 4326)::geography, $${p3})`;

  return {
    sql,
    params: [target.longitude, target.latitude, radiusMeters],
    nextParamIndex: startParamIndex + 3,
  };
}

/**
 * Builds a parameterized PostGIS bounding box condition using ST_Covers on ST_MakeEnvelope.
 * Envelope order: ST_MakeEnvelope(minLon, minLat, maxLon, maxLat, 4326)::geography
 */
export function buildBoundingBoxCondition(
  columnName: string,
  bbox: BoundingBox,
  startParamIndex = 1,
): ParameterizedSqlFragment {
  const safeCol = assertSafeColumnIdentifier(columnName);
  validateBoundingBox(bbox);

  const p1 = startParamIndex;
  const p2 = startParamIndex + 1;
  const p3 = startParamIndex + 2;
  const p4 = startParamIndex + 3;

  const sql = `ST_Covers(ST_MakeEnvelope($${p1}, $${p2}, $${p3}, $${p4}, 4326)::geography, ${safeCol})`;

  return {
    sql,
    params: [bbox.minLongitude, bbox.minLatitude, bbox.maxLongitude, bbox.maxLatitude],
    nextParamIndex: startParamIndex + 4,
  };
}

/**
 * Builds a parameterized ST_Distance select expression in METERS.
 */
export function buildDistanceSelect(
  columnName: string,
  target: GeoCoordinates,
  startParamIndex = 1,
  alias = "distance_meters",
): ParameterizedSqlFragment {
  const safeCol = assertSafeColumnIdentifier(columnName);
  const safeAlias = assertSafeColumnIdentifier(alias);
  validateCoordinates(target.longitude, target.latitude);

  const p1 = startParamIndex;
  const p2 = startParamIndex + 1;

  const sql = `ST_Distance(${safeCol}, ST_SetSRID(ST_MakePoint($${p1}, $${p2}), 4326)::geography) AS ${safeAlias}`;

  return {
    sql,
    params: [target.longitude, target.latitude],
    nextParamIndex: startParamIndex + 2,
  };
}

/**
 * Formats coordinates as Well-Known Text (WKT) POINT(lon lat).
 */
export function formatPointWkt(coords: GeoCoordinates): string {
  validateCoordinates(coords.longitude, coords.latitude);
  return `POINT(${coords.longitude} ${coords.latitude})`;
}

/**
 * Parses WKT POINT string into GeoCoordinates.
 */
export function parsePointWkt(wkt: string): GeoCoordinates | null {
  if (!wkt || typeof wkt !== "string") {
    return null;
  }
  const match = wkt.match(/^POINT\s*\(\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s*\)$/i);
  if (!match || !match[1] || !match[3]) {
    return null;
  }

  const longitude = parseFloat(match[1]);
  const latitude = parseFloat(match[3]);
  try {
    validateCoordinates(longitude, latitude);
    return { longitude, latitude };
  } catch {
    return null;
  }
}
