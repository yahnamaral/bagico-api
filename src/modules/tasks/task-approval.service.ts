import {
  TaskApprovalStatus,
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

  async requestApproval(
    organizationId: string,
    taskId: string,
    userId: string,
    body: RequestApprovalBody,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.getTaskOrThrow(organizationId, taskId);
    const now = new Date();

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

    fireNotification(() =>
      notificationEvents.notifyApprovalRequested({
        organizationId,
        task,
        actorClerkUserId: userId,
      }),
    );

    return this.getTaskResponse(organizationId, taskId);
  }

  async approve(
    organizationId: string,
    taskId: string,
    userId: string,
    body: ApproveTaskBody,
  ): Promise<TaskDetailWithCounts> {
    const task = await this.getTaskOrThrow(organizationId, taskId);
    const now = new Date();

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
        metadata: { comment: body.comment ?? null },
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
      comments,
      activities,
    };
  }
}
