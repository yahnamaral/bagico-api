import type { OrganizationRole } from "../../../generated/prisma/client";
import { AppError } from "../../shared/errors/AppError";
import {
  fireNotification,
} from "../notifications/notification.helpers";
import { notificationEvents } from "../notifications/notification-events.instance";
import { BoardRepository } from "../boards/board.repository";
import { ClientRepository } from "../clients/client.repository";
import { ProjectRepository } from "../projects/project.repository";
import type { TimeEntryService } from "../time-tracking/time-entry.service";
import { TASK_ACTIVITY_TYPES } from "./task-activity.constants";
import type { TaskActivityService } from "./task-activity.service";
import { statusFromColumnName } from "./task.helpers";
import type { TaskDetail, TaskDetailWithCounts, TaskRepository } from "./task.repository";
import type {
  CreateTaskBody,
  ListTasksQuery,
  MoveTaskBody,
  UpdateTaskBody,
} from "./task.schemas";

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly boardRepository: BoardRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly clientRepository: ClientRepository,
    private readonly activityService: TaskActivityService,
    private readonly timeEntryService?: TimeEntryService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    query: ListTasksQuery,
  ) {
    if (query.boardId) {
      const board = await this.boardRepository.findBoardOnly(
        organizationId,
        query.boardId,
      );

      if (!board) {
        throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
      }
    }

    if (query.projectId) {
      const project = await this.projectRepository.findById(
        organizationId,
        query.projectId,
      );

      if (!project) {
        throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
      }
    }

    if (query.clientId) {
      const client = await this.clientRepository.findById(
        organizationId,
        query.clientId,
      );

      if (!client) {
        throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
      }
    }

    const filters = {
      ...query,
      assignedToClerkUserId: query.assignedToMe ? userId : undefined,
    };

    const [data, total] = await Promise.all([
      this.repository.findMany(organizationId, filters),
      this.repository.count(organizationId, {
        boardId: query.boardId,
        projectId: query.projectId,
        clientId: query.clientId,
        assignedToClerkUserId: filters.assignedToClerkUserId,
        status: query.status,
        priority: query.priority,
        search: query.search,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async create(
    organizationId: string,
    userId: string,
    body: CreateTaskBody,
  ): Promise<TaskDetail> {
    const board = await this.boardRepository.findBoardOnly(
      organizationId,
      body.boardId,
    );

    if (!board) {
      throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
    }

    const column = await this.boardRepository.findColumn(
      organizationId,
      body.boardId,
      body.columnId,
    );

    if (!column) {
      throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
    }

    const project = await this.projectRepository.findById(
      organizationId,
      board.projectId,
    );

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    const maxPosition = await this.repository.getMaxPositionInColumn(
      organizationId,
      body.columnId,
    );

    const task = await this.repository.create(organizationId, {
      boardId: body.boardId,
      columnId: body.columnId,
      projectId: project.id,
      clientId: project.clientId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      mediaType: body.mediaType,
      dueDate: body.dueDate,
      assignedToClerkUserId: body.assignedToClerkUserId,
      createdByClerkUserId: userId,
      position: maxPosition + 1,
      status: statusFromColumnName(column.name),
    });

    await this.activityService.log(
      organizationId,
      task.id,
      TASK_ACTIVITY_TYPES.TASK_CREATED,
      "Task created",
      {
        clerkUserId: userId,
        metadata: { title: task.title, boardId: task.boardId },
      },
    );

    if (task.assignedToClerkUserId) {
      fireNotification(() =>
        notificationEvents.notifyTaskAssigned({
          organizationId,
          task,
          assignedToClerkUserId: task.assignedToClerkUserId!,
          actorClerkUserId: userId,
        }),
      );
    }

    return task;
  }

  async getById(
    organizationId: string,
    id: string,
    userId?: string,
    memberRole?: OrganizationRole,
  ) {
    const task = await this.repository.findByIdWithCounts(organizationId, id);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    if (!this.timeEntryService || !userId || !memberRole) {
      return task;
    }

    const timeSummary = await this.timeEntryService.getTaskTimeSummary(
      organizationId,
      id,
      userId,
      memberRole,
      task.estimatedMinutes,
    );

    return {
      ...task,
      timeSummary,
    };
  }

  async getActivity(organizationId: string, taskId: string) {
    const task = await this.repository.findById(organizationId, taskId);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    return this.activityService.listByTask(organizationId, taskId);
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    body: UpdateTaskBody,
  ): Promise<TaskDetail> {
    const previousTask = await this.repository.findById(organizationId, id);

    if (!previousTask) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    const task = await this.repository.update(organizationId, id, body);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    await this.activityService.log(
      organizationId,
      id,
      TASK_ACTIVITY_TYPES.TASK_UPDATED,
      "Task updated",
      {
        clerkUserId: userId,
        metadata: { fields: Object.keys(body) },
      },
    );

    if (
      body.assignedToClerkUserId !== undefined &&
      body.assignedToClerkUserId !== previousTask.assignedToClerkUserId &&
      body.assignedToClerkUserId
    ) {
      fireNotification(() =>
        notificationEvents.notifyTaskAssigned({
          organizationId,
          task,
          assignedToClerkUserId: body.assignedToClerkUserId!,
          actorClerkUserId: userId,
        }),
      );
    }

    return task;
  }

  async move(
    organizationId: string,
    id: string,
    userId: string,
    body: MoveTaskBody,
  ): Promise<TaskDetail> {
    const existingTask = await this.repository.findById(organizationId, id);

    if (!existingTask) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    const fromColumnId = existingTask.columnId;

    const task = await this.repository.moveTask(
      organizationId,
      id,
      body.targetColumnId,
      body.targetPosition,
    );

    if (!task) {
      throw new AppError("Invalid move target", 400, "INVALID_MOVE");
    }

    await this.activityService.log(
      organizationId,
      id,
      TASK_ACTIVITY_TYPES.TASK_MOVED,
      "Task moved",
      {
        clerkUserId: userId,
        metadata: {
          fromColumnId,
          toColumnId: body.targetColumnId,
          targetPosition: body.targetPosition,
          isRework: task.isRework,
        },
      },
    );

    return task;
  }

  async remove(organizationId: string, id: string): Promise<TaskDetail> {
    const task = await this.repository.softDelete(organizationId, id);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    return task;
  }
}
