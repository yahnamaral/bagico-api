import type { Organization, OrganizationMember } from "../../../generated/prisma/client";
import { AppError } from "../../shared/errors/AppError";
import type { OrganizationRepository } from "./organization.repository";
import type { SyncOrganizationBody } from "./organization.schemas";

type SyncInput = {
  userId: string;
  authOrgId?: string | null;
  body: SyncOrganizationBody;
};

type CurrentInput = {
  userId: string;
  authOrgId?: string | null;
};

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async sync({
    userId,
    authOrgId,
    body,
  }: SyncInput): Promise<{
    organization: Organization;
    member: OrganizationMember;
  }> {
    const clerkOrgId = authOrgId ?? body.clerkOrgId;

    if (!clerkOrgId) {
      throw new AppError(
        "Organization context is required",
        400,
        "ORG_CONTEXT_REQUIRED",
      );
    }

    const existingOrganization =
      await this.repository.findByClerkOrgId(clerkOrgId);

    if (existingOrganization) {
      let member = await this.repository.findActiveMember(
        existingOrganization.id,
        userId,
      );

      if (!member) {
        const existingMember = await this.repository.findMember(
          existingOrganization.id,
          userId,
        );

        if (!existingMember) {
          member = await this.repository.createMember(
            existingOrganization.id,
            userId,
          );
        } else {
          member = existingMember;
        }
      }

      return { organization: existingOrganization, member };
    }

    return this.repository.createOrganizationWithMember(
      {
        clerkOrgId,
        name: body.name,
        slug: body.slug,
        personaMode: body.personaMode,
      },
      userId,
    );
  }

  async getCurrent({
    userId,
    authOrgId,
  }: CurrentInput): Promise<{
    organization: Organization;
    member: OrganizationMember;
  }> {
    if (!authOrgId) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    const organization = await this.repository.findByClerkOrgId(authOrgId);

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    const member = await this.repository.findActiveMember(
      organization.id,
      userId,
    );

    if (!member) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    return { organization, member };
  }
}
