import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError";
import type { Permission } from "../permissions/permissions";
import { roleHasPermission } from "../permissions/permissions";

export function requirePermission(permission: Permission) {
  return async function requirePermissionHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.member) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (!roleHasPermission(request.member.role, permission)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  };
}
