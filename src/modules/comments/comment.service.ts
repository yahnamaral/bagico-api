import { OrganizationRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { fireNotification } from "../notifications/notification.helpers";
import { notificationEvents } from "../notifications/notification-events.instance";
import { TASK_ACTIVITY_TYPES } from "../tasks/task-activity.constants";
import type { TaskActivityService } from "../tasks/task-activity.service";
import type { TaskRepository } from "../tasks/task.repository";
import type { CommentRepository, CommentResponse } from "./comment.repository";
import type { CreateCommentBody, UpdateCommentBody } from "./comment.schemas";

const MODERATOR_ROLES = new Set<OrganizationRole>([
  OrganizationRole.AGENCY_OWNER,
  OrganizationRole.AGENCY_MANAGER,
]);

export class CommentService {
  constructor(
    private readonly repository: CommentRepository,
    private readonly taskRepository: TaskRepository,
    private readonly activityService: TaskActivityService,
  ) {}

  private async ensureTaskExists(
    organizationId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.taskRepository.findById(organizationId, taskId);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }
  }

  async list(organizationId: string, taskId: string): Promise<CommentResponse[]> {
    await this.ensureTaskExists(organizationId, taskId);

    return this.repository.findByTask(organizationId, taskId);
  }

  async create(
    organizationId: string,
    taskId: string,
    userId: string,
    body: CreateCommentBody,
  ): Promise<CommentResponse> {
    await this.ensureTaskExists(organizationId, taskId);

    const comment = await this.repository.create(
      organizationId,
      taskId,
      userId,
      body,
    );

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.COMMENT_CREATED,
      "Comment added to task",
      {
        clerkUserId: userId,
        metadata: { commentId: comment.id },
      },
    );

    const task = await this.taskRepository.findById(organizationId, taskId);

    if (task) {
      fireNotification(() =>
        notificationEvents.notifyTaskCommentCreated({
          organizationId,
          task,
          comment,
          actorClerkUserId: userId,
        }),
      );
    }

    return comment;
  }

  async update(
    organizationId: string,
    taskId: string,
    commentId: string,
    userId: string,
    body: UpdateCommentBody,
  ): Promise<CommentResponse> {
    await this.ensureTaskExists(organizationId, taskId);

    const comment = await this.repository.findById(
      organizationId,
      taskId,
      commentId,
    );

    if (!comment) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    if (comment.type !== "COMMENT") {
      throw new AppError("Comment cannot be edited", 403, "COMMENT_NOT_EDITABLE");
    }

    if (comment.clerkUserId !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const updated = await this.repository.update(
      organizationId,
      taskId,
      commentId,
      body,
    );

    if (!updated) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    return updated;
  }

  async remove(
    organizationId: string,
    taskId: string,
    commentId: string,
    userId: string,
    memberRole: OrganizationRole,
  ): Promise<void> {
    await this.ensureTaskExists(organizationId, taskId);

    const comment = await this.repository.findById(
      organizationId,
      taskId,
      commentId,
    );

    if (!comment) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    const canModerate = MODERATOR_ROLES.has(memberRole);
    const isOwner = comment.clerkUserId === userId;

    if (!isOwner && !canModerate) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const deleted = await this.repository.softDelete(
      organizationId,
      taskId,
      commentId,
    );

    if (!deleted) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.COMMENT_DELETED,
      "Comment deleted from task",
      {
        clerkUserId: userId,
        metadata: { commentId },
      },
    );
  }
}
