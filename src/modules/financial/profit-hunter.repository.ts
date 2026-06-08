import { prisma } from "../../infrastructure/database/prisma";
import type { DateRangeFilter } from "./financial.helpers";

export class ProfitHunterRepository {
  protected readonly db = prisma;

  findStoppedTimeEntries(organizationId: string, range: DateRangeFilter) {
    return this.db.timeEntry.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: "STOPPED",
        ...(range.startDate || range.endDate
          ? {
              startedAt: {
                ...(range.startDate ? { gte: range.startDate } : {}),
                ...(range.endDate ? { lte: range.endDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        taskId: true,
        projectId: true,
        clientId: true,
        clerkUserId: true,
        startedAt: true,
        durationMinutes: true,
      },
    });
  }

  findClients(organizationId: string) {
    return this.db.client.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" },
    });
  }

  findClient(organizationId: string, clientId: string) {
    return this.db.client.findFirst({
      where: { id: clientId, organizationId, deletedAt: null },
    });
  }

  findProjects(organizationId: string, clientId?: string) {
    return this.db.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(clientId ? { clientId } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        clientId: true,
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    });
  }

  findProject(organizationId: string, projectId: string) {
    return this.db.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, status: true } },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            estimatedMinutes: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
  }

  countClients(organizationId: string) {
    return this.db.client.count({
      where: { organizationId, deletedAt: null },
    });
  }

  countProjects(organizationId: string) {
    return this.db.project.count({
      where: { organizationId, deletedAt: null },
    });
  }
}
