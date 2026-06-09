import type {
  ClientPortalRole,
  OrganizationRole,
} from "@prisma/client";
import { clerkClient } from "../../infrastructure/auth/clerkAuth";
import type { MailService } from "../../infrastructure/mail/mail.service";
import { buildAppUrl } from "./notification.helpers";

// TODO: NotificationPreferences — respeitar opt-out por tipo de evento no futuro.

export class NotificationEmailService {
  constructor(private readonly mailService: MailService) {}

  private async resolveRecipientEmail(
    clerkUserId: string,
  ): Promise<string | null> {
    try {
      const user = await clerkClient.users.getUser(clerkUserId);
      const primaryEmail =
        user.emailAddresses.find(
          (entry) => entry.id === user.primaryEmailAddressId,
        )?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;

      return primaryEmail?.toLowerCase() ?? null;
    } catch (error) {
      console.warn(
        `[NotificationEmailService] Could not resolve email for user ${clerkUserId}`,
        error,
      );
      return null;
    }
  }

  async sendGenericNotificationEmail(input: {
    recipientClerkUserId: string;
    subject: string;
    title: string;
    message: string;
    actionPath?: string;
    actionLabel?: string;
  }) {
    const to = await this.resolveRecipientEmail(input.recipientClerkUserId);

    if (!to) {
      return { sent: false, warning: "Recipient email not found" };
    }

    return this.mailService.sendGenericNotificationEmail({
      to,
      subject: input.subject,
      title: input.title,
      message: input.message,
      actionUrl: input.actionPath ? buildAppUrl(input.actionPath) : undefined,
      actionLabel: input.actionLabel,
    });
  }

  async sendDirectNotificationEmail(input: {
    to: string;
    subject: string;
    title: string;
    message: string;
    actionPath?: string;
    actionUrl?: string;
    actionLabel?: string;
  }) {
    return this.mailService.sendGenericNotificationEmail({
      to: input.to,
      subject: input.subject,
      title: input.title,
      message: input.message,
      actionUrl:
        input.actionUrl ??
        (input.actionPath ? buildAppUrl(input.actionPath) : undefined),
      actionLabel: input.actionLabel,
    });
  }

  async sendTaskApprovalRequestedEmail(input: {
    recipientClerkUserId: string;
    organizationName: string;
    taskTitle: string;
    taskId: string;
  }) {
    return this.sendGenericNotificationEmail({
      recipientClerkUserId: input.recipientClerkUserId,
      subject: `Aprovação solicitada — ${input.taskTitle}`,
      title: "Nova solicitação de aprovação",
      message: `A tarefa <strong>${input.taskTitle}</strong> em <strong>${input.organizationName}</strong> foi enviada para aprovação.`,
      actionPath: `/tasks/${input.taskId}`,
      actionLabel: "Ver tarefa",
    });
  }

  async sendTaskApprovedEmail(input: {
    recipientClerkUserId: string;
    organizationName: string;
    taskTitle: string;
    taskId: string;
  }) {
    return this.sendGenericNotificationEmail({
      recipientClerkUserId: input.recipientClerkUserId,
      subject: `Tarefa aprovada — ${input.taskTitle}`,
      title: "Tarefa aprovada",
      message: `A tarefa <strong>${input.taskTitle}</strong> em <strong>${input.organizationName}</strong> foi aprovada.`,
      actionPath: `/tasks/${input.taskId}`,
      actionLabel: "Ver tarefa",
    });
  }

  async sendTaskChangesRequestedEmail(input: {
    recipientClerkUserId: string;
    organizationName: string;
    taskTitle: string;
    taskId: string;
  }) {
    return this.sendGenericNotificationEmail({
      recipientClerkUserId: input.recipientClerkUserId,
      subject: `Ajustes solicitados — ${input.taskTitle}`,
      title: "Ajustes solicitados",
      message: `Foram solicitados ajustes na tarefa <strong>${input.taskTitle}</strong> em <strong>${input.organizationName}</strong>.`,
      actionPath: `/tasks/${input.taskId}`,
      actionLabel: "Ver tarefa",
    });
  }

  async sendMemberInvitedEmail(input: {
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

  async sendClientPortalInvitedEmail(input: {
    to: string;
    clientName: string;
    organizationName: string;
    invitedByName?: string;
    role: ClientPortalRole;
    inviteUrl: string;
    expiresAt: Date;
  }) {
    return this.mailService.sendClientPortalInviteEmail(input);
  }
}
