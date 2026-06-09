import {
  ClientPortalRole,
  OrganizationRole,
} from "@prisma/client";
import { clerkClient } from "../../infrastructure/auth/clerkAuth";
import { MailService } from "../../infrastructure/mail/mail.service";
import { notificationEvents } from "../notifications/notification-events.instance";
import {
  generateInviteToken,
  hashToken,
} from "../../infrastructure/security/token.service";
import { AppError } from "../../shared/errors/AppError";
import type { PortalInviteRepository } from "./portal-invite.repository";
import { sanitizeInvite } from "./portal-invite.repository";
import type {
  AcceptInviteBody,
  CreatePortalInviteBody,
} from "./portal-invite.schemas";

const INVITE_EXPIRY_DAYS = 7;

function mapPortalRoleToOrganizationRole(
  role: ClientPortalRole,
): OrganizationRole {
  const roleMap: Record<ClientPortalRole, OrganizationRole> = {
    [ClientPortalRole.CLIENT_ADMIN]: OrganizationRole.CLIENT_ADMIN,
    [ClientPortalRole.CLIENT_MANAGER]: OrganizationRole.CLIENT_MANAGER,
    [ClientPortalRole.CLIENT_STAFF]: OrganizationRole.CLIENT_STAFF,
  };

  return roleMap[role];
}

function getInviteExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}

function buildInviteUrl(token: string): string {
  const baseUrl = process.env.APP_WEB_URL ?? "http://localhost:3000";
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return `${normalizedBase}/portal/invite/accept?token=${encodeURIComponent(token)}`;
}

export class PortalInviteService {
  constructor(
    private readonly repository: PortalInviteRepository,
    private readonly mailService: MailService = new MailService(),
  ) {}

