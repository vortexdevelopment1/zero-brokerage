import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import { REQUEST_ID_HEADER } from "../common/http/contracts.js";

async function requestContextPlugin(app: FastifyInstance): Promise<void> {
  app.addHook("onSend", async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });
}

export default fp(requestContextPlugin, { name: "requestContext" });
