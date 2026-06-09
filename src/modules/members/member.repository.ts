import type {
  OrganizationMemberStatus,
  OrganizationRole,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const memberPublicSelect = {
  id: true,
  organizationId: true,
  clerkUserId: true,
  invitedEmail: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type MemberPublic = Prisma.OrganizationMemberGetPayload<{
  select: typeof memberPublicSelect;
}>;

export class MemberRepository {
  protected readonly db = prisma;

  list(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      role?: OrganizationRole;
      search?: string;
    },
  ) {
    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.role ? { role: options.role } : {}),
      ...(options.search
        ? {
            OR: [
              { clerkUserId: { contains: options.search, mode: "insensitive" } },
              { invitedEmail: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (options.page - 1) * options.limit;

    return Promise.all([
      this.db.organizationMember.findMany({
        where,
        select: memberPublicSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: options.limit,
      }),
      this.db.organizationMember.count({ where }),
    ]);
  }

  findById(organizationId: string, memberId: string) {
    return this.db.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
        deletedAt: null,
      },
      select: memberPublicSelect,
    });
  }

  async updateRole(
    organizationId: string,
    memberId: string,
    role: OrganizationRole,
  ): Promise<MemberPublic | null> {
    const result = await this.db.organizationMember.updateMany({
      where: {
        id: memberId,
        organizationId,
        deletedAt: null,
      },
      data: { role },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, memberId);
  }

  async softRemove(
    organizationId: string,
    memberId: string,
    status: OrganizationMemberStatus,
  ): Promise<MemberPublic | null> {
    const result = await this.db.organizationMember.updateMany({
      where: {
        id: memberId,
        organizationId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        status,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, memberId);
  }
}
