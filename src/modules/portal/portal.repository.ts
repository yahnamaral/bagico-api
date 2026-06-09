import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { PortalAccess } from "./portal-access";
import type { ListPortalTasksQuery } from "./portal.schemas";

const clientBasicSelect = {
  select: { id: true, name: true, segment: true },
} as const;

const projectBasicSelect = {
  select: { id: true, name: true },
} as const;

const boardBasicSelect = {
  select: { id: true, name: true },
} as const;

const columnBasicSelect = {
  select: { id: true, name: true, position: true },
} as const;

type TaskListFilters = Omit<ListPortalTasksQuery, "page" | "limit">;

export class PortalRepository {
  protected readonly db = prisma;

  findClient(organizationId: string, clientId: string) {
    return this.db.client.findFirst({
      where: {
        id: clientId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  findAccessibleClients(organizationId: string, clientIds: string[]) {
    return this.db.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(clientIds.length > 0 ? { id: { in: clientIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        segment: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });
  }

  private buildTaskWhere(
    organizationId: string,
    access: PortalAccess,
    filters: TaskListFilters,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (!access.fullAccess) {
      where.clientId = { in: access.clientIds };
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.approvalStatus) {
      where.approvalStatus = filters.approvalStatus;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  async listTasks(
    organizationId: string,
    access: PortalAccess,
    query: ListPortalTasksQuery,
  ) {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const where = this.buildTaskWhere(organizationId, access, filters);

    const [tasks, total] = await Promise.all([
      this.db.task.findMany({
        where,
        include: {
          client: clientBasicSelect,
          project: projectBasicSelect,
          board: boardBasicSelect,
          _count: {
            select: {
              comments: { where: { deletedAt: null } },
              files: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: [{ approvalRequestedAt: "desc" }, { updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      this.db.task.count({ where }),
    ]);

    return { tasks, total };
  }

  findTaskById(organizationId: string, taskId: string) {
    return this.db.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
      include: {
        client: clientBasicSelect,
        project: projectBasicSelect,
        board: boardBasicSelect,
        column: columnBasicSelect,
        files: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            taskId: true,
            clerkUserId: true,
            content: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            comments: { where: { deletedAt: null } },
            files: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  findClientMembers(organizationId: string, clientId: string) {
    return this.db.clientMember.findMany({
      where: {
        organizationId,
        clientId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  findClientMemberById(
    organizationId: string,
    clientId: string,
    memberId: string,
  ) {
    return this.db.clientMember.findFirst({
      where: {
        id: memberId,
        organizationId,
        clientId,
        deletedAt: null,
      },
    });
  }

  findClientMemberByUser(
    organizationId: string,
    clientId: string,
    clerkUserId: string,
  ) {
    return this.db.clientMember.findFirst({
      where: {
        organizationId,
        clientId,
        clerkUserId,
        deletedAt: null,
      },
    });
  }

  createClientMember(data: {
    organizationId: string;
    clientId: string;
    clerkUserId: string;
    role: Prisma.ClientMemberCreateInput["role"];
  }) {
    return this.db.clientMember.create({ data });
  }

  async updateClientMember(
    organizationId: string,
    clientId: string,
    memberId: string,
    role: Prisma.ClientMemberUpdateInput["role"],
  ) {
    const result = await this.db.clientMember.updateMany({
      where: {
        id: memberId,
        organizationId,
        clientId,
        deletedAt: null,
      },
      data: { role },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findClientMemberById(organizationId, clientId, memberId);
  }

  async softDeleteClientMember(
    organizationId: string,
    clientId: string,
    memberId: string,
  ) {
    const result = await this.db.clientMember.updateMany({
      where: {
        id: memberId,
        organizationId,
        clientId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  }
}

export function mapPortalTaskDetail(
  task: Prisma.TaskGetPayload<{
    include: {
      client: typeof clientBasicSelect;
      project: typeof projectBasicSelect;
      board: typeof boardBasicSelect;
      column: typeof columnBasicSelect;
      files: true;
      comments: {
        select: {
          id: true;
          taskId: true;
          clerkUserId: true;
          content: true;
          type: true;
          createdAt: true;
          updatedAt: true;
        };
      };
      _count: { select: { comments: true; files: true } };
    };
  }>,
) {
  const { files, comments, _count, ...rest } = task;

  return {
    id: rest.id,
    title: rest.title,
    description: rest.description,
    status: rest.status,
    priority: rest.priority,
    mediaType: rest.mediaType,
    dueDate: rest.dueDate,
    approvalStatus: rest.approvalStatus,
    approvalRequestedAt: rest.approvalRequestedAt,
    approvedAt: rest.approvedAt,
    changeRequestedAt: rest.changeRequestedAt,
    isRework: rest.isRework,
    client: rest.client,
    project: rest.project,
    board: rest.board,
    column: rest.column,
    files,
    comments,
    filesCount: _count.files,
    commentsCount: _count.comments,
  };
}

export function mapPortalTaskListItem(
  task: Prisma.TaskGetPayload<{
    include: {
      client: typeof clientBasicSelect;
      project: typeof projectBasicSelect;
      board: typeof boardBasicSelect;
      _count: { select: { comments: true; files: true } };
    };
  }>,
) {
  const { _count, ...rest } = task;

  return {
    id: rest.id,
    title: rest.title,
    description: rest.description,
    status: rest.status,
    priority: rest.priority,
    mediaType: rest.mediaType,
    dueDate: rest.dueDate,
    approvalStatus: rest.approvalStatus,
    isRework: rest.isRework,
    client: rest.client,
    project: rest.project,
    board: rest.board,
    filesCount: _count.files,
    commentsCount: _count.comments,
  };
}
