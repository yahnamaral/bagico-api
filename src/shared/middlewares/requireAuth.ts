import { verifyToken } from "@clerk/backend";
import { TokenVerificationError } from "@clerk/backend/errors";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError";

const BEARER_PREFIX = "Bearer ";

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = authorization.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    throw new AppError("Missing or invalid authorization token", 401, "UNAUTHORIZED");
  }

  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    request.log.error("CLERK_SECRET_KEY is not configured");
    throw new AppError("Internal server error", 500);
  }

  try {
    const payload = await verifyToken(token, { secretKey });

    const orgPayload = payload.o as { id?: string } | undefined;

    request.auth = {
      userId: payload.sub,
      sessionId: payload.sid ?? null,
      orgId: payload.org_id ?? orgPayload?.id ?? null,
    };
  } catch (error) {
    if (error instanceof TokenVerificationError) {
      throw new AppError("Invalid authorization token", 401, "UNAUTHORIZED");
    }

    request.log.error(error);
    throw new AppError("Internal server error", 500);
  }
}
