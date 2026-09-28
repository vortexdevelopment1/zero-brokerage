import fp from "fastify-plugin";
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { AppError } from "../common/errors/index.js";

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(
    (
      error: FastifyError | Error,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      const timestamp = new Date().toISOString();
      const requestId = request.id;

      // 1. Known AppError instances
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
            timestamp,
            requestId,
          },
        });
      }

      // 2. Zod validation errors
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }));

        return reply.status(422).send({
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "The request payload contains invalid values.",
            details,
            timestamp,
            requestId,
          },
        });
      }

      // 3. Fastify built-in validation / syntax errors
      const fastifyError = error as FastifyError;
      if (
        fastifyError.statusCode &&
        fastifyError.statusCode >= 400 &&
        fastifyError.statusCode < 500
      ) {
        return reply.status(fastifyError.statusCode).send({
          success: false,
          error: {
            code: fastifyError.code ?? "BAD_REQUEST",
            message: fastifyError.message,
            timestamp,
            requestId,
          },
        });
      }

      // 4. Uncaught server errors (never leak stack or internal details)
      request.log.error(
        { err: error, requestId },
        "Unhandled internal server error occurred",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An internal server error occurred.",
          timestamp,
          requestId,
        },
      });
    },
  );
}

export default fp(errorHandlerPlugin, {
  name: "errorHandler",
});
