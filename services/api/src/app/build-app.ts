import Fastify from "fastify";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import databasePlugin from "../plugins/database.js";
import errorHandlerPlugin from "../plugins/error-handler.js";
import rateLimitPlugin from "../plugins/rate-limit.js";
import authenticationPlugin from "../plugins/authentication.js";
import authorizationPlugin from "../plugins/authorization.js";
import requestContextPlugin from "../plugins/request-context.js";
import {
  REQUEST_ID_HEADER,
  createRequestId,
  createValidatorCompiler,
} from "../common/http/contracts.js";

import { registerHooks } from "./register-hooks.js";
import { registerModules } from "./register-modules.js";
import { registerRoutes } from "./register-routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: false,
    genReqId: (request) => createRequestId(request.headers[REQUEST_ID_HEADER]),
    schemaController: {
      compilersFactory: {
        buildValidator: createValidatorCompiler as any,
      },
    },
  });

  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(helmet);

  await app.register(cors, {
    origin: true,
  });

  await app.register(databasePlugin);
  await app.register(rateLimitPlugin);
  await app.register(authenticationPlugin);
  await app.register(authorizationPlugin);

  registerHooks(app);
  await registerModules(app);
  await registerRoutes(app);

  return app;
}
