import type {
  Prisma,
  TimeEntrySource,
  TimeEntryStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type {
  ListTaskTimeQuery,
  ProjectTimeSummaryQuery,
} from "./time-entry.schemas";

const timeEntrySelect = {
  id: true,
  organizationId: true,
  taskId: true,
  projectId: true,
  clientId: true,
  clerkUserId: true,
  description: true,
  startedAt: true,
  endedAt: true,
  durationMinutes: true,
  source: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const activeEntryWhere = {
  deletedAt: null,
  status: { not: "DELETED" as TimeEntryStatus },
} as const;

export type TimeEntryRecord = Prisma.TimeEntryGetPayload<{
  select: typeof timeEntrySelect;
}>;

export class TimeEntryRepository {
  protected readonly db = prisma;

  findTask(organizationId: string, taskId: string) {
    return this.db.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        projectId: true,
        clientId: true,
        estimatedMinutes: true,
      },
    });
  }

  findProject(organizationId: string, projectId: string) {
    return this.db.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  findRunningEntry(organizationId: string, clerkUserId: string) {
    return this.db.timeEntry.findFirst({
      where: {
        organizationId,
        clerkUserId,
        status: "RUNNING",
        deletedAt: null,
      },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });
  }

  findById(organizationId: string, id: string) {
    return this.db.timeEntry.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
        status: { not: "DELETED" },
      },
      select: timeEntrySelect,
    });
  }

  createEntry(data: {
    organizationId: string;
    taskId: string;
    projectId: string;
    clientId: string;
    clerkUserId: string;
    description?: string;
    startedAt: Date;
    endedAt?: Date;
    durationMinutes?: number;
    source: TimeEntrySource;
    status: TimeEntryStatus;
  }) {
    return this.db.timeEntry.create({
      data,
      select: timeEntrySelect,
    });
  }

  async updateEntry(
    organizationId: string,
    id: string,
    data: Prisma.TimeEntryUpdateInput,
  ): Promise<TimeEntryRecord | null> {
    const result = await this.db.timeEntry.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
        status: { not: "DELETED" },
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, id);
  }

  async softDeleteEntry(organizationId: string, id: string) {
    const result = await this.db.timeEntry.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
        status: { not: "DELETED" },
      },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.db.timeEntry.findFirst({
      where: { id, organizationId },
      select: timeEntrySelect,
    });
  }

  async listByTask(
    organizationId: string,
    taskId: string,
    query: ListTaskTimeQuery,
  ) {
    const { page, limit, source, clerkUserId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TimeEntryWhereInput = {
      organizationId,
      taskId,
      deletedAt: null,
      status: { not: "DELETED" },
      ...(source ? { source } : {}),
      ...(clerkUserId ? { clerkUserId } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.timeEntry.findMany({
        where,
        select: timeEntrySelect,
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      this.db.timeEntry.count({ where }),
    ]);

    return { data, total };
  }

  sumStoppedMinutesByTask(
    organizationId: string,
    taskId: string,
    clerkUserId?: string,
  ) {
    return this.db.timeEntry.aggregate({
      where: {
        organizationId,
        taskId,
        deletedAt: null,
        status: "STOPPED",
        ...(clerkUserId ? { clerkUserId } : {}),
      },
      _sum: { durationMinutes: true },
    });
  }

  sumStoppedMinutesByTasks(
    organizationId: string,
    taskIds: string[],
    clerkUserId?: string,
  ) {
    if (taskIds.length === 0) {
      return Promise.resolve([] as Array<{ taskId: string; total: number }>);
    }

    return this.db.timeEntry.groupBy({
      by: ["taskId"],
      where: {
        organizationId,
        taskId: { in: taskIds },
        deletedAt: null,
        status: "STOPPED",
        ...(clerkUserId ? { clerkUserId } : {}),
      },
      _sum: { durationMinutes: true },
    }).then((rows) =>
      rows.map((row) => ({
        taskId: row.taskId,
        total: row._sum.durationMinutes ?? 0,
      })),
    );
  }

  findRunningTaskIdsForUser(
    organizationId: string,
    taskIds: string[],
    clerkUserId: string,
  ) {
    if (taskIds.length === 0) {
      return Promise.resolve([] as string[]);
    }

    return this.db.timeEntry
      .findMany({
        where: {
          organizationId,
          taskId: { in: taskIds },
          clerkUserId,
          status: "RUNNING",
          deletedAt: null,
        },
        select: { taskId: true },
      })
      .then((rows) => rows.map((row) => row.taskId));
  }

  findRunningEntryForUserOnTask(
    organizationId: string,
    taskId: string,
    clerkUserId: string,
  ) {
    return this.db.timeEntry.findFirst({
      where: {
        organizationId,
        taskId,
        clerkUserId,
        status: "RUNNING",
        deletedAt: null,
      },
      select: timeEntrySelect,
    });
  }

  listProjectStoppedEntries(
    organizationId: string,
    projectId: string,
    query: ProjectTimeSummaryQuery,
  ) {
    const where: Prisma.TimeEntryWhereInput = {
      organizationId,
      projectId,
      deletedAt: null,
      status: "STOPPED",
      ...(query.startDate || query.endDate
        ? {
            startedAt: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          }
        : {}),
    };

    return this.db.timeEntry.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        clerkUserId: true,
        durationMinutes: true,
        startedAt: true,
        endedAt: true,
        task: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  }
}
