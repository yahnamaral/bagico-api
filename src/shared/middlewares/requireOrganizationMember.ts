import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../infrastructure/database/prisma";
import { AppError } from "../errors/AppError";

export async function requireOrganizationMember(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (!request.auth?.userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const clerkOrgId = request.auth.orgId;

  if (!clerkOrgId) {
    throw new AppError(
      "Organization context is required",
      400,
      "ORGANIZATION_REQUIRED",
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId },
  });

  if (!organization) {
    throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_clerkUserId: {
        organizationId: organization.id,
        clerkUserId: request.auth.userId,
      },
    },
  });

  if (
    !member ||
    member.deletedAt !== null ||
    member.status === "REMOVED"
  ) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  request.organization = organization;
  request.member = member;
}
