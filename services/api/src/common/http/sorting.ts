import { InvalidSortError } from "../errors/index.js";
import type { SortDirection } from "../pagination/index.js";

export interface SortFieldConfig {
  allowedDirections?: SortDirection[];
  nulls?: "FIRST" | "LAST";
}

export interface SortSpec<TFields extends string = string> {
  allowedFields: readonly TFields[];
  defaultField: TFields;
  defaultDirection: SortDirection;
  tieBreakerField?: string;
  fieldConfig?: Partial<Record<TFields, SortFieldConfig>>;
}

export interface ParsedSort<TFields extends string = string> {
  field: TFields;
  direction: SortDirection;
  tieBreakerField: string;
}

/**
 * Creates a Fastify/Ajv compatible JSON schema for validated sort parameters.
 */
export function createSortQuerySchema(spec: SortSpec): Record<string, unknown> {
  return {
    sortBy: {
      type: "string",
      enum: [...spec.allowedFields],
      default: spec.defaultField,
    },
    sortOrder: {
      type: "string",
      enum: ["asc", "desc", "ASC", "DESC"],
      default: spec.defaultDirection.toLowerCase(),
    },
  };
}

/**
 * Parses and validates HTTP sort parameters against an explicit sort specification.
 * Rejects disallowed fields or malicious SQL identifiers with an InvalidSortError (422).
 */
export function parseSortQuery<TFields extends string = string>(
  query: Record<string, unknown>,
  spec: SortSpec<TFields>,
): ParsedSort<TFields> {
  const rawField = query.sortBy ?? query.sortField;
  const rawDirection = query.sortOrder ?? query.direction;

  let field: TFields = spec.defaultField;
  if (rawField !== undefined && rawField !== null && rawField !== "") {
    if (typeof rawField !== "string") {
      throw new InvalidSortError("Sort field must be a string");
    }
    const sanitized = rawField.trim();
    if (!spec.allowedFields.includes(sanitized as TFields)) {
      throw new InvalidSortError(`Sort field "${sanitized}" is not allowed.`);
    }
    field = sanitized as TFields;
  }

  let direction: SortDirection = spec.defaultDirection;
  if (
    rawDirection !== undefined &&
    rawDirection !== null &&
    rawDirection !== ""
  ) {
    if (typeof rawDirection !== "string") {
      throw new InvalidSortError("Sort direction must be a string");
    }
    const upper = rawDirection.trim().toUpperCase();
    if (upper !== "ASC" && upper !== "DESC") {
      throw new InvalidSortError(
        `Sort direction must be 'asc' or 'desc', received "${rawDirection}".`,
      );
    }
    direction = upper as SortDirection;
  }

  return {
    field,
    direction,
    tieBreakerField: spec.tieBreakerField ?? "id",
  };
}
