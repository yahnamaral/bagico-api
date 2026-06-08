import type { TaskFile, TaskFileCategory } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { CreateFileBody } from "./file.schemas";

export class FileRepository {
  protected readonly db = prisma;

  findByTask(organizationId: string, taskId: string): Promise<TaskFile[]> {
    return this.db.taskFile.findMany({
      where: {
        organizationId,
        taskId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(
    organizationId: string,
    taskId: string,
    fileId: string,
  ): Promise<TaskFile | null> {
    return this.db.taskFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        taskId,
        deletedAt: null,
      },
    });
  }

  async getMaxVersion(
    organizationId: string,
    taskId: string,
    fileName: string,
  ): Promise<number> {
    const result = await this.db.taskFile.aggregate({
      where: {
        organizationId,
        taskId,
        fileName,
        deletedAt: null,
      },
      _max: { version: true },
    });

    return result._max.version ?? 0;
  }

  async create(
    organizationId: string,
    taskId: string,
    uploadedByClerkUserId: string,
    data: CreateFileBody,
  ): Promise<TaskFile> {
    const maxVersion = await this.getMaxVersion(
      organizationId,
      taskId,
      data.fileName,
    );

    return this.db.taskFile.create({
      data: {
        organizationId,
        taskId,
        uploadedByClerkUserId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileKey: data.fileKey,
        mimeType: data.mimeType,
        size: data.size,
        category: data.category as TaskFileCategory | undefined,
        version: maxVersion + 1,
      },
    });
  }

  async softDelete(
    organizationId: string,
    taskId: string,
    fileId: string,
  ): Promise<boolean> {
    const result = await this.db.taskFile.updateMany({
      where: {
        id: fileId,
        organizationId,
        taskId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  }

  countByTask(organizationId: string, taskId: string): Promise<number> {
    return this.db.taskFile.count({
      where: {
        organizationId,
        taskId,
        deletedAt: null,
      },
    });
  }
}
