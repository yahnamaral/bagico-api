import type { FastifyReply, FastifyRequest } from "fastify";
import type { OrganizationRole } from "../permissions/roles";
import { AppError } from "../errors/AppError";

export function requireRole(roles: OrganizationRole[]) {
  return async function requireRoleHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.member) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (!roles.includes(request.member.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  };
}
