import type { Prisma, TaskActivity } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { TaskActivityType } from "./task-activity.constants";

export type CreateTaskActivityInput = {
  organizationId: string;
  taskId: string;
  clerkUserId?: string | null;
  type: TaskActivityType;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export class TaskActivityRepository {
  protected readonly db = prisma;

  create(data: CreateTaskActivityInput): Promise<TaskActivity> {
    return this.db.taskActivity.create({
      data: {
        organizationId: data.organizationId,
        taskId: data.taskId,
        clerkUserId: data.clerkUserId ?? null,
        type: data.type,
        message: data.message,
        metadata: data.metadata,
      },
    });
  }

  findByTask(
    organizationId: string,
    taskId: string,
  ): Promise<TaskActivity[]> {
    return this.db.taskActivity.findMany({
      where: {
        organizationId,
        taskId,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
