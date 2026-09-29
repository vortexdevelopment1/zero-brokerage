import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_LIMIT,
  buildKeysetCondition,
  buildPaginatedResult,
  decodeCursor,
  encodeCursor,
  normalizeLimit,
} from "./index.js";
import { BadRequestError } from "../errors/index.js";

describe("Shared Keyset Pagination Utility", () => {
  describe("normalizeLimit", () => {
    it("returns default limit when input is undefined, null, or empty", () => {
      assert.equal(normalizeLimit(), DEFAULT_PAGE_LIMIT);
      assert.equal(normalizeLimit(null), DEFAULT_PAGE_LIMIT);
      assert.equal(normalizeLimit(""), DEFAULT_PAGE_LIMIT);
    });

    it("parses numeric and string limits correctly", () => {
      assert.equal(normalizeLimit(15), 15);
      assert.equal(normalizeLimit("25"), 25);
    });

    it("clamps limit to maximum and minimum bounds", () => {
      assert.equal(normalizeLimit(0), DEFAULT_PAGE_LIMIT);
      assert.equal(normalizeLimit(-5), DEFAULT_PAGE_LIMIT);
      assert.equal(normalizeLimit(1000), MAX_PAGE_LIMIT);
      assert.equal(
        normalizeLimit(50, { defaultLimit: 10, maxLimit: 30 }),
        30,
      );
    });

    it("handles non-numeric inputs safely", () => {
      assert.equal(normalizeLimit("invalid"), DEFAULT_PAGE_LIMIT);
      assert.equal(normalizeLimit(NaN), DEFAULT_PAGE_LIMIT);
    });
  });

  describe("encodeCursor & decodeCursor", () => {
    it("encodes and decodes a valid cursor payload deterministically", () => {
      const payload = {
        v: 1 as const,
        sortField: "created_at",
        sortValue: "2026-09-29T10:00:00.000Z",
        direction: "DESC" as const,
        tieBreakerField: "id",
        tieBreakerValue: "123e4567-e89b-12d3-a456-426614174000",
        queryContext: "properties_feed",
      };

      const encoded = encodeCursor(payload);
      assert.equal(typeof encoded, "string");
      assert.ok(encoded.length > 0);

      const decoded = decodeCursor(encoded, {
        sortField: "created_at",
        direction: "DESC",
        tieBreakerField: "id",
        queryContext: "properties_feed",
      });

      assert.deepEqual(decoded, payload);
    });

    it("rejects malformed or non-base64url cursor strings", () => {
      assert.throws(() => {
        decodeCursor("!!!not-valid-base64!!!", {
          sortField: "created_at",
          direction: "DESC",
        });
      }, BadRequestError);
    });

    it("rejects cursor with mismatched sort field", () => {
      const encoded = encodeCursor({
        v: 1,
        sortField: "price",
        sortValue: 50000,
        direction: "ASC",
        tieBreakerField: "id",
        tieBreakerValue: "abc-123",
      });

      assert.throws(
        () => {
          decodeCursor(encoded, {
            sortField: "created_at",
            direction: "ASC",
          });
        },
        /Cursor sort field mismatch/,
      );
    });

    it("rejects cursor with mismatched direction", () => {
      const encoded = encodeCursor({
        v: 1,
        sortField: "created_at",
        sortValue: "2026-01-01",
        direction: "ASC",
        tieBreakerField: "id",
        tieBreakerValue: "abc-123",
      });

      assert.throws(
        () => {
          decodeCursor(encoded, {
            sortField: "created_at",
            direction: "DESC",
          });
        },
        /Cursor direction mismatch/,
      );
    });

    it("rejects cursor with incompatible queryContext (context binding)", () => {
      const encoded = encodeCursor({
        v: 1,
        sortField: "created_at",
        sortValue: "2026-01-01",
        direction: "DESC",
        tieBreakerField: "id",
        tieBreakerValue: "abc-123",
        queryContext: "agency_users",
      });

      assert.throws(
        () => {
          decodeCursor(encoded, {
            sortField: "created_at",
            direction: "DESC",
            queryContext: "public_listings",
          });
        },
        /Cursor was generated for a different query context/,
      );
    });

    it("rejects cursor with disallowed sort field", () => {
      const encoded = encodeCursor({
        v: 1,
        sortField: "secret_score",
        sortValue: 100,
        direction: "DESC",
        tieBreakerField: "id",
        tieBreakerValue: "abc-123",
      });

      assert.throws(
        () => {
          decodeCursor(encoded, {
            sortField: "secret_score",
            direction: "DESC",
            allowedSortFields: ["created_at", "updated_at"],
          });
        },
        /Sort field "secret_score" is not permitted/,
      );
    });

    it("rejects tampered or corrupt JSON inside base64url cursor", () => {
      const tampered = Buffer.from(
        JSON.stringify({ v: 999, invalid: true }),
        "utf-8",
      ).toString("base64url");

      assert.throws(() => {
        decodeCursor(tampered, {
          sortField: "created_at",
          direction: "DESC",
        });
      }, /Unsupported cursor version/);
    });

    it("rejects excessively large cursor strings to prevent memory exhaustion attacks", () => {
      const giantString = "A".repeat(2000);
      assert.throws(() => {
        decodeCursor(giantString, {
          sortField: "created_at",
          direction: "DESC",
        });
      }, /Cursor exceeds maximum permitted length/);
    });
  });

  describe("buildKeysetCondition", () => {
    it("builds parameterized SQL condition for ASC forward keyset", () => {
      const res = buildKeysetCondition({
        sortColumn: "price",
        tieBreakerColumn: "id",
        sortValue: 1000000,
        tieBreakerValue: "uuid-abc",
        direction: "ASC",
        startIndex: 3,
      });

      assert.equal(
        res.clause,
        "(price > $3 OR (price = $3 AND id > $4))",
      );
      assert.deepEqual(res.values, [1000000, "uuid-abc"]);
    });

    it("builds parameterized SQL condition for DESC forward keyset", () => {
      const res = buildKeysetCondition({
        sortColumn: "created_at",
        tieBreakerColumn: "id",
        sortValue: "2026-09-29T00:00:00Z",
        tieBreakerValue: "uuid-xyz",
        direction: "DESC",
        startIndex: 1,
      });

      assert.equal(
        res.clause,
        "(created_at < $1 OR (created_at = $1 AND id < $2))",
      );
      assert.deepEqual(res.values, ["2026-09-29T00:00:00Z", "uuid-xyz"]);
    });

    it("rejects SQL injection attempts in column identifiers", () => {
      assert.throws(() => {
        buildKeysetCondition({
          sortColumn: "price; DROP TABLE users;--",
          tieBreakerColumn: "id",
          sortValue: 1,
          tieBreakerValue: "a",
          direction: "ASC",
        });
      }, /Invalid sort column identifier/);

      assert.throws(() => {
        buildKeysetCondition({
          sortColumn: "price",
          tieBreakerColumn: "id' OR '1'='1",
          sortValue: 1,
          tieBreakerValue: "a",
          direction: "ASC",
        });
      }, /Invalid tie-breaker column identifier/);
    });
  });

  describe("buildPaginatedResult", () => {
    interface TestItem {
      id: string;
      created_at: string;
      name: string;
    }

    const testItems: TestItem[] = [
      { id: "id-1", created_at: "2026-09-29T10:00:00Z", name: "Item 1" },
      { id: "id-2", created_at: "2026-09-29T09:00:00Z", name: "Item 2" },
      { id: "id-3", created_at: "2026-09-29T08:00:00Z", name: "Item 3" },
      { id: "id-4", created_at: "2026-09-29T07:00:00Z", name: "Item 4" },
    ];

    it("returns hasNextPage = true and nextCursor when rows exceed limit", () => {
      // Query was executed with LIMIT 3 + 1 = 4 rows returned
      const result = buildPaginatedResult(testItems, 3, {
        sortField: "created_at",
        direction: "DESC",
        tieBreakerField: "id",
        queryContext: "test_items",
      });

      assert.equal(result.data.length, 3);
      assert.equal(result.pagination.hasNextPage, true);
      assert.ok(result.pagination.nextCursor !== null);

      // Verify the generated cursor decodes to the 3rd item (last item in page)
      const decoded = decodeCursor(result.pagination.nextCursor!, {
        sortField: "created_at",
        direction: "DESC",
        tieBreakerField: "id",
        queryContext: "test_items",
      });

      assert.equal(decoded.sortValue, "2026-09-29T08:00:00Z");
      assert.equal(decoded.tieBreakerValue, "id-3");
    });

    it("returns hasNextPage = false and nextCursor = null when rows are <= limit", () => {
      const result = buildPaginatedResult(testItems.slice(0, 2), 3, {
        sortField: "created_at",
        direction: "DESC",
        tieBreakerField: "id",
      });

      assert.equal(result.data.length, 2);
      assert.equal(result.pagination.hasNextPage, false);
      assert.equal(result.pagination.nextCursor, null);
    });

    it("handles identical sort values deterministically using unique tie-breaker", () => {
      const duplicateSortItems = [
        { id: "id-c", created_at: "2026-09-29T10:00:00Z", name: "C" },
        { id: "id-b", created_at: "2026-09-29T10:00:00Z", name: "B" },
        { id: "id-a", created_at: "2026-09-29T10:00:00Z", name: "A" },
      ];

      const page1 = buildPaginatedResult(duplicateSortItems, 2, {
        sortField: "created_at",
        direction: "DESC",
        tieBreakerField: "id",
      });

      assert.equal(page1.pagination.hasNextPage, true);
      assert.ok(page1.pagination.nextCursor);

      const decoded = decodeCursor(page1.pagination.nextCursor!, {
        sortField: "created_at",
        direction: "DESC",
        tieBreakerField: "id",
      });

      // Even though created_at is identical, tie-breaker id-b uniquely identifies the page boundary
      assert.equal(decoded.sortValue, "2026-09-29T10:00:00Z");
      assert.equal(decoded.tieBreakerValue, "id-b");
    });
  });
});
