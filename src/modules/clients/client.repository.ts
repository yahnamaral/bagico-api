import type { Client, ClientStatus, Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { CreateClientBody, ListClientsQuery, UpdateClientBody } from "./client.schemas";

type ListFilters = Pick<ListClientsQuery, "search" | "status">;

export class ClientRepository {
  protected readonly db = prisma;

  private buildWhere(
    organizationId: string,
    filters: ListFilters,
  ): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { document: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  findMany(
    organizationId: string,
    query: ListClientsQuery,
  ): Promise<Client[]> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    return this.db.client.findMany({
      where: this.buildWhere(organizationId, { search, status }),
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });
  }

  count(organizationId: string, filters: ListFilters): Promise<number> {
    return this.db.client.count({
      where: this.buildWhere(organizationId, filters),
    });
  }

  findById(organizationId: string, id: string): Promise<Client | null> {
    return this.db.client.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  create(organizationId: string, data: CreateClientBody): Promise<Client> {
    return this.db.client.create({
      data: {
        organizationId,
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        website: data.website,
        segment: data.segment,
        notes: data.notes,
        status: data.status as ClientStatus | undefined,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: UpdateClientBody,
  ): Promise<Client | null> {
    const result = await this.db.client.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.db.client.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  async softDelete(organizationId: string, id: string): Promise<Client | null> {
    const result = await this.db.client.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.db.client.findFirst({
      where: { id, organizationId },
    });
  }
}
