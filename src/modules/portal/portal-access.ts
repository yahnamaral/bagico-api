import { OrganizationRole } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const INTERNAL_PORTAL_ROLES = new Set<OrganizationRole>([
  OrganizationRole.SUPER_ADMIN,
  OrganizationRole.AGENCY_OWNER,
  OrganizationRole.AGENCY_MANAGER,
]);

export type PortalAccess = {
  fullAccess: boolean;
  clientIds: string[];
};

export async function resolvePortalAccess(
  organizationId: string,
  clerkUserId: string,
  memberRole: OrganizationRole,
): Promise<PortalAccess> {
  if (INTERNAL_PORTAL_ROLES.has(memberRole)) {
    return { fullAccess: true, clientIds: [] };
  }

  const memberships = await prisma.clientMember.findMany({
    where: {
      organizationId,
      clerkUserId,
      deletedAt: null,
    },
    select: { clientId: true },
  });

  return {
    fullAccess: false,
    clientIds: memberships.map((membership) => membership.clientId),
  };
}

export function assertClientAccessible(
  access: PortalAccess,
  clientId: string,
): boolean {
  if (access.fullAccess) {
    return true;
  }

  return access.clientIds.includes(clientId);
}
