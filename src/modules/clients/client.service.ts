import type { Client } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError";
import type { ClientRepository } from "./client.repository";
import type {
  CreateClientBody,
  ListClientsQuery,
  UpdateClientBody,
} from "./client.schemas";

export class ClientService {
  constructor(private readonly repository: ClientRepository) {}

  async list(organizationId: string, query: ListClientsQuery) {
    const [data, total] = await Promise.all([
      this.repository.findMany(organizationId, query),
      this.repository.count(organizationId, {
        search: query.search,
        status: query.status,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async create(
    organizationId: string,
    body: CreateClientBody,
  ): Promise<Client> {
    return this.repository.create(organizationId, body);
  }

  async getById(organizationId: string, id: string): Promise<Client> {
    const client = await this.repository.findById(organizationId, id);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    return client;
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateClientBody,
  ): Promise<Client> {
    const client = await this.repository.update(organizationId, id, body);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    return client;
  }

  async remove(organizationId: string, id: string): Promise<Client> {
    const client = await this.repository.softDelete(organizationId, id);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    return client;
  }
}
