import type { ClientFile } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError";
import type { ClientRepository } from "../clients/client.repository";
import type { ClientFileRepository } from "./client-file.repository";
import type { CreateClientFileBody } from "./client-file.schemas";

export class ClientFileService {
  constructor(
    private readonly repository: ClientFileRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  private async ensureClientExists(
    organizationId: string,
    clientId: string,
  ): Promise<void> {
    const client = await this.clientRepository.findById(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }
  }

  async list(organizationId: string, clientId: string): Promise<ClientFile[]> {
    await this.ensureClientExists(organizationId, clientId);

    return this.repository.findByClient(organizationId, clientId);
  }

  async create(
    organizationId: string,
    clientId: string,
    userId: string,
    body: CreateClientFileBody,
  ): Promise<ClientFile> {
    await this.ensureClientExists(organizationId, clientId);

    return this.repository.create(organizationId, clientId, userId, body);
  }

  async remove(
    organizationId: string,
    clientId: string,
    fileId: string,
  ): Promise<void> {
    await this.ensureClientExists(organizationId, clientId);

    const file = await this.repository.findById(
      organizationId,
      clientId,
      fileId,
    );

    if (!file) {
      throw new AppError("File not found", 404, "FILE_NOT_FOUND");
    }

    const deleted = await this.repository.softDelete(
      organizationId,
      clientId,
      fileId,
    );

    if (!deleted) {
      throw new AppError("File not found", 404, "FILE_NOT_FOUND");
    }
  }
}
