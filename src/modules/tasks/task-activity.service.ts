import type { Prisma } from "@prisma/client";
import type { CreateTaskActivityInput, TaskActivityRepository } from "./task-activity.repository";
import type { TaskActivityType } from "./task-activity.constants";

export class TaskActivityService {
  constructor(private readonly repository: TaskActivityRepository) {}

  create(input: CreateTaskActivityInput) {
    return this.repository.create(input);
  }

  log(
    organizationId: string,
    taskId: string,
    type: TaskActivityType,
    message: string,
    options?: {
      clerkUserId?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return this.repository.create({
      organizationId,
      taskId,
      type,
      message,
      clerkUserId: options?.clerkUserId,
      metadata: options?.metadata,
    });
  }

  listByTask(organizationId: string, taskId: string) {
    return this.repository.findByTask(organizationId, taskId);
  }
}
