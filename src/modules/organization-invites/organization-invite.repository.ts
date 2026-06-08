import type { OrganizationRole, Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const invitePublicSelect = {
  id: true,
  organizationId: true,
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

export type OrganizationInvitePublic = Prisma.OrganizationInviteGetPayload<{
  select: typeof invitePublicSelect;
}>;

export class OrganizationInviteRepository {
  protected readonly db = prisma;

  findOrganization(organizationId: string) {
    return this.db.organization.findUnique({
      where: { id: organizationId },
    });
  }

  revokePendingInvitesForEmail(organizationId: string, email: string) {
    return this.db.organizationInvite.updateMany({
      where: {
        organizationId,
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
    email: string;
    role: OrganizationRole;
    tokenHash: string;
    invitedByClerkUserId: string;
    expiresAt: Date;
  }): Promise<OrganizationInvitePublic> {
    return this.db.organizationInvite.create({
      data: {
        ...data,
        status: "PENDING",
      },
      select: invitePublicSelect,
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.db.organizationInvite.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            clerkOrgId: true,
            plan: true,
          },
        },
      },
    });
  }

  findById(organizationId: string, inviteId: string) {
    return this.db.organizationInvite.findFirst({
      where: {
        id: inviteId,
        organizationId,
        deletedAt: null,
      },
      select: invitePublicSelect,
    });
  }

  listByOrganization(
    organizationId: string,
    status?: Prisma.OrganizationInviteWhereInput["status"],
  ) {
    return this.db.organizationInvite.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      select: invitePublicSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async updateInvite(
    organizationId: string,
    inviteId: string,
    data: Prisma.OrganizationInviteUpdateInput,
  ): Promise<OrganizationInvitePublic | null> {
    const result = await this.db.organizationInvite.updateMany({
      where: {
        id: inviteId,
        organizationId,
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, inviteId);
  }

  async markExpired(organizationId: string, inviteId: string) {
    return this.updateInvite(organizationId, inviteId, { status: "EXPIRED" });
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
    clerkUserId: string;
    email: string;
    role: OrganizationRole;
    shouldCreateMember: boolean;
    shouldReactivateMember: boolean;
  }) {
    return this.db.$transaction(async (tx) => {
      let member;

      if (input.shouldCreateMember) {
        member = await tx.organizationMember.create({
          data: {
            organizationId: input.organizationId,
            clerkUserId: input.clerkUserId,
            role: input.role,
            invitedEmail: input.email,
            status: "ACTIVE",
          },
        });
      } else if (input.shouldReactivateMember) {
        member = await tx.organizationMember.update({
          where: {
            organizationId_clerkUserId: {
              organizationId: input.organizationId,
              clerkUserId: input.clerkUserId,
            },
          },
          data: {
            deletedAt: null,
            status: "ACTIVE",
            role: input.role,
            invitedEmail: input.email,
          },
        });
      } else {
        member = await tx.organizationMember.findUnique({
          where: {
            organizationId_clerkUserId: {
              organizationId: input.organizationId,
              clerkUserId: input.clerkUserId,
            },
          },
        });
      }

      const inviteUpdate = await tx.organizationInvite.updateMany({
        where: {
          id: input.inviteId,
          organizationId: input.organizationId,
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

      const invite = await tx.organizationInvite.findFirst({
        where: {
          id: input.inviteId,
          organizationId: input.organizationId,
        },
        select: invitePublicSelect,
      });

      const organization = await tx.organization.findUnique({
        where: { id: input.organizationId },
      });

      if (!invite) {
        throw new Error("Invite not found after accept transaction");
      }

      return {
        invite,
        organization,
        member,
      };
    });
  }
}

export function sanitizeOrganizationInvite(invite: OrganizationInvitePublic) {
  return invite;
}
