import {
  NotificationEntityType,
  NotificationType,
  OrganizationRole,
  type ClientPortalRole,
} from "@prisma/client";
import type { CreateNotificationData } from "./notification.repository";
import type { NotificationEmailService } from "./notification-email.service";
import {
  buildTaskHref,
  uniqueRecipients,
} from "./notification.helpers";
import type { NotificationRepository } from "./notification.repository";
import type { NotificationService } from "./notification.service";

const MANAGEMENT_ROLES: OrganizationRole[] = [
  OrganizationRole.AGENCY_OWNER,
  OrganizationRole.AGENCY_MANAGER,
];

export type TaskNotificationContext = {
  id: string;
  title: string;
  organizationId: string;
  assignedToClerkUserId?: string | null;
  createdByClerkUserId: string;
};

export type CommentNotificationContext = {
  id: string;
};

export type FileNotificationContext = {
  id: string;
  fileName: string;
};

export class NotificationEventsService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: NotificationEmailService,
    private readonly repository: NotificationRepository,
  ) {}

  private async getOrganizationName(organizationId: string) {
    const organization = await this.repository.findOrganization(organizationId);
    return organization?.name ?? "sua organização";
  }

  private async getManagementRecipientIds(organizationId: string) {
    const members = await this.repository.findMemberClerkUserIdsByRoles(
      organizationId,
      MANAGEMENT_ROLES,
    );

    return members.map((member) => member.clerkUserId);
  }

  private async dispatchInternalNotifications(
    notifications: CreateNotificationData[],
  ) {
    if (notifications.length === 0) {
      return;
    }

    await this.notificationService.createManyNotifications(notifications);
  }

  private async dispatchCriticalEmails(
    type: NotificationType,
    organizationName: string,
    task: TaskNotificationContext,
    recipientClerkUserIds: string[],
  ) {
    await Promise.all(
      recipientClerkUserIds.map(async (recipientClerkUserId) => {
        try {
          switch (type) {
            case NotificationType.TASK_APPROVAL_REQUESTED:
              await this.emailService.sendTaskApprovalRequestedEmail({
                recipientClerkUserId,
                organizationName,
                taskTitle: task.title,
                taskId: task.id,
              });
              break;
            case NotificationType.TASK_APPROVED:
              await this.emailService.sendTaskApprovedEmail({
                recipientClerkUserId,
                organizationName,
                taskTitle: task.title,
                taskId: task.id,
              });
              break;
            case NotificationType.TASK_CHANGES_REQUESTED:
              await this.emailService.sendTaskChangesRequestedEmail({
                recipientClerkUserId,
                organizationName,
                taskTitle: task.title,
                taskId: task.id,
              });
              break;
          }
        } catch (error) {
          console.warn(
            `[NotificationEventsService] Failed to send ${type} email to ${recipientClerkUserId}`,
            error,
          );
        }
      }),
    );
  }

  async notifyTaskAssigned(input: {
    organizationId: string;
    task: TaskNotificationContext;
    assignedToClerkUserId: string;
    actorClerkUserId?: string | null;
  }) {
    const recipientClerkUserId = input.assignedToClerkUserId;

    if (!recipientClerkUserId || recipientClerkUserId === input.actorClerkUserId) {
      return;
    }

    await this.notificationService.createNotification({
      organizationId: input.organizationId,
      recipientClerkUserId,
      actorClerkUserId: input.actorClerkUserId,
      type: NotificationType.TASK_ASSIGNED,
      title: "Nova tarefa atribuída",
      message: `Você foi atribuído à tarefa "${input.task.title}".`,
      href: buildTaskHref(input.task.id),
      entityType: NotificationEntityType.TASK,
      entityId: input.task.id,
    });
  }

  async notifyTaskCommentCreated(input: {
    organizationId: string;
    task: TaskNotificationContext;
    comment: CommentNotificationContext;
    actorClerkUserId: string;
  }) {
    const recipients = uniqueRecipients(
      [
        input.task.assignedToClerkUserId,
        input.task.createdByClerkUserId,
      ],
      input.actorClerkUserId,
    );

    await this.dispatchInternalNotifications(
      recipients.map((recipientClerkUserId) => ({
        organizationId: input.organizationId,
        recipientClerkUserId,
        actorClerkUserId: input.actorClerkUserId,
        type: NotificationType.TASK_COMMENT_CREATED,
        title: "Novo comentário na tarefa",
        message: `Um comentário foi adicionado em "${input.task.title}".`,
        href: buildTaskHref(input.task.id),
        entityType: NotificationEntityType.COMMENT,
        entityId: input.comment.id,
        metadata: { taskId: input.task.id },
      })),
    );
  }

  async notifyTaskFileUploaded(input: {
    organizationId: string;
    task: TaskNotificationContext;
    file: FileNotificationContext;
    actorClerkUserId: string;
  }) {
    const recipients = uniqueRecipients(
      [
        input.task.assignedToClerkUserId,
        input.task.createdByClerkUserId,
      ],
      input.actorClerkUserId,
    );

    await this.dispatchInternalNotifications(
      recipients.map((recipientClerkUserId) => ({
        organizationId: input.organizationId,
        recipientClerkUserId,
        actorClerkUserId: input.actorClerkUserId,
        type: NotificationType.TASK_FILE_UPLOADED,
        title: "Novo arquivo na tarefa",
        message: `O arquivo "${input.file.fileName}" foi enviado em "${input.task.title}".`,
        href: buildTaskHref(input.task.id),
        entityType: NotificationEntityType.FILE,
        entityId: input.file.id,
        metadata: { taskId: input.task.id },
      })),
    );
  }

  async notifyApprovalRequested(input: {
    organizationId: string;
    task: TaskNotificationContext;
    actorClerkUserId: string;
    recipients?: string[];
  }) {
    const organizationName = await this.getOrganizationName(input.organizationId);
    const recipients =
      input.recipients ??
      uniqueRecipients(
        await this.getManagementRecipientIds(input.organizationId),
        input.actorClerkUserId,
      );

    await this.dispatchInternalNotifications(
      recipients.map((recipientClerkUserId) => ({
        organizationId: input.organizationId,
        recipientClerkUserId,
        actorClerkUserId: input.actorClerkUserId,
        type: NotificationType.TASK_APPROVAL_REQUESTED,
        title: "Aprovação solicitada",
        message: `A tarefa "${input.task.title}" foi enviada para aprovação.`,
        href: buildTaskHref(input.task.id),
        entityType: NotificationEntityType.TASK,
        entityId: input.task.id,
      })),
    );

    await this.dispatchCriticalEmails(
      NotificationType.TASK_APPROVAL_REQUESTED,
      organizationName,
      input.task,
      recipients,
    );
  }

  async notifyTaskApproved(input: {
    organizationId: string;
    task: TaskNotificationContext;
    actorClerkUserId: string;
    recipients?: string[];
  }) {
    const organizationName = await this.getOrganizationName(input.organizationId);
    const managementIds = await this.getManagementRecipientIds(input.organizationId);
    const recipients =
      input.recipients ??
      uniqueRecipients(
        [
          input.task.createdByClerkUserId,
          input.task.assignedToClerkUserId,
          ...managementIds,
        ],
        input.actorClerkUserId,
      );

    await this.dispatchInternalNotifications(
      recipients.map((recipientClerkUserId) => ({
        organizationId: input.organizationId,
        recipientClerkUserId,
        actorClerkUserId: input.actorClerkUserId,
        type: NotificationType.TASK_APPROVED,
        title: "Tarefa aprovada",
        message: `A tarefa "${input.task.title}" foi aprovada.`,
        href: buildTaskHref(input.task.id),
        entityType: NotificationEntityType.TASK,
        entityId: input.task.id,
      })),
    );

    await this.dispatchCriticalEmails(
      NotificationType.TASK_APPROVED,
      organizationName,
      input.task,
      recipients,
    );
  }

  async notifyChangesRequested(input: {
    organizationId: string;
    task: TaskNotificationContext;
    actorClerkUserId: string;
    recipients?: string[];
  }) {
    const organizationName = await this.getOrganizationName(input.organizationId);
    const managementIds = await this.getManagementRecipientIds(input.organizationId);
    const recipients =
      input.recipients ??
      uniqueRecipients(
        [
          input.task.createdByClerkUserId,
          input.task.assignedToClerkUserId,
          ...managementIds,
        ],
        input.actorClerkUserId,
      );

    await this.dispatchInternalNotifications(
      recipients.map((recipientClerkUserId) => ({
        organizationId: input.organizationId,
        recipientClerkUserId,
        actorClerkUserId: input.actorClerkUserId,
        type: NotificationType.TASK_CHANGES_REQUESTED,
        title: "Ajustes solicitados",
        message: `Foram solicitados ajustes na tarefa "${input.task.title}".`,
        href: buildTaskHref(input.task.id),
        entityType: NotificationEntityType.TASK,
        entityId: input.task.id,
      })),
    );

    await this.dispatchCriticalEmails(
      NotificationType.TASK_CHANGES_REQUESTED,
      organizationName,
      input.task,
      recipients,
    );
  }

  async notifyPortalCommentCreated(input: {
    organizationId: string;
    task: TaskNotificationContext;
    comment: CommentNotificationContext;
    actorClerkUserId: string;
    recipients?: string[];
  }) {
    const managementIds = await this.getManagementRecipientIds(input.organizationId);
    const recipients =
      input.recipients ??
      uniqueRecipients(
        [
          input.task.assignedToClerkUserId,
          input.task.createdByClerkUserId,
          ...managementIds,
        ],
        input.actorClerkUserId,
      );

    await this.dispatchInternalNotifications(
      recipients.map((recipientClerkUserId) => ({
        organizationId: input.organizationId,
        recipientClerkUserId,
        actorClerkUserId: input.actorClerkUserId,
        type: NotificationType.PORTAL_COMMENT_CREATED,
        title: "Novo comentário no portal",
        message: `Um cliente comentou na tarefa "${input.task.title}".`,
        href: buildTaskHref(input.task.id),
        entityType: NotificationEntityType.COMMENT,
        entityId: input.comment.id,
        metadata: { taskId: input.task.id },
      })),
    );
  }

  async notifyMemberInvited(input: {
    organizationId: string;
    organizationName: string;
    email: string;
    role: OrganizationRole;
    actorClerkUserId: string;
    inviteUrl: string;
    expiresAt: Date;
  }) {
    // TODO: NotificationPreferences — notificação interna exige recipientClerkUserId.
    return this.emailService.sendMemberInvitedEmail({
      to: input.email,
      organizationName: input.organizationName,
      role: input.role,
      inviteUrl: input.inviteUrl,
      expiresAt: input.expiresAt,
    });
  }

  async notifyClientPortalInvited(input: {
    organizationId: string;
    organizationName: string;
    clientName: string;
    email: string;
    role: ClientPortalRole;
    actorClerkUserId: string;
    invitedByName?: string;
    inviteUrl: string;
    expiresAt: Date;
  }) {
    // TODO: NotificationPreferences — notificação interna exige recipientClerkUserId.
    return this.emailService.sendClientPortalInvitedEmail({
      to: input.email,
      clientName: input.clientName,
      organizationName: input.organizationName,
      invitedByName: input.invitedByName,
      role: input.role,
      inviteUrl: input.inviteUrl,
      expiresAt: input.expiresAt,
    });
  }
}
