import type { Prisma, TaskCommentType } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const commentSelect = {
  id: true,
  taskId: true,
  clerkUserId: true,
  content: true,
  type: true,
  createdAt: true,
  updatedAt: true,
} as const;

const APPROVAL_ACTIVITY_TYPES = [
  "APPROVAL_REQUESTED",
  "TASK_APPROVED",
  "CHANGES_REQUESTED",
  "PORTAL_TASK_APPROVED",
  "PORTAL_CHANGES_REQUESTED",
] as const;

export class TaskApprovalRepository {
  protected readonly db = prisma;

  updateApprovalFields(
    organizationId: string,
    taskId: string,
    data: Prisma.TaskUpdateInput,
  ) {
    return this.db.task.updateMany({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
      data,
    });
  }

  createTypedComment(
    organizationId: string,
    taskId: string,
    clerkUserId: string,
    content: string,
    type: TaskCommentType,
  ) {
    return this.db.taskComment.create({
      data: {
        organizationId,
        taskId,
        clerkUserId,
        content,
        type,
      },
      select: commentSelect,
    });
  }

  findApprovalComments(organizationId: string, taskId: string, limit = 10) {
    return this.db.taskComment.findMany({
      where: {
        organizationId,
        taskId,
        deletedAt: null,
        type: { in: ["APPROVAL", "CHANGE_REQUEST"] },
      },
      select: commentSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  findApprovalActivities(organizationId: string, taskId: string, limit = 10) {
    return this.db.taskActivity.findMany({
      where: {
        organizationId,
        taskId,
        type: { in: [...APPROVAL_ACTIVITY_TYPES] },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
