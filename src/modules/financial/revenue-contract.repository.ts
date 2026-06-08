import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type {
  CreateRevenueContractBody,
  ListRevenueContractsQuery,
  UpdateRevenueContractBody,
} from "./revenue-contract.schemas";
const revenueContractSelect = {
  id: true,
  organizationId: true,
  clientId: true,
  projectId: true,
  name: true,
  type: true,
  amount: true,
  currency: true,
  billingCycle: true,
  startsAt: true,
  endsAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
} as const;

export type RevenueContractRecord = Prisma.RevenueContractGetPayload<{
  select: typeof revenueContractSelect;
}>;

export class RevenueContractRepository {
  protected readonly db = prisma;

  findClient(organizationId: string, clientId: string) {
    return this.db.client.findFirst({
      where: { id: clientId, organizationId, deletedAt: null },
    });
  }

  findProject(organizationId: string, projectId: string, clientId?: string) {
    return this.db.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
        ...(clientId ? { clientId } : {}),
      },
    });
  }

  async list(organizationId: string, query: ListRevenueContractsQuery) {
    const { page, limit, clientId, projectId, status, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RevenueContractWhereInput = {
      organizationId,
      deletedAt: null,
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.revenueContract.findMany({
        where,
        select: revenueContractSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.db.revenueContract.count({ where }),
    ]);

    return { data, total };
  }

  findById(organizationId: string, id: string) {
    return this.db.revenueContract.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      select: revenueContractSelect,
    });
  }

  findActiveContracts(organizationId: string) {
    return this.db.revenueContract.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: revenueContractSelect,
    });
  }

  findByClient(organizationId: string, clientId: string) {
    return this.db.revenueContract.findMany({
      where: {
        organizationId,
        clientId,
        deletedAt: null,
      },
      select: revenueContractSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  findByProject(organizationId: string, projectId: string) {
    return this.db.revenueContract.findMany({
      where: {
        organizationId,
        projectId,
        deletedAt: null,
      },
      select: revenueContractSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  create(organizationId: string, body: CreateRevenueContractBody) {
    return this.db.revenueContract.create({
      data: {
        organizationId,
        clientId: body.clientId,
        projectId: body.projectId,
        name: body.name,
        type: body.type,
        amount: body.amount,
        billingCycle: body.billingCycle,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        status: body.status ?? "ACTIVE",
      },
      select: revenueContractSelect,
    });
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateRevenueContractBody,
  ) {
    const result = await this.db.revenueContract.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: body,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, id);
  }

  async softDelete(organizationId: string, id: string) {
    const result = await this.db.revenueContract.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, id);
  }
}

export function serializeRevenueContract(contract: RevenueContractRecord) {
  return {
    ...contract,
    amount: Number(contract.amount),
  };
}
