import AjvCompiler from "@fastify/ajv-compiler";
import type { FastifySchema, FastifySchemaCompiler } from "fastify";
import type { ValidationFieldError } from "./contracts.js";

export interface RawAjvError {
  keyword: string;
  instancePath: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
  message?: string;
}

export interface NormalizedValidationResult {
  fields: ValidationFieldError[];
  legacyDetails: Array<{ field: string; code: string; message: string }>;
}

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /accesstoken/i,
  /refreshtoken/i,
  /otp/i,
  /\bcode\b/i,
  /authorization/i,
  /apikey/i,
  /credential/i,
  /cardnumber/i,
  /cvv/i,
];

function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function normalizePath(instancePath: string): string {
  if (!instancePath || instancePath === "/") {
    return "";
  }
  return instancePath.replace(/^\//, "").replace(/\//g, ".");
}

function resolveFieldName(error: RawAjvError, context?: string): string {
  const normPath = normalizePath(error.instancePath);

  if (
    error.keyword === "required" &&
    typeof error.params?.missingProperty === "string"
  ) {
    const missing = error.params.missingProperty;
    return normPath ? `${normPath}.${missing}` : missing;
  }

  if (
    error.keyword === "additionalProperties" &&
    typeof error.params?.additionalProperty === "string"
  ) {
    const additional = error.params.additionalProperty;
    return normPath ? `${normPath}.${additional}` : additional;
  }

  if (normPath) {
    return normPath;
  }

  // Fallback to validation context if path is empty (root level)
  return context || "request";
}

function mapKeywordToCode(keyword: string): string {
  switch (keyword) {
    case "required":
      return "REQUIRED";
    case "additionalProperties":
      return "UNEXPECTED_PROPERTY";
    case "type":
      return "INVALID_TYPE";
    case "format":
      return "INVALID_FORMAT";
    case "enum":
      return "INVALID_ENUM";
    case "minLength":
      return "STRING_TOO_SHORT";
    case "maxLength":
      return "STRING_TOO_LONG";
    case "minimum":
      return "VALUE_TOO_SMALL";
    case "maximum":
      return "VALUE_TOO_LARGE";
    case "minItems":
      return "ARRAY_TOO_SHORT";
    case "maxItems":
      return "ARRAY_TOO_LONG";
    case "pattern":
      return "PATTERN_MISMATCH";
    default:
      return "INVALID_INPUT";
  }
}

function buildSafeMessage(
  error: RawAjvError,
  field: string,
  code: string,
  context?: string,
): string {
  if (isSensitiveField(field)) {
    if (code === "REQUIRED") {
      return `The field '${field}' is required.`;
    }
    return `The field '${field}' is invalid.`;
  }

  const partName =
    context === "headers"
      ? "header"
      : context === "params"
        ? "path parameter"
        : context === "querystring"
          ? "query parameter"
          : "field";

  switch (code) {
    case "REQUIRED":
      return `The ${partName} '${field}' is required.`;
    case "UNEXPECTED_PROPERTY":
      return `The property '${field}' is not allowed.`;
    case "INVALID_TYPE": {
      const expectedType = String(error.params?.type ?? "declared type");
      return `The ${partName} '${field}' must be a ${expectedType}.`;
    }
    case "INVALID_FORMAT": {
      const format = String(error.params?.format ?? "format");
      if (format === "uuid") {
        return `The ${partName} '${field}' must be a valid UUID.`;
      }
      if (format === "date-time") {
        return `The ${partName} '${field}' must be a valid ISO 8601 date-time.`;
      }
      if (format === "email") {
        return `The ${partName} '${field}' must be a valid email address.`;
      }
      if (format === "uri") {
        return `The ${partName} '${field}' must be a valid URI.`;
      }
      return `The ${partName} '${field}' has an invalid format.`;
    }
    case "INVALID_ENUM":
      return `The ${partName} '${field}' must be one of the allowed values.`;
    case "STRING_TOO_SHORT":
      return `The ${partName} '${field}' must be at least ${error.params?.limit ?? "minimum"} characters.`;
    case "STRING_TOO_LONG":
      return `The ${partName} '${field}' must be at most ${error.params?.limit ?? "maximum"} characters.`;
    case "VALUE_TOO_SMALL":
      return `The ${partName} '${field}' must be greater than or equal to ${error.params?.limit ?? "minimum"}.`;
    case "VALUE_TOO_LARGE":
      return `The ${partName} '${field}' must be less than or equal to ${error.params?.limit ?? "maximum"}.`;
    case "ARRAY_TOO_SHORT":
      return `The ${partName} '${field}' must contain at least ${error.params?.limit ?? "minimum"} items.`;
    case "ARRAY_TOO_LONG":
      return `The ${partName} '${field}' must contain at most ${error.params?.limit ?? "maximum"} items.`;
    case "PATTERN_MISMATCH":
      return `The ${partName} '${field}' does not match the required pattern.`;
    default:
      return `The ${partName} '${field}' is invalid.`;
  }
}

/**
 * Normalizes raw Fastify / Ajv validation error objects into safe, structured
 * public field errors for canonical Step 05 responses and legacy Step 04 responses.
 *
 * Guarantees:
 * - No internal Ajv generated source, internal paths, or stack traces are exposed.
 * - Sensitive values (passwords, tokens, OTPs, etc.) are never reflected or leaked.
 * - Field paths use consistent dot-delimited notation.
 */
export function normalizeFastifyValidationErrors(
  errors: unknown,
  context?: string,
): NormalizedValidationResult {
  if (!Array.isArray(errors) || errors.length === 0) {
    const fallbackField = context || "request";
    return {
      fields: [
        {
          field: fallbackField,
          code: "INVALID_INPUT",
          message: "The request contains invalid values.",
        },
      ],
      legacyDetails: [
        {
          field: fallbackField,
          code: "INVALID_INPUT",
          message: "The request payload contains invalid values.",
        },
      ],
    };
  }

  const fields: ValidationFieldError[] = [];
  const legacyDetails: Array<{ field: string; code: string; message: string }> =
    [];

  for (const raw of errors) {
    const error = raw as RawAjvError;
    const field = resolveFieldName(error, context);
    const code = mapKeywordToCode(error.keyword);
    const message = buildSafeMessage(error, field, code, context);

    fields.push({ field, code, message });
    legacyDetails.push({ field, code, message });
  }

  return { fields, legacyDetails };
}

/**
 * Creates the production Fastify validator compiler for Step 05.
 *
 * Policies enforced:
 * - Body: STRICT. Coercion is disabled (coerceTypes: false).
 *   Unexpected properties are rejected where schemas set additionalProperties: false
 *   (removeAdditional: false). Defaults are applied when declared (useDefaults: true).
 *   All errors are collected (allErrors: true).
 * - Params, Query, Headers: Coercion enabled (coerceTypes: true) to parse string-based
 *   HTTP transport inputs into declared primitive types (integers, booleans, etc.).
 *   Unexpected properties are rejected when schemas set additionalProperties: false
 *   (removeAdditional: false). Defaults are applied when declared (useDefaults: true).
 *   All errors are collected (allErrors: true).
 * - Formats: UUID, ISO 8601 date-time, email, and uri are validated out of the box via ajv-formats.
 * - Compilation failures: Malformed schemas or unsupported formats fail fast at route registration /
 *   startup time, preventing broken endpoints from serving runtime traffic.
 */
function normalizeHeaderSchema(schema: unknown, isRoot = true): unknown {
  if (Array.isArray(schema)) {
    return schema.map((s) => normalizeHeaderSchema(s, false));
  }
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const src = schema as Record<string, unknown>;
  const result: Record<string, unknown> = { ...src };

  if (src.properties && typeof src.properties === "object") {
    const props = src.properties as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(props)) {
      normalized[key.toLowerCase()] = normalizeHeaderSchema(val, false);
    }
    result.properties = normalized;
  }

  if (Array.isArray(src.required)) {
    result.required = src.required.map((name) =>
      typeof name === "string" ? name.toLowerCase() : name,
    );
  }

  for (const combiner of ["allOf", "anyOf", "oneOf"] as const) {
    if (Array.isArray(src[combiner])) {
      result[combiner] = (src[combiner] as unknown[]).map((s) =>
        normalizeHeaderSchema(s, isRoot),
      );
    }
  }

  for (const defsKey of ["$defs", "definitions"] as const) {
    if (src[defsKey] && typeof src[defsKey] === "object") {
      const defs = src[defsKey] as Record<string, unknown>;
      const normalizedDefs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(defs)) {
        normalizedDefs[k] = normalizeHeaderSchema(v, false);
      }
      result[defsKey] = normalizedDefs;
    }
  }

  // On the root HTTP headers object where transport headers (Host, User-Agent, Accept, etc.)
  // are populated by Node/Fastify, permit open additional properties so standard HTTP headers
  // do not trigger unexpected property errors, while strictly validating all declared headers.
  if (isRoot) {
    result.additionalProperties = true;
  }

  return result;
}

