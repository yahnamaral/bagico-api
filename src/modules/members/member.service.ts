import { OrganizationRole } from "@prisma/client";
import { clerkClient } from "../../infrastructure/auth/clerkAuth";
import { AppError } from "../../shared/errors/AppError";
import type { MemberRepository } from "./member.repository";
import type { ListMembersQuery, UpdateMemberRoleBody } from "./member.schemas";

const PROTECTED_ROLES: OrganizationRole[] = [
  OrganizationRole.SUPER_ADMIN,
  OrganizationRole.AGENCY_OWNER,
];

const CLIENT_ROLES: OrganizationRole[] = [
  OrganizationRole.CLIENT_ADMIN,
  OrganizationRole.CLIENT_MANAGER,
  OrganizationRole.CLIENT_STAFF,
];

const ALLOWED_INTERNAL_ROLES: OrganizationRole[] = [
  OrganizationRole.AGENCY_MANAGER,
  OrganizationRole.AGENCY_MAKER,
  OrganizationRole.FREELANCER,
];

type ClerkUserSummary = {
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

export class MemberService {
  constructor(private readonly repository: MemberRepository) {}

  private async enrichWithClerkUser(
    clerkUserId: string,
  ): Promise<ClerkUserSummary | null> {
    try {
      const user = await clerkClient.users.getUser(clerkUserId);
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
      const primaryEmail =
        user.emailAddresses.find(
          (entry) => entry.id === user.primaryEmailAddressId,
        )?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;

      return {
        name,
        email: primaryEmail,
        imageUrl: user.imageUrl,
      };
    } catch {
      return null;
    }
  }

  async list(organizationId: string, query: ListMembersQuery) {
    const [members, total] = await this.repository.list(organizationId, {
      page: query.page,
      limit: query.limit,
      role: query.role,
      search: query.search,
    });

    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const clerkUser = await this.enrichWithClerkUser(member.clerkUserId);

        return {
          ...member,
          clerkUser: clerkUser ?? undefined,
        };
      }),
    );

    return {
      data: enrichedMembers,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private assertRoleIsAssignable(role: OrganizationRole) {
    if (
      PROTECTED_ROLES.includes(role) ||
      CLIENT_ROLES.includes(role) ||
      !ALLOWED_INTERNAL_ROLES.includes(role)
    ) {
      throw new AppError("Invalid role", 400, "INVALID_ROLE");
    }
  }

  async updateRole(
    organizationId: string,
    actorClerkUserId: string,
    memberId: string,
    body: UpdateMemberRoleBody,
  ) {
    const member = await this.repository.findById(organizationId, memberId);

    if (!member) {
      throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND");
    }

    if (member.clerkUserId === actorClerkUserId) {
      throw new AppError(
        "You cannot change your own role",
        400,
        "CANNOT_CHANGE_OWN_ROLE",
      );
    }

    if (member.role === OrganizationRole.AGENCY_OWNER) {
      throw new AppError(
        "Agency owner role cannot be changed",
        400,
        "CANNOT_CHANGE_OWNER_ROLE",
      );
    }

    this.assertRoleIsAssignable(body.role);

    const updated = await this.repository.updateRole(
      organizationId,
      memberId,
      body.role,
    );

    if (!updated) {
      throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND");
    }

    return updated;
  }

  async remove(
    organizationId: string,
    actorClerkUserId: string,
    memberId: string,
  ) {
    const member = await this.repository.findById(organizationId, memberId);

    if (!member) {
      throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND");
    }

    if (member.clerkUserId === actorClerkUserId) {
      throw new AppError(
        "You cannot remove yourself",
        400,
        "CANNOT_REMOVE_SELF",
      );
    }

    if (member.role === OrganizationRole.AGENCY_OWNER) {
      throw new AppError(
        "Agency owner cannot be removed",
        400,
        "CANNOT_REMOVE_OWNER",
      );
    }

    const updated = await this.repository.softRemove(
      organizationId,
      memberId,
      "REMOVED",
    );

    if (!updated) {
      throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND");
    }

    return { success: true };
  }
}
