import { OrganizationRole } from "@prisma/client";
import { clerkClient } from "../../infrastructure/auth/clerkAuth";
import { ensureClerkOrganizationMembership } from "../../infrastructure/auth/clerk-organization.service";
import { MailService } from "../../infrastructure/mail/mail.service";
import { notificationEvents } from "../notifications/notification-events.instance";
import {
  generateInviteToken,
  hashToken,
} from "../../infrastructure/security/token.service";
import { AppError } from "../../shared/errors/AppError";
import type { OrganizationInviteRepository } from "./organization-invite.repository";
import { sanitizeOrganizationInvite } from "./organization-invite.repository";
import type {
  AcceptOrganizationInviteBody,
  CreateOrganizationInviteBody,
  ListOrganizationInvitesQuery,
} from "./organization-invite.schemas";

const INVITE_EXPIRY_DAYS = 7;

const ALLOWED_INVITE_ROLES: OrganizationRole[] = [
  OrganizationRole.AGENCY_MANAGER,
  OrganizationRole.AGENCY_MAKER,
  OrganizationRole.FREELANCER,
];

function getInviteExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}

function buildInviteUrl(token: string): string {
  const baseUrl = process.env.APP_WEB_URL ?? "http://localhost:3000";
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return `${normalizedBase}/invite/accept?token=${encodeURIComponent(token)}`;
}

export class OrganizationInviteService {
  constructor(
    private readonly repository: OrganizationInviteRepository,
    private readonly mailService: MailService = new MailService(),
  ) {}

  private assertInviteRole(role: OrganizationRole) {
    if (!ALLOWED_INVITE_ROLES.includes(role)) {
      throw new AppError("Invalid invite role", 400, "INVALID_INVITE_ROLE");
    }
  }

  private async sendInviteEmail(input: {
    to: string;
    organizationName: string;
    role: OrganizationRole;
    inviteUrl: string;
    expiresAt: Date;
  }) {
    return this.mailService.sendOrganizationInviteEmail({
      to: input.to,
      organizationName: input.organizationName,
      role: input.role,
      inviteUrl: input.inviteUrl,
      expiresAt: input.expiresAt,
    });
  }

  async createInvite(
    organizationId: string,
    invitedByClerkUserId: string,
    body: CreateOrganizationInviteBody,
  ) {
    this.assertInviteRole(body.role);

    const organization = await this.repository.findOrganization(organizationId);

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    await this.repository.revokePendingInvitesForEmail(organizationId, body.email);

    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = getInviteExpiryDate();
    const inviteUrl = buildInviteUrl(token);

    const invite = await this.repository.createInvite({
      organizationId,
      email: body.email,
      role: body.role,
      tokenHash,
      invitedByClerkUserId,
      expiresAt,
    });

    let emailResult: { sent: boolean; warning?: string };

    try {
      emailResult = await notificationEvents.notifyMemberInvited({
        organizationId,
        organizationName: organization.name,
        email: body.email,
        role: body.role,
        actorClerkUserId: invitedByClerkUserId,
        inviteUrl,
        expiresAt,
      });
    } catch (error) {
      console.error("[OrganizationInviteService] notifyMemberInvited failed", error);
      throw error;
    }

    return {
      invite: sanitizeOrganizationInvite(invite),
      email: emailResult,
      ...(emailResult.sent ? {} : { dev: { inviteUrl } }),
    };
  }

  async listInvites(
    organizationId: string,
    query: ListOrganizationInvitesQuery,
  ) {
    const invites = await this.repository.listByOrganization(
      organizationId,
      query.status,
    );

    return invites.map(sanitizeOrganizationInvite);
  }

