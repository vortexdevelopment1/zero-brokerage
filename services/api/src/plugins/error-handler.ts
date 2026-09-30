import fp from "fastify-plugin";
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  classifyHttpError,
  formatCanonicalHttpError,
  formatLegacyStep04Error,
} from "../common/http/error-classification.js";
import { isLegacyStep04Route } from "../common/http/compatibility.js";

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(
    (
      error: FastifyError | Error,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      const requestId = request.id;
      const classifiedError = classifyHttpError(error);

      if (classifiedError.category === "unexpected") {
        request.log.error(
          { err: classifiedError.causeError, requestId },
          "Unhandled internal server error occurred",
        );
      }

      const body = isLegacyStep04Route(request)
        ? formatLegacyStep04Error(classifiedError, requestId)
        : formatCanonicalHttpError(classifiedError, requestId);

      return reply.status(classifiedError.statusCode).send(body);
    },
  );
}

export default fp(errorHandlerPlugin, {
  name: "errorHandler",
});
