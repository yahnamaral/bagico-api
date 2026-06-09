import type { TaskComment, TaskCommentType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { CreateCommentBody, UpdateCommentBody } from "./comment.schemas";

const commentSelect = {
  id: true,
  taskId: true,
  clerkUserId: true,
  content: true,
  type: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type CommentResponse = {
  id: string;
  taskId: string;
  clerkUserId: string;
  content: string;
  type: TaskCommentType;
  createdAt: Date;
  updatedAt: Date;
};

export class CommentRepository {
  protected readonly db = prisma;

  findByTask(
    organizationId: string,
    taskId: string,
  ): Promise<CommentResponse[]> {
    return this.db.taskComment.findMany({
      where: {
        organizationId,
        taskId,
        deletedAt: null,
      },
      select: commentSelect,
      orderBy: { createdAt: "asc" },
    });
  }

  findById(
    organizationId: string,
    taskId: string,
    commentId: string,
  ): Promise<TaskComment | null> {
    return this.db.taskComment.findFirst({
      where: {
        id: commentId,
        organizationId,
        taskId,
        deletedAt: null,
      },
    });
  }

  create(
    organizationId: string,
    taskId: string,
    clerkUserId: string,
    data: CreateCommentBody,
  ): Promise<CommentResponse> {
    return this.db.taskComment.create({
      data: {
        organizationId,
        taskId,
        clerkUserId,
        content: data.content,
        type: data.type as TaskCommentType | undefined,
      },
      select: commentSelect,
    });
  }

  async update(
    organizationId: string,
    taskId: string,
    commentId: string,
    data: UpdateCommentBody,
  ): Promise<CommentResponse | null> {
    const result = await this.db.taskComment.updateMany({
      where: {
        id: commentId,
        organizationId,
        taskId,
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.db.taskComment.findFirst({
      where: {
        id: commentId,
        organizationId,
        taskId,
        deletedAt: null,
      },
      select: commentSelect,
    });
  }

  async softDelete(
    organizationId: string,
    taskId: string,
    commentId: string,
  ): Promise<boolean> {
    const result = await this.db.taskComment.updateMany({
      where: {
        id: commentId,
        organizationId,
        taskId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  }
}
