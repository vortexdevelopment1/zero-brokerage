import fp from "fastify-plugin";
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  ClassifiedHttpError,
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
      if (reply.sent) {
        request.log.warn(
          { requestId: request.id },
          "Reply already sent; skipping error handling",
        );
        return;
      }

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

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;
    const notFoundError = new ClassifiedHttpError({
      statusCode: 404,
      code: "NOT_FOUND",
      publicMessage: "The requested resource was not found.",
      retryable: false,
      category: "framework",
      causeError: new Error(`Route ${request.method}:${request.url} not found`),
      legacyCode: "NOT_FOUND",
      legacyMessage: "Resource not found",
    });

    const body = isLegacyStep04Route(request)
      ? formatLegacyStep04Error(notFoundError, requestId)
      : formatCanonicalHttpError(notFoundError, requestId);

    return reply.status(404).send(body);
  });
}

export default fp(errorHandlerPlugin, {
  name: "errorHandler",
});
