import type { OrganizationRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { getRolePermissions } from "../../shared/permissions/permissions";
import { TASK_ACTIVITY_TYPES } from "../tasks/task-activity.constants";
import type { TaskActivityService } from "../tasks/task-activity.service";
import {
  buildTimeProgressSummary,
  calculateDurationMinutes,
  canViewAllTimeEntries,
} from "./time-entry.helpers";
import type { TimeEntryRepository } from "./time-entry.repository";
import type {
  ListTaskTimeQuery,
  ManualTimeEntryBody,
  ProjectTimeSummaryQuery,
  StartTimerBody,
  StopTimerBody,
  UpdateTimeEntryBody,
} from "./time-entry.schemas";

export class TimeEntryService {
  constructor(
    private readonly repository: TimeEntryRepository,
    private readonly activityService: TaskActivityService,
  ) {}

  private ensureCanManageEntry(
    entryClerkUserId: string,
    currentUserId: string,
    memberRole: OrganizationRole,
  ) {
    if (entryClerkUserId === currentUserId) {
      return;
    }

    if (canViewAllTimeEntries(getRolePermissions(memberRole))) {
      return;
    }

    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  private async ensureTask(organizationId: string, taskId: string) {
    const task = await this.repository.findTask(organizationId, taskId);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    return task;
  }

  private validateDateRange(startedAt: Date, endedAt: Date) {
    if (endedAt <= startedAt) {
      throw new AppError(
        "endedAt must be greater than startedAt",
        400,
        "INVALID_TIME_RANGE",
      );
    }
  }

  async startTimer(
    organizationId: string,
    userId: string,
    taskId: string,
    body: StartTimerBody,
  ) {
    const task = await this.ensureTask(organizationId, taskId);

    const running = await this.repository.findRunningEntry(
      organizationId,
      userId,
    );

    if (running) {
      throw new AppError(
        "User already has a running timer",
        409,
        "TIMER_ALREADY_RUNNING",
      );
    }

    const entry = await this.repository.createEntry({
      organizationId,
      taskId: task.id,
      projectId: task.projectId,
      clientId: task.clientId,
      clerkUserId: userId,
      description: body.description,
      startedAt: new Date(),
      source: "TIMER",
      status: "RUNNING",
    });

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.TIME_STARTED,
      "Timer started",
      {
        clerkUserId: userId,
        metadata: { timeEntryId: entry.id },
      },
    );

    return entry;
  }

  async stopTimer(
    organizationId: string,
    userId: string,
    entryId: string,
    body: StopTimerBody,
  ) {
    const entry = await this.repository.findById(organizationId, entryId);

    if (!entry) {
      throw new AppError("Time entry not found", 404, "TIME_ENTRY_NOT_FOUND");
    }

    if (entry.status !== "RUNNING") {
      throw new AppError(
        "Only running timers can be stopped",
        400,
        "TIMER_NOT_RUNNING",
      );
    }

    if (entry.clerkUserId !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const endedAt = body.endedAt ?? new Date();
    this.validateDateRange(entry.startedAt, endedAt);

    const durationMinutes = calculateDurationMinutes(entry.startedAt, endedAt);

    const updated = await this.repository.updateEntry(
      organizationId,
      entry.id,
      {
        endedAt,
        durationMinutes,
        status: "STOPPED",
      },
    );

    if (!updated) {
      throw new AppError("Time entry not found", 404, "TIME_ENTRY_NOT_FOUND");
    }

    await this.activityService.log(
      organizationId,
      entry.taskId,
      TASK_ACTIVITY_TYPES.TIME_STOPPED,
      "Timer stopped",
      {
        clerkUserId: userId,
        metadata: {
          timeEntryId: entry.id,
          durationMinutes,
        },
      },
    );

    return updated;
  }

  async createManualEntry(
    organizationId: string,
    userId: string,
    taskId: string,
    body: ManualTimeEntryBody,
  ) {
    const task = await this.ensureTask(organizationId, taskId);
    this.validateDateRange(body.startedAt, body.endedAt);

    const durationMinutes =
      body.durationMinutes ??
      calculateDurationMinutes(body.startedAt, body.endedAt);

    const entry = await this.repository.createEntry({
      organizationId,
      taskId: task.id,
      projectId: task.projectId,
      clientId: task.clientId,
      clerkUserId: userId,
      description: body.description,
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      durationMinutes,
      source: "MANUAL",
      status: "STOPPED",
    });

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.TIME_MANUAL_CREATED,
      "Manual time entry created",
      {
        clerkUserId: userId,
        metadata: {
          timeEntryId: entry.id,
          durationMinutes,
        },
      },
    );

    return entry;
  }

  async listTaskTime(
    organizationId: string,
    userId: string,
    memberRole: OrganizationRole,
    taskId: string,
    query: ListTaskTimeQuery,
  ) {
    const task = await this.ensureTask(organizationId, taskId);
    const canViewAll = canViewAllTimeEntries(getRolePermissions(memberRole));

    const effectiveQuery = {
      ...query,
      clerkUserId: canViewAll ? query.clerkUserId : userId,
    };

    const { data, total } = await this.repository.listByTask(
      organizationId,
      taskId,
      effectiveQuery,
    );

    const aggregate = await this.repository.sumStoppedMinutesByTask(
      organizationId,
      taskId,
      effectiveQuery.clerkUserId,
    );

    const totalMinutes = aggregate._sum.durationMinutes ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
      summary: buildTimeProgressSummary(totalMinutes, task.estimatedMinutes),
    };
  }

  async getRunningTimer(organizationId: string, userId: string) {
    const entry = await this.repository.findRunningEntry(
      organizationId,
      userId,
    );

    return entry ?? null;
  }

  async updateEntry(
    organizationId: string,
    userId: string,
    memberRole: OrganizationRole,
    entryId: string,
    body: UpdateTimeEntryBody,
  ) {
    const entry = await this.repository.findById(organizationId, entryId);

    if (!entry) {
      throw new AppError("Time entry not found", 404, "TIME_ENTRY_NOT_FOUND");
    }

    this.ensureCanManageEntry(entry.clerkUserId, userId, memberRole);

    if (entry.status === "RUNNING" && body.endedAt) {
      throw new AppError(
        "Use stop endpoint to finish a running timer",
        400,
        "TIMER_MUST_BE_STOPPED",
      );
    }

    const startedAt = body.startedAt ?? entry.startedAt;
    const endedAt = body.endedAt ?? entry.endedAt;

    if (endedAt) {
      this.validateDateRange(startedAt, endedAt);
    }

    const updateData: {
      description?: string | null;
      startedAt?: Date;
      endedAt?: Date;
      durationMinutes?: number;
    } = {};

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.startedAt) {
      updateData.startedAt = body.startedAt;
    }

    if (body.endedAt) {
      updateData.endedAt = body.endedAt;
    }

    if (endedAt && entry.status === "STOPPED") {
      updateData.durationMinutes = calculateDurationMinutes(startedAt, endedAt);
    }

    const updated = await this.repository.updateEntry(
      organizationId,
      entry.id,
      updateData,
    );

    if (!updated) {
      throw new AppError("Time entry not found", 404, "TIME_ENTRY_NOT_FOUND");
    }

    await this.activityService.log(
      organizationId,
      entry.taskId,
      TASK_ACTIVITY_TYPES.TIME_ENTRY_UPDATED,
      "Time entry updated",
      {
        clerkUserId: userId,
        metadata: { timeEntryId: entry.id, fields: Object.keys(body) },
      },
    );

    return updated;
  }

  async deleteEntry(
    organizationId: string,
    userId: string,
    memberRole: OrganizationRole,
    entryId: string,
  ) {
    const entry = await this.repository.findById(organizationId, entryId);

    if (!entry) {
      throw new AppError("Time entry not found", 404, "TIME_ENTRY_NOT_FOUND");
    }

    this.ensureCanManageEntry(entry.clerkUserId, userId, memberRole);

    const deleted = await this.repository.softDeleteEntry(
      organizationId,
      entry.id,
    );

    if (!deleted) {
      throw new AppError("Time entry not found", 404, "TIME_ENTRY_NOT_FOUND");
    }

    await this.activityService.log(
      organizationId,
      entry.taskId,
      TASK_ACTIVITY_TYPES.TIME_ENTRY_DELETED,
      "Time entry deleted",
      {
        clerkUserId: userId,
        metadata: { timeEntryId: entry.id },
      },
    );

    return deleted;
  }

  async getProjectTimeSummary(
    organizationId: string,
    projectId: string,
    query: ProjectTimeSummaryQuery,
  ) {
    const project = await this.repository.findProject(organizationId, projectId);

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    const entries = await this.repository.listProjectStoppedEntries(
      organizationId,
      projectId,
      query,
    );

    const totalMinutes = entries.reduce(
      (sum, entry) => sum + (entry.durationMinutes ?? 0),
      0,
    );

    const byUserMap = new Map<string, number>();
    const byTaskMap = new Map<
      string,
      { taskId: string; title: string; totalMinutes: number }
    >();
    const byDayMap = new Map<string, number>();

    for (const entry of entries) {
      const minutes = entry.durationMinutes ?? 0;

      byUserMap.set(
        entry.clerkUserId,
        (byUserMap.get(entry.clerkUserId) ?? 0) + minutes,
      );

      const taskKey = entry.taskId;
      const existingTask = byTaskMap.get(taskKey);
      if (existingTask) {
        existingTask.totalMinutes += minutes;
      } else {
        byTaskMap.set(taskKey, {
          taskId: entry.task.id,
          title: entry.task.title,
          totalMinutes: minutes,
        });
      }

      if (query.groupBy === "day") {
        const dayKey = entry.startedAt.toISOString().slice(0, 10);
        byDayMap.set(dayKey, (byDayMap.get(dayKey) ?? 0) + minutes);
      }
    }

    return {
      project: {
        id: project.id,
        name: project.name,
      },
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      entriesCount: entries.length,
      byUser: Array.from(byUserMap.entries()).map(([clerkUserId, minutes]) => ({
        clerkUserId,
        totalMinutes: minutes,
        totalHours: Math.round((minutes / 60) * 100) / 100,
      })),
      byTask: Array.from(byTaskMap.values()).map((item) => ({
        ...item,
        totalHours: Math.round((item.totalMinutes / 60) * 100) / 100,
      })),
      ...(query.groupBy === "day"
        ? {
            byDay: Array.from(byDayMap.entries())
              .map(([date, minutes]) => ({
                date,
                totalMinutes: minutes,
                totalHours: Math.round((minutes / 60) * 100) / 100,
              }))
              .sort((a, b) => a.date.localeCompare(b.date)),
          }
        : {}),
    };
  }

  async getTaskTimeSummary(
    organizationId: string,
    taskId: string,
    userId: string,
    memberRole: OrganizationRole,
    estimatedMinutes: number | null | undefined,
  ) {
    const canViewAll = canViewAllTimeEntries(getRolePermissions(memberRole));

    const aggregate = await this.repository.sumStoppedMinutesByTask(
      organizationId,
      taskId,
      canViewAll ? undefined : userId,
    );

    const runningEntry = await this.repository.findRunningEntryForUserOnTask(
      organizationId,
      taskId,
      userId,
    );

    return {
      ...buildTimeProgressSummary(
        aggregate._sum.durationMinutes ?? 0,
        estimatedMinutes,
      ),
      runningEntry,
    };
  }

  async enrichBoardTasks(
    organizationId: string,
    userId: string,
    memberRole: OrganizationRole,
    tasks: Array<{ id: string; estimatedMinutes: number | null }>,
  ) {
    const taskIds = tasks.map((task) => task.id);
    const canViewAll = canViewAllTimeEntries(getRolePermissions(memberRole));

    const [totals, runningTaskIds] = await Promise.all([
      this.repository.sumStoppedMinutesByTasks(
        organizationId,
        taskIds,
        canViewAll ? undefined : userId,
      ),
      this.repository.findRunningTaskIdsForUser(
        organizationId,
        taskIds,
        userId,
      ),
    ]);

    const totalsMap = new Map(totals.map((row) => [row.taskId, row.total]));
    const runningSet = new Set(runningTaskIds);

    return tasks.map((task) => ({
      ...task,
      totalTrackedMinutes: totalsMap.get(task.id) ?? 0,
      hasRunningTimerForCurrentUser: runningSet.has(task.id),
    }));
  }
}
