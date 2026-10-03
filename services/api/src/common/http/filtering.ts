import { InvalidFilterError } from "../errors/index.js";

export type FilterOperator =
  "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "like" | "between";

export interface FilterFieldSpec {
  allowedOperators: readonly FilterOperator[];
  type: "string" | "number" | "boolean" | "date" | "uuid";
  maxArrayLength?: number;
}

export interface FilterSpec {
  fields: Record<string, FilterFieldSpec>;
}

export interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Creates a Fastify/Ajv compatible JSON Schema fragment for filter query validation.
 */
export function createFilterSchema(spec: FilterSpec): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const [fieldName, fieldDef] of Object.entries(spec.fields)) {
    properties[fieldName] = { type: "string" };
    for (const op of fieldDef.allowedOperators) {
      properties[`${fieldName}[${op}]`] = { type: "string" };
    }
  }

  return properties;
}

/**
 * Validates a value against its declared filter field spec type.
 */
function validateFieldValue(
  field: string,
  operator: FilterOperator,
  value: unknown,
  spec: FilterFieldSpec,
): unknown {
  if (operator === "in") {
    const arr = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",").map((s) => s.trim())
        : [value];
    if (spec.maxArrayLength && arr.length > spec.maxArrayLength) {
      throw new InvalidFilterError(
        `Filter for "${field}" exceeds maximum allowed array items (${spec.maxArrayLength}).`,
      );
    }
    return arr.map((item) => validateSingleValue(field, item, spec.type));
  }

  if (operator === "between") {
    const parts = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",").map((s) => s.trim())
        : [];
    if (parts.length !== 2) {
      throw new InvalidFilterError(
        `Filter "between" for "${field}" requires exactly two values separated by comma.`,
      );
    }
    return [
      validateSingleValue(field, parts[0], spec.type),
      validateSingleValue(field, parts[1], spec.type),
    ];
  }

  return validateSingleValue(field, value, spec.type);
}

function validateSingleValue(
  field: string,
  val: unknown,
  type: FilterFieldSpec["type"],
): unknown {
  if (val === undefined || val === null || val === "") {
    throw new InvalidFilterError(
      `Empty value not permitted for filter "${field}".`,
    );
  }

  const str = String(val).trim();

  switch (type) {
    case "number": {
      const num = Number(str);
      if (Number.isNaN(num)) {
        throw new InvalidFilterError(
          `Value for "${field}" must be a valid number.`,
        );
      }
      return num;
    }
    case "boolean": {
      if (str.toLowerCase() === "true" || str === "1") return true;
      if (str.toLowerCase() === "false" || str === "0") return false;
      throw new InvalidFilterError(`Value for "${field}" must be a boolean.`);
    }
    case "date": {
      const date = new Date(str);
      if (Number.isNaN(date.getTime())) {
        throw new InvalidFilterError(
          `Value for "${field}" must be an ISO-8601 date.`,
        );
      }
      return date;
    }
    case "uuid": {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(str)) {
        throw new InvalidFilterError(
          `Value for "${field}" must be a valid UUID.`,
        );
      }
      return str.toLowerCase();
    }
    case "string":
    default:
      return str;
  }
}

/**
 * Parses query parameters into structured allowlisted filters.
 * Rejects disallowed fields or unsupported operators with InvalidFilterError (422).
 * Prevents raw SQL injection by only allowing declared fields and operators.
 */
export function parseFilterQuery(
  query: Record<string, unknown>,
  spec: FilterSpec,
): ParsedFilter[] {
  const parsedFilters: ParsedFilter[] = [];

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    // Skip pagination and sort query parameters
    if (
      [
        "limit",
        "cursor",
        "sortBy",
        "sortOrder",
        "sortField",
        "direction",
      ].includes(key)
    ) {
      continue;
    }

    // Match filter format: field[operator] or exact field
    let field = key;
    let operator: FilterOperator = "eq";

    const opMatch = key.match(/^([a-zA-Z0-9_]+)\[([a-z]+)\]$/);
    if (opMatch) {
      field = opMatch[1] as string;
      operator = opMatch[2] as FilterOperator;
    }

    // Validate that field is declared in allowlist
    const fieldSpec = spec.fields[field];
    if (!fieldSpec) {
      // Disallowed field in strict filter context
      throw new InvalidFilterError(`Filter field "${field}" is not allowed.`);
    }

    // Validate operator
    if (!fieldSpec.allowedOperators.includes(operator)) {
      throw new InvalidFilterError(
        `Operator "${operator}" is not supported for filter "${field}". Allowed: [${fieldSpec.allowedOperators.join(", ")}].`,
      );
    }

    const validatedVal = validateFieldValue(
      field,
      operator,
      rawValue,
      fieldSpec,
    );

    parsedFilters.push({
      field,
      operator,
      value: validatedVal,
    });
  }

  return parsedFilters;
}