export function createValidatorCompiler(
  externalSchemas: Record<string, any> = {},
  _ajvOptions?: any,
): FastifySchemaCompiler<FastifySchema> {
  // Body compiler: strict without coercion, with external schemas for $ref resolution
  const bodyCompiler = AjvCompiler()(externalSchemas, {
    customOptions: {
      coerceTypes: false,
      removeAdditional: false,
      useDefaults: true,
      allErrors: true,
    },
  });

  // Query, params, headers compiler: controlled coercion from string transport, with external schemas
  const coercedCompiler = AjvCompiler()(externalSchemas, {
    customOptions: {
      coerceTypes: true,
      removeAdditional: false,
      useDefaults: true,
      allErrors: true,
    },
  });

  return function validatorCompiler({
    schema,
    method,
    url,
    httpPart,
  }: {
    schema: FastifySchema;
    method: string;
    url: string;
    httpPart?: string;
  }) {
    if (httpPart === "body") {
      return bodyCompiler({ schema, method, url, httpPart });
    }

    if (httpPart === "headers") {
      const normalizedHeaderSchema = normalizeHeaderSchema(
        schema,
        true,
      ) as FastifySchema;
      return coercedCompiler({
        schema: normalizedHeaderSchema,
        method,
        url,
        httpPart,
      });
    }

    return coercedCompiler({ schema, method, url, httpPart });
  };
}
