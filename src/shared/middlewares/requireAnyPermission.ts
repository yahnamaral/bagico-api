import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError";
import type { Permission } from "../permissions/permissions";
import { roleHasPermission } from "../permissions/permissions";

export function requireAnyPermission(permissions: Permission[]) {
  return async function requireAnyPermissionHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.member) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const allowed = permissions.some((permission) =>
      roleHasPermission(request.member!.role, permission),
    );

    if (!allowed) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  };
}
