import type { TaskFile } from "../../../generated/prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { fireNotification } from "../notifications/notification.helpers";
import { notificationEvents } from "../notifications/notification-events.instance";
import { TASK_ACTIVITY_TYPES } from "../tasks/task-activity.constants";
import type { TaskActivityService } from "../tasks/task-activity.service";
import type { TaskRepository } from "../tasks/task.repository";
import type { FileRepository } from "./file.repository";
import type { CreateFileBody } from "./file.schemas";

export class FileService {
  constructor(
    private readonly repository: FileRepository,
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

  async list(organizationId: string, taskId: string): Promise<TaskFile[]> {
    await this.ensureTaskExists(organizationId, taskId);

    return this.repository.findByTask(organizationId, taskId);
  }

  async create(
    organizationId: string,
    taskId: string,
    userId: string,
    body: CreateFileBody,
  ): Promise<TaskFile> {
    await this.ensureTaskExists(organizationId, taskId);

    const file = await this.repository.create(
      organizationId,
      taskId,
      userId,
      body,
    );

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.FILE_UPLOADED,
      "File uploaded to task",
      {
        clerkUserId: userId,
        metadata: {
          fileId: file.id,
          fileName: file.fileName,
          version: file.version,
        },
      },
    );

    const task = await this.taskRepository.findById(organizationId, taskId);

    if (task) {
      fireNotification(() =>
        notificationEvents.notifyTaskFileUploaded({
          organizationId,
          task,
          file,
          actorClerkUserId: userId,
        }),
      );
    }

    return file;
  }

  async remove(
    organizationId: string,
    taskId: string,
    fileId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureTaskExists(organizationId, taskId);

    const file = await this.repository.findById(organizationId, taskId, fileId);

    if (!file) {
      throw new AppError("File not found", 404, "FILE_NOT_FOUND");
    }

    const deleted = await this.repository.softDelete(
      organizationId,
      taskId,
      fileId,
    );

    if (!deleted) {
      throw new AppError("File not found", 404, "FILE_NOT_FOUND");
    }

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.FILE_DELETED,
      "File deleted from task",
      {
        clerkUserId: userId,
        metadata: { fileId, fileName: file.fileName },
      },
    );
  }
}
