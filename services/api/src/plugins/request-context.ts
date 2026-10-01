import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { REQUEST_ID_HEADER } from "../common/http/contracts.js";

export interface RequestContextData {
  requestId: string;
  method: string;
  route: string;
  startTime: bigint;
  durationMs: number;
  actorId?: string | null;
  agencyId?: string | null;
  errorCode?: string | null;
}

export interface RequestCompletionLog {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  actorId?: string;
  agencyId?: string;
  errorCode?: string;
  upstreamTimingMs?: number;
}

declare module "fastify" {
  interface FastifyRequest {
    startTime: bigint;
    errorCode?: string | null;
    agencyId?: string | null;
    upstreamTimingMs?: number;
    getContext: () => RequestContextData;
  }
}

export function extractRoutePattern(request: FastifyRequest): string {
  return request.routeOptions?.url ?? "unmatched";
}

export function calculateDurationMs(startTimeNs: bigint): number {
  const durationNs = process.hrtime.bigint() - startTimeNs;
  return Number((Number(durationNs) / 1_000_000).toFixed(3));
}

export function getRequestContext(request: FastifyRequest): RequestContextData {
  const startTime = request.startTime ?? process.hrtime.bigint();
  const durationMs = calculateDurationMs(startTime);

  return {
    requestId: request.id,
    method: request.method,
    route: extractRoutePattern(request),
    startTime,
    durationMs,
    actorId: request.user?.id ?? null,
    agencyId: request.agencyId ?? null,
    errorCode: request.errorCode ?? null,
  };
}

export function buildCompletionLogRecord(
  request: FastifyRequest,
  reply: FastifyReply,
): RequestCompletionLog {
  const startTime = request.startTime ?? process.hrtime.bigint();
  const durationMs = calculateDurationMs(startTime);
  const route = extractRoutePattern(request);

  const record: RequestCompletionLog = {
    requestId: request.id,
    method: request.method,
    route,
    statusCode: reply.statusCode,
    durationMs,
  };

  const actorId = request.user?.id;
  if (actorId) {
    record.actorId = actorId;
  }

  const agencyId = request.agencyId;
  if (agencyId) {
    record.agencyId = agencyId;
  }

  const errorCode = request.errorCode;
  if (errorCode) {
    record.errorCode = errorCode;
  }

  if (request.upstreamTimingMs !== undefined) {
    record.upstreamTimingMs = request.upstreamTimingMs;
  }

  return record;
}

async function requestContextPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest("startTime", BigInt(0));
  app.decorateRequest("errorCode", null);
  app.decorateRequest("agencyId", null);
  app.decorateRequest("upstreamTimingMs", undefined);
  app.decorateRequest("getContext", function (this: FastifyRequest) {
    return getRequestContext(this);
  });

  app.addHook("onRequest", async (request) => {
    request.startTime = process.hrtime.bigint();
  });

  app.addHook("onSend", async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    const logRecord = buildCompletionLogRecord(request, reply);
    request.log.info(logRecord, "request completed");
  });
}

export default fp(requestContextPlugin, { name: "requestContext" });
