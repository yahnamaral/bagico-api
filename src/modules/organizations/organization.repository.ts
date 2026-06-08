import type { Organization, OrganizationMember, PersonaMode } from "../../../generated/prisma/client";
import { OrganizationRole } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

export type CreateOrganizationInput = {
  clerkOrgId: string;
  name: string;
  slug: string;
  personaMode: PersonaMode;
};

export class OrganizationRepository {
  protected readonly db = prisma;

  findByClerkOrgId(clerkOrgId: string): Promise<Organization | null> {
    return this.db.organization.findUnique({
      where: { clerkOrgId },
    });
  }

  findMember(
    organizationId: string,
    clerkUserId: string,
  ): Promise<OrganizationMember | null> {
    return this.db.organizationMember.findUnique({
      where: {
        organizationId_clerkUserId: {
          organizationId,
          clerkUserId,
        },
      },
    });
  }

  findActiveMember(
    organizationId: string,
    clerkUserId: string,
  ): Promise<OrganizationMember | null> {
    return this.db.organizationMember.findFirst({
      where: {
        organizationId,
        clerkUserId,
        deletedAt: null,
        status: { not: "REMOVED" },
      },
    });
  }

  createOrganization(data: CreateOrganizationInput): Promise<Organization> {
    return this.db.organization.create({ data });
  }

  createMember(
    organizationId: string,
    clerkUserId: string,
  ): Promise<OrganizationMember> {
    return this.db.organizationMember.create({
      data: {
        organizationId,
        clerkUserId,
        role: OrganizationRole.AGENCY_OWNER,
        status: "ACTIVE",
      },
    });
  }

  createMemberWithRole(
    organizationId: string,
    clerkUserId: string,
    role: OrganizationRole,
  ): Promise<OrganizationMember> {
    return this.db.organizationMember.create({
      data: {
        organizationId,
        clerkUserId,
        role,
        status: "ACTIVE",
      },
    });
  }

  createOrganizationWithMember(
    data: CreateOrganizationInput,
    clerkUserId: string,
  ): Promise<{ organization: Organization; member: OrganizationMember }> {
    return this.db.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          clerkUserId,
          role: OrganizationRole.AGENCY_OWNER,
          status: "ACTIVE",
        },
      });

      return { organization, member };
    });
  }
}