  async resendInvite(organizationId: string, inviteId: string) {
    const [organization, invite] = await Promise.all([
      this.repository.findOrganization(organizationId),
      this.repository.findById(organizationId, inviteId),
    ]);

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    if (!invite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    if (invite.status !== "PENDING") {
      throw new AppError(
        "Only pending invites can be resent",
        400,
        "INVITE_NOT_PENDING",
      );
    }

    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = getInviteExpiryDate();
    const inviteUrl = buildInviteUrl(token);

    const updatedInvite = await this.repository.updateInvite(
      organizationId,
      inviteId,
      {
        tokenHash,
        expiresAt,
        revokedAt: null,
        status: "PENDING",
      },
    );

    if (!updatedInvite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    const emailResult = await this.sendInviteEmail({
      to: invite.email,
      organizationName: organization.name,
      role: invite.role,
      inviteUrl,
      expiresAt,
    });

    return {
      invite: sanitizeOrganizationInvite(updatedInvite),
      email: emailResult,
      ...(emailResult.sent ? {} : { dev: { inviteUrl } }),
    };
  }

  async revokeInvite(organizationId: string, inviteId: string) {
    const invite = await this.repository.findById(organizationId, inviteId);

    if (!invite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    if (invite.status !== "PENDING") {
      throw new AppError(
        "Only pending invites can be revoked",
        400,
        "INVITE_NOT_PENDING",
      );
    }

    const updatedInvite = await this.repository.updateInvite(
      organizationId,
      inviteId,
      {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    );

    if (!updatedInvite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    return sanitizeOrganizationInvite(updatedInvite);
  }

  private async resolveInviteByToken(token: string) {
    const tokenHash = hashToken(token);
    const invite = await this.repository.findByTokenHash(tokenHash);

    if (!invite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    if (invite.status !== "PENDING") {
      throw new AppError("Invite is no longer valid", 410, "INVITE_INVALID");
    }

    if (invite.expiresAt <= new Date()) {
      await this.repository.markExpired(invite.organizationId, invite.id);
      throw new AppError("Invite has expired", 410, "INVITE_EXPIRED");
    }

    return invite;
  }

  async validateInvite(token: string) {
    const invite = await this.resolveInviteByToken(token);

    return {
      organizationName: invite.organization.name,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  }

  private async getClerkUserEmails(clerkUserId: string): Promise<string[]> {
    const user = await clerkClient.users.getUser(clerkUserId);

    return user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase());
  }

  async acceptInvite(clerkUserId: string, body: AcceptOrganizationInviteBody) {
    const invite = await this.resolveInviteByToken(body.token);

    const userEmails = await this.getClerkUserEmails(clerkUserId);

    if (!userEmails.includes(invite.email.toLowerCase())) {
      throw new AppError(
        "Authenticated user email does not match invite email",
        403,
        "INVITE_EMAIL_MISMATCH",
      );
    }

    const organization = await this.repository.findOrganization(
      invite.organizationId,
    );

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    let clerkMembership;

    try {
      clerkMembership = await ensureClerkOrganizationMembership(
        organization.clerkOrgId,
        clerkUserId,
      );
    } catch {
      throw new AppError(
        "Failed to sync organization membership with Clerk",
        502,
        "CLERK_ORG_SYNC_FAILED",
      );
    }

    const existingMember = await this.repository.findOrganizationMember(
      invite.organizationId,
      clerkUserId,
    );

    const isActiveMember =
      existingMember &&
      !existingMember.deletedAt &&
      existingMember.status === "ACTIVE";

    const shouldCreateMember = !existingMember;
    const shouldReactivateMember =
      !!existingMember &&
      (!!existingMember.deletedAt || existingMember.status === "REMOVED");

    const result = await this.repository.acceptInviteTransaction({
      inviteId: invite.id,
      organizationId: invite.organizationId,
      clerkUserId,
      email: invite.email,
      role: invite.role,
      shouldCreateMember,
      shouldReactivateMember: shouldReactivateMember && !isActiveMember,
    });

    return {
      organization: result.organization,
      member: result.member,
      invite: sanitizeOrganizationInvite(result.invite),
      clerkOrgId: organization.clerkOrgId,
      activeOrganization: {
        id: organization.id,
        clerkOrgId: organization.clerkOrgId,
        name: organization.name,
        slug: organization.slug,
      },
      clerkMembership,
      redirectTo: "/dashboard",
      ...(isActiveMember ? { alreadyMember: true } : {}),
    };
  }
}
