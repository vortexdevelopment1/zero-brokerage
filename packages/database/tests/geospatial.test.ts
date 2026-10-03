import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBoundingBoxCondition,
  buildDistanceSelect,
  buildRadiusCondition,
  createGeoPoint,
  formatPointWkt,
  GeospatialValidationError,
  parsePointWkt,
  validateBoundingBox,
  validateCoordinates,
} from "../src/index.js";

describe("Geospatial Technical Utility Unit Tests", () => {
  describe("validateCoordinates & createGeoPoint", () => {
    it("accepts valid longitude and latitude", () => {
      assert.doesNotThrow(() => validateCoordinates(77.5946, 12.9716));
      assert.doesNotThrow(() => validateCoordinates(-180, -90));
      assert.doesNotThrow(() => validateCoordinates(180, 90));
      assert.doesNotThrow(() => validateCoordinates(0, 0));

      const pt = createGeoPoint(77.5946, 12.9716);
      assert.equal(pt.longitude, 77.5946);
      assert.equal(pt.latitude, 12.9716);
    });

    it("rejects out-of-range coordinates", () => {
      // Longitude > 180
      assert.throws(
        () => validateCoordinates(180.001, 12.0),
        GeospatialValidationError,
      );
      // Longitude < -180
      assert.throws(
        () => validateCoordinates(-180.001, 12.0),
        GeospatialValidationError,
      );
      // Latitude > 90
      assert.throws(
        () => validateCoordinates(77.0, 90.001),
        GeospatialValidationError,
      );
      // Latitude < -90
      assert.throws(
        () => validateCoordinates(77.0, -90.001),
        GeospatialValidationError,
      );
    });

    it("rejects non-numeric, NaN, and Infinity values", () => {
      assert.throws(() => validateCoordinates(NaN, 12.0), GeospatialValidationError);
      assert.throws(() => validateCoordinates(77.0, NaN), GeospatialValidationError);
      assert.throws(() => validateCoordinates(Infinity, 12.0), GeospatialValidationError);
      assert.throws(() => validateCoordinates(77.0, -Infinity), GeospatialValidationError);
      // @ts-expect-error test invalid type at runtime
      assert.throws(() => validateCoordinates("77.0", 12.0), GeospatialValidationError);
    });
  });

  describe("validateBoundingBox", () => {
    it("1. accepts normal bounding box", () => {
      assert.doesNotThrow(() =>
        validateBoundingBox({
          minLongitude: 77.5,
          minLatitude: 12.9,
          maxLongitude: 77.7,
          maxLatitude: 13.1,
        }),
      );
    });

    it("2. accepts degenerate bounding box with minLon == maxLon (single meridian)", () => {
      assert.doesNotThrow(() =>
        validateBoundingBox({
          minLongitude: 77.5,
          minLatitude: 12.9,
          maxLongitude: 77.5,
          maxLatitude: 13.1,
        }),
      );
    });

    it("3. accepts degenerate bounding box with minLat == maxLat (single parallel)", () => {
      assert.doesNotThrow(() =>
        validateBoundingBox({
          minLongitude: 77.5,
          minLatitude: 12.9,
          maxLongitude: 77.7,
          maxLatitude: 12.9,
        }),
      );
    });

    it("4. rejects antimeridian crossing (minLon > maxLon)", () => {
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.8,
            minLatitude: 12.9,
            maxLongitude: 77.7,
            maxLatitude: 13.1,
          }),
        /Antimeridian-crossing bounding boxes/,
      );
    });

    it("5. rejects invalid latitude (NaN, Infinity, non-numeric)", () => {
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.5,
            minLatitude: NaN,
            maxLongitude: 77.7,
            maxLatitude: 13.1,
          }),
        GeospatialValidationError,
      );
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.5,
            minLatitude: 12.9,
            maxLongitude: 77.7,
            maxLatitude: Infinity,
          }),
        GeospatialValidationError,
      );
    });

    it("6. rejects invalid longitude (NaN, Infinity, non-numeric)", () => {
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: NaN,
            minLatitude: 12.9,
            maxLongitude: 77.7,
            maxLatitude: 13.1,
          }),
        GeospatialValidationError,
      );
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.5,
            minLatitude: 12.9,
            maxLongitude: -Infinity,
            maxLatitude: 13.1,
          }),
        GeospatialValidationError,
      );
    });

    it("7. rejects out-of-range coordinates (> 180, < -180, > 90, < -90)", () => {
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: -185.0,
            minLatitude: 12.9,
            maxLongitude: 77.7,
            maxLatitude: 13.1,
          }),
        GeospatialValidationError,
      );
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.5,
            minLatitude: 12.9,
            maxLongitude: 181.0,
            maxLatitude: 13.1,
          }),
        GeospatialValidationError,
      );
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.5,
            minLatitude: -95.0,
            maxLongitude: 77.7,
            maxLatitude: 13.1,
          }),
        GeospatialValidationError,
      );
      assert.throws(
        () =>
          validateBoundingBox({
            minLongitude: 77.5,
            minLatitude: 12.9,
            maxLongitude: 77.7,
            maxLatitude: 95.0,
          }),
        GeospatialValidationError,
      );
    });
  });

  describe("buildRadiusCondition", () => {
    it("constructs parameterized ST_DWithin SQL with meters", () => {
      const frag = buildRadiusCondition(
        "location",
        { longitude: 77.5946, latitude: 12.9716 },
        5000,
        1,
      );

      assert.equal(
        frag.sql,
        "ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)",
      );
      assert.deepEqual(frag.params, [77.5946, 12.9716, 5000]);
      assert.equal(frag.nextParamIndex, 4);
    });

    it("respects custom startParamIndex", () => {
      const frag = buildRadiusCondition(
        "p.location",
        { longitude: 72.8777, latitude: 19.076 },
        2500,
        5,
      );

      assert.equal(
        frag.sql,
        "ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7)",
      );
      assert.deepEqual(frag.params, [72.8777, 19.076, 2500]);
      assert.equal(frag.nextParamIndex, 8);
    });

    it("rejects invalid radius values", () => {
      assert.throws(
        () =>
          buildRadiusCondition(
            "location",
            { longitude: 77.0, latitude: 12.0 },
            0,
          ),
        /Radius must be a positive finite number/,
      );

      assert.throws(
        () =>
          buildRadiusCondition(
            "location",
            { longitude: 77.0, latitude: 12.0 },
            -500,
          ),
        /Radius must be a positive finite number/,
      );
    });

    it("rejects invalid column identifier to prevent SQL injection", () => {
      assert.throws(
        () =>
          buildRadiusCondition(
            "location; DROP TABLE properties; --",
            { longitude: 77.0, latitude: 12.0 },
            1000,
          ),
        /Invalid column identifier/,
      );
    });
  });

  describe("buildBoundingBoxCondition", () => {
    it("constructs parameterized ST_Covers condition", () => {
      const frag = buildBoundingBoxCondition(
        "p.location",
        {
          minLongitude: 77.5,
          minLatitude: 12.9,
          maxLongitude: 77.7,
          maxLatitude: 13.1,
        },
        1,
      );

      assert.equal(
        frag.sql,
        "ST_Covers(ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography, p.location)",
      );
      assert.deepEqual(frag.params, [77.5, 12.9, 77.7, 13.1]);
      assert.equal(frag.nextParamIndex, 5);
    });
  });

  describe("buildDistanceSelect", () => {
    it("constructs parameterized ST_Distance select expression", () => {
      const frag = buildDistanceSelect(
        "p.location",
        { longitude: 77.5946, latitude: 12.9716 },
        1,
        "dist",
      );

      assert.equal(
        frag.sql,
        "ST_Distance(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS dist",
      );
      assert.deepEqual(frag.params, [77.5946, 12.9716]);
      assert.equal(frag.nextParamIndex, 3);
    });
  });

  describe("WKT format and parse", () => {
    it("formats coordinates as POINT(lon lat)", () => {
      assert.equal(
        formatPointWkt({ longitude: 77.5946, latitude: 12.9716 }),
        "POINT(77.5946 12.9716)",
      );
    });

    it("parses valid WKT string", () => {
      const parsed = parsePointWkt("POINT(77.5946 12.9716)");
      assert.deepEqual(parsed, { longitude: 77.5946, latitude: 12.9716 });
    });

    it("returns null on invalid WKT", () => {
      assert.equal(parsePointWkt("INVALID"), null);
      assert.equal(parsePointWkt("POLYGON((0 0, 1 1, 1 0, 0 0))"), null);
      assert.equal(parsePointWkt("POINT(200 12)"), null); // out of range lon
    });
  });
});
