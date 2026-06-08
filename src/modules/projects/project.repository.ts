import type { Prisma, ProjectPriority, ProjectStatus } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type {
  CreateProjectBody,
  ListProjectsQuery,
  UpdateProjectBody,
} from "./project.schemas";

type ListFilters = Pick<
  ListProjectsQuery,
  "search" | "status" | "priority" | "clientId"
>;

const clientBasicSelect = {
  select: {
    id: true,
    name: true,
    segment: true,
  },
} as const;

export type ProjectWithClient = Prisma.ProjectGetPayload<{
  include: { client: typeof clientBasicSelect };
}>;

export class ProjectRepository {
  protected readonly db = prisma;

  private buildWhere(
    organizationId: string,
    filters: ListFilters,
  ): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  findMany(
    organizationId: string,
    query: ListProjectsQuery,
  ): Promise<ProjectWithClient[]> {
    const { page, limit, search, status, priority, clientId } = query;
    const skip = (page - 1) * limit;

    return this.db.project.findMany({
      where: this.buildWhere(organizationId, {
        search,
        status,
        priority,
        clientId,
      }),
      include: { client: clientBasicSelect },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });
  }

  count(organizationId: string, filters: ListFilters): Promise<number> {
    return this.db.project.count({
      where: this.buildWhere(organizationId, filters),
    });
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<ProjectWithClient | null> {
    return this.db.project.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: { client: clientBasicSelect },
    });
  }

  create(
    organizationId: string,
    data: CreateProjectBody,
  ): Promise<ProjectWithClient> {
    return this.db.project.create({
      data: {
        organizationId,
        clientId: data.clientId,
        name: data.name,
        description: data.description,
        status: data.status as ProjectStatus | undefined,
        priority: data.priority as ProjectPriority | undefined,
        startDate: data.startDate,
        dueDate: data.dueDate,
        budget: data.budget,
      },
      include: { client: clientBasicSelect },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: UpdateProjectBody,
  ): Promise<ProjectWithClient | null> {
    const result = await this.db.project.updateMany({
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

    return this.findById(organizationId, id);
  }

  async softDelete(
    organizationId: string,
    id: string,
  ): Promise<ProjectWithClient | null> {
    const result = await this.db.project.updateMany({
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

    return this.db.project.findFirst({
      where: { id, organizationId },
      include: { client: clientBasicSelect },
    });
  }
}
