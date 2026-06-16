import type { ClientFile, ClientFileCategory } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { CreateClientFileBody } from "./client-file.schemas";

export class ClientFileRepository {
  protected readonly db = prisma;

  findByClient(organizationId: string, clientId: string): Promise<ClientFile[]> {
    return this.db.clientFile.findMany({
      where: {
        organizationId,
        clientId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(
    organizationId: string,
    clientId: string,
    fileId: string,
  ): Promise<ClientFile | null> {
    return this.db.clientFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        clientId,
        deletedAt: null,
      },
    });
  }

  create(
    organizationId: string,
    clientId: string,
    uploadedByClerkUserId: string,
    data: CreateClientFileBody,
  ): Promise<ClientFile> {
    return this.db.clientFile.create({
      data: {
        organizationId,
        clientId,
        uploadedByClerkUserId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileKey: data.fileKey,
        mimeType: data.mimeType,
        size: data.size,
        category: data.category as ClientFileCategory | undefined,
      },
    });
  }

  async softDelete(
    organizationId: string,
    clientId: string,
    fileId: string,
  ): Promise<boolean> {
    const result = await this.db.clientFile.updateMany({
      where: {
        id: fileId,
        organizationId,
        clientId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  }

  countByClient(organizationId: string, clientId: string): Promise<number> {
    return this.db.clientFile.count({
      where: {
        organizationId,
        clientId,
        deletedAt: null,
      },
    });
  }
}
