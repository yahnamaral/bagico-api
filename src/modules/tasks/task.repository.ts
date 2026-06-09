import type { Prisma, Task, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { statusFromColumnName } from "./task.helpers";
import type {
  CreateTaskBody,
  ListTasksQuery,
  UpdateTaskBody,
} from "./task.schemas";

type ListFilters = Omit<ListTasksQuery, "page" | "limit" | "assignedToMe"> & {
  assignedToClerkUserId?: string;
};

const boardBasicSelect = {
  select: {
    id: true,
    name: true,
  },
} as const;

const columnBasicSelect = {
  select: {
    id: true,
    name: true,
    position: true,
  },
} as const;

const projectBasicSelect = {
  select: {
    id: true,
    name: true,
  },
} as const;

const clientBasicSelect = {
  select: {
    id: true,
    name: true,
    segment: true,
  },
} as const;

const taskInclude = {
  board: boardBasicSelect,
  column: columnBasicSelect,
  project: projectBasicSelect,
  client: clientBasicSelect,
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      files: { where: { deletedAt: null } },
    },
  },
} as const;

export type TaskDetail = Prisma.TaskGetPayload<{
  include: {
    board: typeof boardBasicSelect;
    column: typeof columnBasicSelect;
    project: typeof projectBasicSelect;
    client: typeof clientBasicSelect;
  };
}>;

export type TaskDetailWithCounts = TaskDetail & {
  commentsCount: number;
  filesCount: number;
};

export class TaskRepository {
  protected readonly db = prisma;

  private buildWhere(
    organizationId: string,
    filters: ListFilters,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (filters.boardId) {
      where.boardId = filters.boardId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.assignedToClerkUserId) {
      where.assignedToClerkUserId = filters.assignedToClerkUserId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  findMany(
    organizationId: string,
    query: ListTasksQuery & { assignedToClerkUserId?: string },
  ): Promise<TaskDetail[]> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;

    return this.db.task.findMany({
      where: this.buildWhere(organizationId, filters),
      include: {
        board: boardBasicSelect,
        column: columnBasicSelect,
        project: projectBasicSelect,
        client: clientBasicSelect,
      },
      orderBy: [{ columnId: "asc" }, { position: "asc" }],
      skip,
      take: limit,
    });
  }

  count(
    organizationId: string,
    filters: ListFilters,
  ): Promise<number> {
    return this.db.task.count({
      where: this.buildWhere(organizationId, filters),
    });
  }

  async findById(organizationId: string, id: string): Promise<TaskDetail | null> {
    const task = await this.db.task.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        board: boardBasicSelect,
        column: columnBasicSelect,
        project: projectBasicSelect,
        client: clientBasicSelect,
      },
    });

    return task;
  }

  async findByIdWithCounts(
    organizationId: string,
    id: string,
  ): Promise<TaskDetailWithCounts | null> {
    const task = await this.db.task.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: taskInclude,
    });

    if (!task) {
      return null;
    }

    const { _count, ...rest } = task;

    return {
      ...rest,
      commentsCount: _count.comments,
      filesCount: _count.files,
    };
  }

  async getMaxPositionInColumn(
    organizationId: string,
    columnId: string,
  ): Promise<number> {
    const result = await this.db.task.aggregate({
      where: {
        organizationId,
        columnId,
        deletedAt: null,
      },
      _max: { position: true },
    });

    return result._max.position ?? 0;
  }

  create(
    organizationId: string,
    data: {
      boardId: string;
      columnId: string;
      projectId: string;
      clientId: string;
      title: string;
      description?: string;
      priority?: TaskPriority;
      mediaType?: string;
      dueDate?: Date;
      assignedToClerkUserId?: string;
      createdByClerkUserId: string;
      position: number;
      status?: TaskStatus;
    },
  ): Promise<TaskDetail> {
    return this.db.task.create({
      data: {
        organizationId,
        boardId: data.boardId,
        columnId: data.columnId,
        projectId: data.projectId,
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        mediaType: data.mediaType,
        dueDate: data.dueDate,
        assignedToClerkUserId: data.assignedToClerkUserId,
        createdByClerkUserId: data.createdByClerkUserId,
        position: data.position,
        status: data.status,
      },
      include: {
        board: boardBasicSelect,
        column: columnBasicSelect,
        project: projectBasicSelect,
        client: clientBasicSelect,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: UpdateTaskBody,
  ): Promise<TaskDetail | null> {
    const result = await this.db.task.updateMany({
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

  async softDelete(organizationId: string, id: string): Promise<TaskDetail | null> {
    const result = await this.db.task.updateMany({
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

    return this.db.task.findFirst({
      where: { id, organizationId },
      include: {
        board: boardBasicSelect,
        column: columnBasicSelect,
        project: projectBasicSelect,
        client: clientBasicSelect,
      },
    });
  }

  moveTask(
    organizationId: string,
    taskId: string,
    targetColumnId: string,
    targetPosition: number,
  ): Promise<TaskDetail | null> {
    return this.db.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: {
          id: taskId,
          organizationId,
          deletedAt: null,
        },
        include: {
          column: true,
        },
      });

      if (!task) {
        return null;
      }

      const targetColumn = await tx.boardColumn.findFirst({
        where: {
          id: targetColumnId,
          organizationId,
          boardId: task.boardId,
          deletedAt: null,
        },
      });

      if (!targetColumn) {
        return null;
      }

      const sourceColumn = task.column;
      const isRework = targetColumn.position < sourceColumn.position;
      const newStatus = statusFromColumnName(targetColumn.name);

      if (task.columnId === targetColumnId) {
        await this.reorderWithinColumn(
          tx,
          organizationId,
          task.columnId,
          task.id,
          task.position,
          targetPosition,
        );
      } else {
        await tx.task.updateMany({
          where: {
            organizationId,
            columnId: task.columnId,
            deletedAt: null,
            position: { gt: task.position },
          },
          data: { position: { decrement: 1 } },
        });

        await tx.task.updateMany({
          where: {
            organizationId,
            columnId: targetColumnId,
            deletedAt: null,
            position: { gte: targetPosition },
          },
          data: { position: { increment: 1 } },
        });

        await tx.task.update({
          where: { id: task.id },
          data: {
            columnId: targetColumnId,
            position: targetPosition,
            status: newStatus,
            isRework: isRework ? true : task.isRework,
          },
        });
      }

      return tx.task.findFirst({
        where: { id: task.id },
        include: {
          board: boardBasicSelect,
          column: columnBasicSelect,
          project: projectBasicSelect,
          client: clientBasicSelect,
        },
      });
    });
  }

  private async reorderWithinColumn(
    tx: Prisma.TransactionClient,
    organizationId: string,
    columnId: string,
    taskId: string,
    currentPosition: number,
    targetPosition: number,
  ): Promise<void> {
    if (currentPosition === targetPosition) {
      return;
    }

    if (targetPosition < currentPosition) {
      await tx.task.updateMany({
        where: {
          organizationId,
          columnId,
          deletedAt: null,
          position: { gte: targetPosition, lt: currentPosition },
          NOT: { id: taskId },
        },
        data: { position: { increment: 1 } },
      });
    } else {
      await tx.task.updateMany({
        where: {
          organizationId,
          columnId,
          deletedAt: null,
          position: { gt: currentPosition, lte: targetPosition },
          NOT: { id: taskId },
        },
        data: { position: { decrement: 1 } },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: { position: targetPosition },
    });
  }
}
