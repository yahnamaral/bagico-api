import { prisma } from "../../infrastructure/database/prisma";

const closedTaskStatuses = ["DONE", "ARCHIVED"] as const;

const taskListSelect = {
  id: true,
  title: true,
  dueDate: true,
  priority: true,
  status: true,
  approvalStatus: true,
  boardId: true,
  updatedAt: true,
  approvalRequestedAt: true,
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
} as const;

export type DashboardPeriod = {
  startDate: Date;
  endDate: Date;
};

export class DashboardRepository {
  protected readonly db = prisma;

  countClients(organizationId: string) {
    return this.db.client.count({
      where: { organizationId, deletedAt: null },
    });
  }

  countActiveClients(organizationId: string) {
    return this.db.client.count({
      where: { organizationId, deletedAt: null, status: "ACTIVE" },
    });
  }

  countProjects(organizationId: string) {
    return this.db.project.count({
      where: { organizationId, deletedAt: null },
    });
  }

  countActiveProjects(organizationId: string) {
    return this.db.project.count({
      where: { organizationId, deletedAt: null, status: "ACTIVE" },
    });
  }

  countOpenTasks(organizationId: string) {
    return this.db.task.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: [...closedTaskStatuses] },
      },
    });
  }

  countOverdueTasks(organizationId: string, now: Date) {
    return this.db.task.count({
      where: {
        organizationId,
        deletedAt: null,
        dueDate: { lt: now },
        status: { notIn: [...closedTaskStatuses] },
      },
    });
  }

  countPendingApprovals(organizationId: string) {
    return this.db.task.count({
      where: {
        organizationId,
        deletedAt: null,
        approvalStatus: "PENDING",
      },
    });
  }

  countApprovedInPeriod(organizationId: string, period: DashboardPeriod) {
    return this.db.task.count({
      where: {
        organizationId,
        deletedAt: null,
        approvalStatus: "APPROVED",
        approvedAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
    });
  }

  countChangesRequested(organizationId: string) {
    return this.db.task.count({
      where: {
        organizationId,
        deletedAt: null,
        approvalStatus: "CHANGES_REQUESTED",
      },
    });
  }

  findOverdueTasks(organizationId: string, now: Date, limit = 5) {
    return this.db.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        dueDate: { lt: now },
        status: { notIn: [...closedTaskStatuses] },
      },
      select: taskListSelect,
      orderBy: { dueDate: "asc" },
      take: limit,
    });
  }

  findDueSoonTasks(organizationId: string, now: Date, limit = 5) {
    const inSevenDays = new Date(now);
    inSevenDays.setDate(inSevenDays.getDate() + 7);

    return this.db.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        dueDate: { gte: now, lte: inSevenDays },
        status: { notIn: [...closedTaskStatuses] },
      },
      select: taskListSelect,
      orderBy: { dueDate: "asc" },
      take: limit,
    });
  }

  findPendingApprovalTasks(organizationId: string, limit = 5) {
    return this.db.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        approvalStatus: "PENDING",
      },
      select: taskListSelect,
      orderBy: { approvalRequestedAt: "desc" },
      take: limit,
    });
  }

  findRecentlyUpdatedTasks(organizationId: string, limit = 5) {
    return this.db.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: taskListSelect,
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  sumTrackedMinutesInPeriod(organizationId: string, period: DashboardPeriod) {
    return this.db.timeEntry.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        status: "STOPPED",
        startedAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      _sum: { durationMinutes: true },
    });
  }

  async topTrackedTasksInPeriod(
    organizationId: string,
    period: DashboardPeriod,
    limit = 5,
  ) {
    const grouped = await this.db.timeEntry.groupBy({
      by: ["taskId"],
      where: {
        organizationId,
        deletedAt: null,
        status: "STOPPED",
        startedAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      _sum: { durationMinutes: true },
      orderBy: { _sum: { durationMinutes: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const tasks = await this.db.task.findMany({
      where: {
        organizationId,
        id: { in: grouped.map((row) => row.taskId) },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const taskMap = new Map(tasks.map((task) => [task.id, task]));

    return grouped
      .map((row) => {
        const task = taskMap.get(row.taskId);

        if (!task) {
          return null;
        }

        const totalMinutes = row._sum.durationMinutes ?? 0;

        return {
          taskId: row.taskId,
          title: task.title,
          client: task.client,
          project: task.project,
          totalMinutes,
          totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        };
      })
      .filter((item) => item !== null);
  }

  countOrganizationMembers(organizationId: string) {
    return this.db.organizationMember.count({
      where: { organizationId },
    });
  }
}
