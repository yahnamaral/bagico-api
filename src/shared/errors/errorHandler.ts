import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./AppError";

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error.code ?? "APP_ERROR",
        details: error.details ?? {},
      },
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        message: "Validation error",
        code: "VALIDATION_ERROR",
        details: {
          issues: error.issues,
        },
      },
    });
  }

  request.log.error({
    err: error,
    message: error.message,
    statusCode: error.statusCode,
  });

  const statusCode = error.statusCode ?? 500;

  return reply.status(statusCode).send({
    error: {
      message: statusCode < 500 ? error.message : "Internal server error",
      code: statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
      details: isProductionEnv()
        ? {}
        : {
            ...(error.message ? { reason: error.message } : {}),
          },
    },
  });
}
