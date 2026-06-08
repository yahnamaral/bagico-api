import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type {
  CreateMemberCostRateBody,
  ListMemberCostRatesQuery,
  UpdateMemberCostRateBody,
} from "./member-cost-rate.schemas";

const memberCostRateSelect = {
  id: true,
  organizationId: true,
  clerkUserId: true,
  hourlyCost: true,
  currency: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type MemberCostRateRecord = Prisma.MemberCostRateGetPayload<{
  select: typeof memberCostRateSelect;
}>;

export class MemberCostRateRepository {
  protected readonly db = prisma;

  async list(organizationId: string, query: ListMemberCostRatesQuery) {
    const { page, limit, clerkUserId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MemberCostRateWhereInput = {
      organizationId,
      deletedAt: null,
      ...(clerkUserId ? { clerkUserId } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.memberCostRate.findMany({
        where,
        select: memberCostRateSelect,
        orderBy: [{ clerkUserId: "asc" }, { startsAt: "desc" }],
        skip,
        take: limit,
      }),
      this.db.memberCostRate.count({ where }),
    ]);

    return { data, total };
  }

  findById(organizationId: string, id: string) {
    return this.db.memberCostRate.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      select: memberCostRateSelect,
    });
  }

  findAllActive(organizationId: string) {
    return this.db.memberCostRate.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: [{ clerkUserId: "asc" }, { startsAt: "desc" }],
    });
  }

  create(organizationId: string, body: CreateMemberCostRateBody) {
    return this.db.memberCostRate.create({
      data: {
        organizationId,
        clerkUserId: body.clerkUserId,
        hourlyCost: body.hourlyCost,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      },
      select: memberCostRateSelect,
    });
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateMemberCostRateBody,
  ) {
    const result = await this.db.memberCostRate.updateMany({
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
    const result = await this.db.memberCostRate.updateMany({
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

export function serializeMemberCostRate(rate: MemberCostRateRecord) {
  return {
    ...rate,
    hourlyCost: Number(rate.hourlyCost),
  };
}
