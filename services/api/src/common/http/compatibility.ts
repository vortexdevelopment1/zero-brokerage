import type { FastifyRequest } from "fastify";

export type CompatibilitySurface = "step04-legacy" | "step05-canonical";

export interface RouteCompatibilityConfig {
  compatibilitySurface?: CompatibilitySurface;
}

/**
 * Explicit route configuration declaration for Step 04 legacy compatibility.
 * Routes registered with this marker receive the legacy Step 04 error envelope
 * ({ success: false, error: { ... } }) rather than the canonical Step 05 envelope.
 */
export const STEP04_LEGACY_COMPATIBILITY_CONFIG: RouteCompatibilityConfig = {
  compatibilitySurface: "step04-legacy",
} as const;

/**
 * Explicit route configuration declaration for canonical Step 05 endpoints.
 * This is also the default behavior for all unmarked routes.
 */
export const STEP05_CANONICAL_COMPATIBILITY_CONFIG: RouteCompatibilityConfig = {
  compatibilitySurface: "step05-canonical",
} as const;

declare module "fastify" {
  interface FastifyContextConfig {
    compatibilitySurface?: CompatibilitySurface;
  }
}

/**
 * Determines whether the active request was registered under the Step 04
 * legacy compatibility boundary by inspecting route configuration metadata.
 *
 * This function NEVER inspects the URL path or infers legacy status from prefixes.
 */
export function isLegacyStep04Route(request: FastifyRequest): boolean {
  return request.routeOptions?.config?.compatibilitySurface === "step04-legacy";
}
