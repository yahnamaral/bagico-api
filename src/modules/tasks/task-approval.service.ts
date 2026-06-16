import {
  OrganizationRole,
  TaskApprovalStatus,
  TaskApproverKind,
  TaskCommentType,
  TaskStatus,
} from "@prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { fireNotification } from "../notifications/notification.helpers";
import { notificationEvents } from "../notifications/notification-events.instance";
import { TASK_ACTIVITY_TYPES } from "./task-activity.constants";
import type { TaskActivityService } from "./task-activity.service";
import type { TaskApprovalRepository } from "./task-approval.repository";
import {
  moveTaskToColumnByName,
  tryMoveTaskToColumnByName,
} from "./task-column.helper";
import type { TaskDetailWithCounts, TaskRepository } from "./task.repository";
import type {
  ApproveTaskBody,
  RequestApprovalBody,
  RequestChangesBody,
} from "./task.schemas";

const OWNER_ROLES: readonly OrganizationRole[] = [
  OrganizationRole.AGENCY_OWNER,
  OrganizationRole.SUPER_ADMIN,
];

export class TaskApprovalService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly approvalRepository: TaskApprovalRepository,
    private readonly activityService: TaskActivityService,
  ) {}

  private async getTaskOrThrow(
    organizationId: string,
    taskId: string,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.taskRepository.findByIdWithCounts(
      organizationId,
      taskId,
    );

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    return task;
  }

  private async getTaskResponse(
    organizationId: string,
    taskId: string,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.taskRepository.findByIdWithCounts(
      organizationId,
      taskId,
    );

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    return task;
  }

  private async resolveResponsibleApprover(
    organizationId: string,
    task: TaskDetailWithCounts,
    body: RequestApprovalBody,
  ): Promise<{
    responsibleApproverClerkUserId: string | null;
    responsibleApproverKind: TaskApproverKind | null;
  }> {
    if (!body.approverClerkUserId) {
      return {
        responsibleApproverClerkUserId: null,
        responsibleApproverKind: null,
      };
    }

    const kind = body.approverKind as TaskApproverKind | undefined;

    if (!kind) {
      throw new AppError(
        "approverKind is required when approverClerkUserId is provided",
        400,
        "APPROVER_KIND_REQUIRED",
      );
    }

    if (kind === TaskApproverKind.INTERNAL) {
      const member = await this.approvalRepository.findActiveOrganizationMember(
        organizationId,
        body.approverClerkUserId,
      );

      if (!member) {
        throw new AppError(
          "Approver is not an active member of the organization",
          422,
          "APPROVER_NOT_ORGANIZATION_MEMBER",
        );
      }
    } else {
      const clientMember = await this.approvalRepository.findActiveClientMember(
        organizationId,
        task.clientId,
        body.approverClerkUserId,
      );

      if (!clientMember) {
        throw new AppError(
          "Approver is not a portal member of the task's client",
          422,
          "APPROVER_NOT_CLIENT_MEMBER",
        );
      }
    }

    return {
      responsibleApproverClerkUserId: body.approverClerkUserId,
      responsibleApproverKind: kind,
    };
  }

  async requestApproval(
    organizationId: string,
    taskId: string,
    userId: string,
    body: RequestApprovalBody,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.getTaskOrThrow(organizationId, taskId);
    const now = new Date();

    const responsibleApprover = await this.resolveResponsibleApprover(
      organizationId,
      task,
      body,
    );

    await moveTaskToColumnByName({
      taskId,
      organizationId,
      boardId: task.boardId,
      columnName: "Aprovação",
    });

    const updateResult = await this.approvalRepository.updateApprovalFields(
      organizationId,
      taskId,
      {
        approvalStatus: TaskApprovalStatus.PENDING,
        approvalRequestedAt: now,
        approvalRequestedByClerkUserId: userId,
        responsibleApproverClerkUserId:
          responsibleApprover.responsibleApproverClerkUserId,
        responsibleApproverKind: responsibleApprover.responsibleApproverKind,
        status: TaskStatus.IN_REVIEW,
      },
    );

    if (updateResult.count === 0) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    if (body.message) {
      await this.approvalRepository.createTypedComment(
        organizationId,
        taskId,
        userId,
        body.message,
        TaskCommentType.APPROVAL,
      );
    }

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.APPROVAL_REQUESTED,
      "Approval requested",
      {
        clerkUserId: userId,
        metadata: { message: body.message ?? null },
      },
    );

    const directRecipients =
      responsibleApprover.responsibleApproverKind === TaskApproverKind.INTERNAL &&
      responsibleApprover.responsibleApproverClerkUserId &&
      responsibleApprover.responsibleApproverClerkUserId !== userId
        ? [responsibleApprover.responsibleApproverClerkUserId]
        : undefined;

    fireNotification(() =>
      notificationEvents.notifyApprovalRequested({
        organizationId,
        task,
        actorClerkUserId: userId,
        ...(directRecipients ? { recipients: directRecipients } : {}),
      }),
    );

    return this.getTaskResponse(organizationId, taskId);
  }

  async approve(
    organizationId: string,
    taskId: string,
    userId: string,
    role: OrganizationRole,
    body: ApproveTaskBody,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.getTaskOrThrow(organizationId, taskId);
    const now = new Date();

    const isOwner = OWNER_ROLES.includes(role);

    if (body.bypassApprovalRequest) {
      if (!isOwner) {
        throw new AppError(
          "Only the owner can bypass the approval request",
          403,
          "APPROVAL_BYPASS_FORBIDDEN",
        );
      }
    } else if (task.approvalStatus !== TaskApprovalStatus.PENDING) {
      throw new AppError(
        "Task is not pending approval",
        409,
        "TASK_NOT_PENDING_APPROVAL",
      );
    }

    const movedToAprovado = await tryMoveTaskToColumnByName({
      taskId,
      organizationId,
      boardId: task.boardId,
      columnName: "Aprovado",
    });

    if (!movedToAprovado) {
      await moveTaskToColumnByName({
        taskId,
        organizationId,
        boardId: task.boardId,
        columnName: "Agendado",
      });
    }

    const updateResult = await this.approvalRepository.updateApprovalFields(
      organizationId,
      taskId,
      {
        approvalStatus: TaskApprovalStatus.APPROVED,
        approvedAt: now,
        approvedByClerkUserId: userId,
        status: TaskStatus.APPROVED,
        isRework: false,
      },
    );

    if (updateResult.count === 0) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    if (body.comment) {
      await this.approvalRepository.createTypedComment(
        organizationId,
        taskId,
        userId,
        body.comment,
        TaskCommentType.APPROVAL,
      );
    }

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.TASK_APPROVED,
      "Task approved",
      {
        clerkUserId: userId,
        metadata: {
          comment: body.comment ?? null,
          bypassApprovalRequest: body.bypassApprovalRequest ?? false,
        },
      },
    );

    fireNotification(() =>
      notificationEvents.notifyTaskApproved({
        organizationId,
        task,
        actorClerkUserId: userId,
      }),
    );

    return this.getTaskResponse(organizationId, taskId);
  }

  async requestChanges(
    organizationId: string,
    taskId: string,
    userId: string,
    body: RequestChangesBody,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.getTaskOrThrow(organizationId, taskId);
    const now = new Date();

    const updateResult = await this.approvalRepository.updateApprovalFields(
      organizationId,
      taskId,
      {
        approvalStatus: TaskApprovalStatus.CHANGES_REQUESTED,
        changeRequestedAt: now,
        changeRequestedByClerkUserId: userId,
        status: TaskStatus.IN_PROGRESS,
        isRework: true,
      },
    );

    if (updateResult.count === 0) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    await this.approvalRepository.createTypedComment(
      organizationId,
      taskId,
      userId,
      body.comment,
      TaskCommentType.CHANGE_REQUEST,
    );

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.CHANGES_REQUESTED,
      "Changes requested",
      {
        clerkUserId: userId,
        metadata: { comment: body.comment },
      },
    );

    fireNotification(() =>
      notificationEvents.notifyChangesRequested({
        organizationId,
        task,
        actorClerkUserId: userId,
      }),
    );

    await moveTaskToColumnByName({
      taskId,
      organizationId,
      boardId: task.boardId,
      columnName: "Produção",
    });

    return this.getTaskResponse(organizationId, taskId);
  }

  async getApprovalInfo(organizationId: string, taskId: string) {
    const task = await this.getTaskOrThrow(organizationId, taskId);

    const [comments, activities] = await Promise.all([
      this.approvalRepository.findApprovalComments(organizationId, taskId),
      this.approvalRepository.findApprovalActivities(organizationId, taskId),
    ]);

    return {
      approvalStatus: task.approvalStatus,
      approvalRequestedAt: task.approvalRequestedAt,
      approvedAt: task.approvedAt,
      changeRequestedAt: task.changeRequestedAt,
      approvalRequestedByClerkUserId: task.approvalRequestedByClerkUserId,
      approvedByClerkUserId: task.approvedByClerkUserId,
      changeRequestedByClerkUserId: task.changeRequestedByClerkUserId,
      responsibleApproverClerkUserId: task.responsibleApproverClerkUserId,
      responsibleApproverKind: task.responsibleApproverKind,
      comments,
      activities,
    };
  }
}