  private async ensureClient(organizationId: string, clientId: string) {
    const client = await this.repository.findClient(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    return client;
  }

  private async getInvitedByName(clerkUserId: string): Promise<string | undefined> {
    try {
      const user = await clerkClient.users.getUser(clerkUserId);
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return fullName || undefined;
    } catch {
      return undefined;
    }
  }

  private async sendInviteEmail(input: {
    to: string;
    clientName: string;
    organizationName: string;
    invitedByClerkUserId: string;
    role: ClientPortalRole;
    inviteUrl: string;
    expiresAt: Date;
  }) {
    const invitedByName = await this.getInvitedByName(input.invitedByClerkUserId);

    return this.mailService.sendClientPortalInviteEmail({
      to: input.to,
      clientName: input.clientName,
      organizationName: input.organizationName,
      invitedByName,
      role: input.role,
      inviteUrl: input.inviteUrl,
      expiresAt: input.expiresAt,
    });
  }

  async createInvite(
    organizationId: string,
    clientId: string,
    invitedByClerkUserId: string,
    body: CreatePortalInviteBody,
  ) {
    const [client, organization] = await Promise.all([
      this.ensureClient(organizationId, clientId),
      this.repository.findOrganization(organizationId),
    ]);

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    await this.repository.revokePendingInvitesForEmail(
      organizationId,
      clientId,
      body.email,
    );

    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = getInviteExpiryDate();
    const inviteUrl = buildInviteUrl(token);

    const invite = await this.repository.createInvite({
      organizationId,
      clientId,
      email: body.email,
      role: body.role,
      tokenHash,
      invitedByClerkUserId,
      expiresAt,
    });

    const invitedByName = await this.getInvitedByName(invitedByClerkUserId);

    let emailResult: { sent: boolean; warning?: string };

    try {
      emailResult = await notificationEvents.notifyClientPortalInvited({
        organizationId,
        organizationName: organization.name,
        clientName: client.name,
        email: body.email,
        role: body.role,
        actorClerkUserId: invitedByClerkUserId,
        invitedByName,
        inviteUrl,
        expiresAt,
      });
    } catch (error) {
      console.error("[PortalInviteService] notifyClientPortalInvited failed", error);
      throw error;
    }

    return {
      invite: sanitizeInvite(invite),
      email: emailResult,
      ...(emailResult.sent ? {} : { inviteUrl }),
    };
  }

  async listInvites(organizationId: string, clientId: string) {
    await this.ensureClient(organizationId, clientId);

    const invites = await this.repository.listByClient(organizationId, clientId);

    return invites.map(sanitizeInvite);
  }

  async resendInvite(
    organizationId: string,
    clientId: string,
    inviteId: string,
  ) {
    const [client, organization, invite] = await Promise.all([
      this.ensureClient(organizationId, clientId),
      this.repository.findOrganization(organizationId),
      this.repository.findById(organizationId, clientId, inviteId),
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
      clientId,
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
      clientName: client.name,
      organizationName: organization.name,
      invitedByClerkUserId: invite.invitedByClerkUserId,
      role: invite.role,
      inviteUrl,
      expiresAt,
    });

    return {
      invite: sanitizeInvite(updatedInvite),
      email: emailResult,
      ...(emailResult.sent ? {} : { inviteUrl }),
    };
  }

  async revokeInvite(
    organizationId: string,
    clientId: string,
    inviteId: string,
  ) {
    await this.ensureClient(organizationId, clientId);

    const invite = await this.repository.findById(
      organizationId,
      clientId,
      inviteId,
    );

    if (!invite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    if (invite.status === "ACCEPTED") {
      throw new AppError(
        "Accepted invites cannot be revoked",
        400,
        "INVITE_ALREADY_ACCEPTED",
      );
    }

    const updatedInvite = await this.repository.updateInvite(
      organizationId,
      clientId,
      inviteId,
      {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    );

    if (!updatedInvite) {
      throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    return sanitizeInvite(updatedInvite);
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
      await this.repository.markExpired(
        invite.organizationId,
        invite.clientId,
        invite.id,
      );
      throw new AppError("Invite has expired", 410, "INVITE_EXPIRED");
    }

    return invite;
  }

  async validateInvite(token: string) {
    const invite = await this.resolveInviteByToken(token);

    return {
      organizationName: invite.organization.name,
      clientName: invite.client.name,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  }

  private async getClerkUserEmails(clerkUserId: string): Promise<string[]> {
    const user = await clerkClient.users.getUser(clerkUserId);

    return user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase());
  }

  async acceptInvite(clerkUserId: string, body: AcceptInviteBody) {
    const invite = await this.resolveInviteByToken(body.token);

    const userEmails = await this.getClerkUserEmails(clerkUserId);

    if (!userEmails.includes(invite.email.toLowerCase())) {
      throw new AppError(
        "Authenticated user email does not match invite email",
        403,
        "INVITE_EMAIL_MISMATCH",
      );
    }

    const existingOrgMember = await this.repository.findOrganizationMember(
      invite.organizationId,
      clerkUserId,
    );

    const organizationRole = mapPortalRoleToOrganizationRole(invite.role);
    const isActiveOrgMember =
      existingOrgMember &&
      !existingOrgMember.deletedAt &&
      existingOrgMember.status === "ACTIVE";
    const shouldCreateOrgMember = !existingOrgMember;
    const shouldReactivateOrgMember =
      !!existingOrgMember &&
      (!!existingOrgMember.deletedAt ||
        existingOrgMember.status === "REMOVED") &&
      !isActiveOrgMember;

    const result = await this.repository.acceptInviteTransaction({
      inviteId: invite.id,
      organizationId: invite.organizationId,
      clientId: invite.clientId,
      clerkUserId,
      role: invite.role,
      organizationRole,
      shouldCreateOrgMember,
      shouldReactivateOrgMember,
    });

    return {
      organization: result.organization,
      client: result.client,
      member: result.member,
      clientMember: result.clientMember,
      invite: sanitizeInvite(result.invite),
      redirectTo: "/portal",
    };
  }
}
