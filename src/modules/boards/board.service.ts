import type { Board, BoardColumn, OrganizationRole } from "../../../generated/prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { ProjectRepository } from "../projects/project.repository";
import type { TimeEntryService } from "../time-tracking/time-entry.service";
import type { BoardDetail, BoardRepository } from "./board.repository";
import type {
  CreateBoardBody,
  CreateColumnBody,
  ListBoardsQuery,
  ReorderColumnsBody,
  UpdateBoardBody,
  UpdateColumnBody,
} from "./board.schemas";

export class BoardService {
  constructor(
    private readonly repository: BoardRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly timeEntryService?: TimeEntryService,
  ) {}

  private async ensureProjectBelongsToOrganization(
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findById(
      organizationId,
      projectId,
    );

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }
  }

  private async ensureBoardExists(
    organizationId: string,
    boardId: string,
  ): Promise<Board> {
    const board = await this.repository.findBoardOnly(organizationId, boardId);

    if (!board) {
      throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
    }

    return board;
  }

  async list(organizationId: string, query: ListBoardsQuery) {
    if (query.projectId) {
      await this.ensureProjectBelongsToOrganization(
        organizationId,
        query.projectId,
      );
    }

    const [data, total] = await Promise.all([
      this.repository.findMany(organizationId, query),
      this.repository.count(organizationId, {
        search: query.search,
        projectId: query.projectId,
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
    body: CreateBoardBody,
  ): Promise<BoardDetail> {
    await this.ensureProjectBelongsToOrganization(
      organizationId,
      body.projectId,
    );

    return this.repository.createWithDefaultColumns(organizationId, body);
  }

  async getById(
    organizationId: string,
    id: string,
    userId?: string,
    memberRole?: OrganizationRole,
  ) {
    const board = await this.repository.findById(organizationId, id);

    if (!board) {
      throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
    }

    if (!this.timeEntryService || !userId || !memberRole) {
      return board;
    }

    const enrichedTasks = await this.timeEntryService.enrichBoardTasks(
      organizationId,
      userId,
      memberRole,
      board.tasks.map((task) => ({
        id: task.id,
        estimatedMinutes: task.estimatedMinutes,
      })),
    );

    const enrichedTasksMap = new Map(
      enrichedTasks.map((task) => [task.id, task]),
    );

    return {
      ...board,
      tasks: board.tasks.map((task) => {
        const meta = enrichedTasksMap.get(task.id);

        return {
          ...task,
          estimatedMinutes: task.estimatedMinutes,
          totalTrackedMinutes: meta?.totalTrackedMinutes ?? 0,
          hasRunningTimerForCurrentUser:
            meta?.hasRunningTimerForCurrentUser ?? false,
        };
      }),
    };
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateBoardBody,
  ): Promise<Board> {
    const board = await this.repository.update(organizationId, id, body);

    if (!board) {
      throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
    }

    return board;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const deleted = await this.repository.softDelete(organizationId, id);

    if (!deleted) {
      throw new AppError("Board not found", 404, "BOARD_NOT_FOUND");
    }
  }

  async createColumn(
    organizationId: string,
    boardId: string,
    body: CreateColumnBody,
  ): Promise<BoardColumn> {
    await this.ensureBoardExists(organizationId, boardId);

    return this.repository.createColumn(organizationId, boardId, body);
  }

  async updateColumn(
    organizationId: string,
    boardId: string,
    columnId: string,
    body: UpdateColumnBody,
  ): Promise<BoardColumn> {
    await this.ensureBoardExists(organizationId, boardId);

    const column = await this.repository.updateColumn(
      organizationId,
      boardId,
      columnId,
      body,
    );

    if (!column) {
      throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
    }

    return column;
  }

  async removeColumn(
    organizationId: string,
    boardId: string,
    columnId: string,
  ): Promise<void> {
    await this.ensureBoardExists(organizationId, boardId);

    const column = await this.repository.findColumn(
      organizationId,
      boardId,
      columnId,
    );

    if (!column) {
      throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
    }

    const activeTasks = await this.repository.countActiveTasksInColumn(
      organizationId,
      columnId,
    );

    if (activeTasks > 0) {
      throw new AppError(
        "Cannot delete column with active tasks",
        400,
        "COLUMN_HAS_TASKS",
      );
    }

    const deleted = await this.repository.softDeleteColumn(
      organizationId,
      boardId,
      columnId,
    );

    if (!deleted) {
      throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
    }
  }

  async reorderColumns(
    organizationId: string,
    boardId: string,
    body: ReorderColumnsBody,
  ): Promise<BoardColumn[]> {
    await this.ensureBoardExists(organizationId, boardId);

    const existingColumns = await this.repository.findColumnsByBoard(
      organizationId,
      boardId,
    );

    const existingIds = new Set(existingColumns.map((column) => column.id));

    for (const column of body.columns) {
      if (!existingIds.has(column.id)) {
        throw new AppError("Column not found", 404, "COLUMN_NOT_FOUND");
      }
    }

    return this.repository.reorderColumns(organizationId, boardId, body);
  }
}
