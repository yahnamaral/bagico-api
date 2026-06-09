import type { ClientPortalRole, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const invitePublicSelect = {
  id: true,
  organizationId: true,
  clientId: true,
  email: true,
  role: true,
  invitedByClerkUserId: true,
  acceptedByClerkUserId: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PortalInvitePublic = Prisma.ClientPortalInviteGetPayload<{
  select: typeof invitePublicSelect;
}>;

export class PortalInviteRepository {
  protected readonly db = prisma;

  findClient(organizationId: string, clientId: string) {
    return this.db.client.findFirst({
      where: {
        id: clientId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  findOrganization(organizationId: string) {
    return this.db.organization.findUnique({
      where: { id: organizationId },
    });
  }

  revokePendingInvitesForEmail(
    organizationId: string,
    clientId: string,
    email: string,
  ) {
    return this.db.clientPortalInvite.updateMany({
      where: {
        organizationId,
        clientId,
        email,
        status: "PENDING",
        deletedAt: null,
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });
  }

  createInvite(data: {
    organizationId: string;
    clientId: string;
    email: string;
    role: ClientPortalRole;
    tokenHash: string;
    invitedByClerkUserId: string;
    expiresAt: Date;
  }): Promise<PortalInvitePublic> {
    return this.db.clientPortalInvite.create({
      data: {
        ...data,
        status: "PENDING",
      },
      select: invitePublicSelect,
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.db.clientPortalInvite.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, clerkOrgId: true, plan: true },
        },
        client: {
          select: { id: true, name: true, segment: true, status: true },
        },
      },
    });
  }

  findById(organizationId: string, clientId: string, inviteId: string) {
    return this.db.clientPortalInvite.findFirst({
      where: {
        id: inviteId,
        organizationId,
        clientId,
        deletedAt: null,
      },
      select: invitePublicSelect,
    });
  }

  listByClient(organizationId: string, clientId: string) {
    return this.db.clientPortalInvite.findMany({
      where: {
        organizationId,
        clientId,
        deletedAt: null,
      },
      select: invitePublicSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async updateInvite(
    organizationId: string,
    clientId: string,
    inviteId: string,
    data: Prisma.ClientPortalInviteUpdateInput,
  ): Promise<PortalInvitePublic | null> {
    const result = await this.db.clientPortalInvite.updateMany({
      where: {
        id: inviteId,
        organizationId,
        clientId,
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, clientId, inviteId);
  }

  async markExpired(
    organizationId: string,
    clientId: string,
    inviteId: string,
  ) {
    return this.updateInvite(organizationId, clientId, inviteId, {
      status: "EXPIRED",
    });
  }

  findClientMember(
    organizationId: string,
    clientId: string,
    clerkUserId: string,
  ) {
    return this.db.clientMember.findFirst({
      where: {
        organizationId,
        clientId,
        clerkUserId,
        deletedAt: null,
      },
    });
  }

  findOrganizationMember(organizationId: string, clerkUserId: string) {
    return this.db.organizationMember.findUnique({
      where: {
        organizationId_clerkUserId: {
          organizationId,
          clerkUserId,
        },
      },
    });
  }

  acceptInviteTransaction(input: {
    inviteId: string;
    organizationId: string;
    clientId: string;
    clerkUserId: string;
    role: ClientPortalRole;
    organizationRole: Prisma.OrganizationMemberCreateInput["role"];
    shouldCreateOrgMember: boolean;
    shouldReactivateOrgMember: boolean;
  }) {
    return this.db.$transaction(async (tx) => {
      if (input.shouldCreateOrgMember) {
        await tx.organizationMember.create({
          data: {
            organizationId: input.organizationId,
            clerkUserId: input.clerkUserId,
            role: input.organizationRole,
            status: "ACTIVE",
          },
        });
      } else if (input.shouldReactivateOrgMember) {
        await tx.organizationMember.update({
          where: {
            organizationId_clerkUserId: {
              organizationId: input.organizationId,
              clerkUserId: input.clerkUserId,
            },
          },
          data: {
            deletedAt: null,
            status: "ACTIVE",
            role: input.organizationRole,
          },
        });
      }

      const existingMember = await tx.clientMember.findFirst({
        where: {
          organizationId: input.organizationId,
          clientId: input.clientId,
          clerkUserId: input.clerkUserId,
        },
      });

      let clientMember = existingMember;

      if (existingMember?.deletedAt) {
        clientMember = await tx.clientMember.update({
          where: { id: existingMember.id },
          data: {
            deletedAt: null,
            role: input.role,
          },
        });
      } else if (!existingMember) {
        clientMember = await tx.clientMember.create({
          data: {
            organizationId: input.organizationId,
            clientId: input.clientId,
            clerkUserId: input.clerkUserId,
            role: input.role,
          },
        });
      }

      const inviteUpdate = await tx.clientPortalInvite.updateMany({
        where: {
          id: input.inviteId,
          organizationId: input.organizationId,
          clientId: input.clientId,
          deletedAt: null,
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedByClerkUserId: input.clerkUserId,
        },
      });

      if (inviteUpdate.count === 0) {
        throw new Error("Invite not found during accept transaction");
      }

      const invite = await tx.clientPortalInvite.findFirst({
        where: {
          id: input.inviteId,
          organizationId: input.organizationId,
          clientId: input.clientId,
        },
        select: invitePublicSelect,
      });

      const organization = await tx.organization.findUnique({
        where: { id: input.organizationId },
      });

      const client = await tx.client.findFirst({
        where: {
          id: input.clientId,
          organizationId: input.organizationId,
          deletedAt: null,
        },
      });

      const member = await tx.organizationMember.findUnique({
        where: {
          organizationId_clerkUserId: {
            organizationId: input.organizationId,
            clerkUserId: input.clerkUserId,
          },
        },
      });

      if (!invite) {
        throw new Error("Invite not found after accept transaction");
      }

      return {
        invite,
        organization,
        client,
        member,
        clientMember,
      };
    });
  }
}

export function sanitizeInvite(invite: PortalInvitePublic) {
  return invite;
}
