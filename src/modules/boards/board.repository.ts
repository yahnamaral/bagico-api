import type { Board, BoardColumn, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { DEFAULT_BOARD_COLUMNS } from "./board.constants";
import type {
  CreateBoardBody,
  CreateColumnBody,
  ListBoardsQuery,
  ReorderColumnsBody,
  UpdateBoardBody,
  UpdateColumnBody,
} from "./board.schemas";

type ListFilters = Pick<ListBoardsQuery, "search" | "projectId">;

const projectWithClientSelect = {
  select: {
    id: true,
    name: true,
    client: {
      select: {
        id: true,
        name: true,
        segment: true,
      },
    },
  },
} as const;

export type BoardListItem = Prisma.BoardGetPayload<{
  include: { project: typeof projectWithClientSelect };
}>;

export type BoardDetail = Prisma.BoardGetPayload<{
  include: {
    project: typeof projectWithClientSelect;
    columns: true;
    tasks: true;
  };
}>;

export class BoardRepository {
  protected readonly db = prisma;

  private buildWhere(
    organizationId: string,
    filters: ListFilters,
  ): Prisma.BoardWhereInput {
    const where: Prisma.BoardWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (filters.projectId) {
      where.projectId = filters.projectId;
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
    query: ListBoardsQuery,
  ): Promise<BoardListItem[]> {
    const { page, limit, search, projectId } = query;
    const skip = (page - 1) * limit;

    return this.db.board.findMany({
      where: this.buildWhere(organizationId, { search, projectId }),
      include: { project: projectWithClientSelect },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });
  }

  count(organizationId: string, filters: ListFilters): Promise<number> {
    return this.db.board.count({
      where: this.buildWhere(organizationId, filters),
    });
  }

  findById(organizationId: string, id: string): Promise<BoardDetail | null> {
    return this.db.board.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        project: projectWithClientSelect,
        columns: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  findBoardOnly(
    organizationId: string,
    id: string,
  ): Promise<Board | null> {
    return this.db.board.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  createWithDefaultColumns(
    organizationId: string,
    data: CreateBoardBody,
  ): Promise<BoardDetail> {
    return this.db.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          organizationId,
          projectId: data.projectId,
          name: data.name,
          description: data.description,
        },
      });

      await tx.boardColumn.createMany({
        data: DEFAULT_BOARD_COLUMNS.map((name, index) => ({
          organizationId,
          boardId: board.id,
          name,
          position: index + 1,
        })),
      });

      return tx.board.findFirstOrThrow({
        where: { id: board.id },
        include: {
          project: projectWithClientSelect,
          columns: {
            where: { deletedAt: null },
            orderBy: { position: "asc" },
          },
          tasks: {
            where: { deletedAt: null },
            orderBy: { position: "asc" },
          },
        },
      });
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: UpdateBoardBody,
  ): Promise<Board | null> {
    const result = await this.db.board.updateMany({
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

    return this.findBoardOnly(organizationId, id);
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      const board = await tx.board.findFirst({
        where: { id, organizationId, deletedAt: null },
      });

      if (!board) {
        return false;
      }

      await tx.task.updateMany({
        where: { boardId: id, organizationId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.boardColumn.updateMany({
        where: { boardId: id, organizationId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.board.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: now },
      });

      return true;
    });
  }

  findColumn(
    organizationId: string,
    boardId: string,
    columnId: string,
  ): Promise<BoardColumn | null> {
    return this.db.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  findColumnsByBoard(
    organizationId: string,
    boardId: string,
  ): Promise<BoardColumn[]> {
    return this.db.boardColumn.findMany({
      where: {
        boardId,
        organizationId,
        deletedAt: null,
      },
      orderBy: { position: "asc" },
    });
  }

  async getMaxColumnPosition(
    organizationId: string,
    boardId: string,
  ): Promise<number> {
    const result = await this.db.boardColumn.aggregate({
      where: {
        boardId,
        organizationId,
        deletedAt: null,
      },
      _max: { position: true },
    });

    return result._max.position ?? 0;
  }

  async createColumn(
    organizationId: string,
    boardId: string,
    data: CreateColumnBody,
  ): Promise<BoardColumn> {
    const maxPosition = await this.getMaxColumnPosition(organizationId, boardId);

    return this.db.boardColumn.create({
      data: {
        organizationId,
        boardId,
        name: data.name,
        color: data.color,
        position: maxPosition + 1,
      },
    });
  }

  async updateColumn(
    organizationId: string,
    boardId: string,
    columnId: string,
    data: UpdateColumnBody,
  ): Promise<BoardColumn | null> {
    const result = await this.db.boardColumn.updateMany({
      where: {
        id: columnId,
        boardId,
        organizationId,
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findColumn(organizationId, boardId, columnId);
  }

  countActiveTasksInColumn(
    organizationId: string,
    columnId: string,
  ): Promise<number> {
    return this.db.task.count({
      where: {
        organizationId,
        columnId,
        deletedAt: null,
      },
    });
  }

  async softDeleteColumn(
    organizationId: string,
    boardId: string,
    columnId: string,
  ): Promise<boolean> {
    const result = await this.db.boardColumn.updateMany({
      where: {
        id: columnId,
        boardId,
        organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  }

  reorderColumns(
    organizationId: string,
    boardId: string,
    data: ReorderColumnsBody,
  ): Promise<BoardColumn[]> {
    return this.db.$transaction(async (tx) => {
      for (const column of data.columns) {
        await tx.boardColumn.updateMany({
          where: {
            id: column.id,
            boardId,
            organizationId,
            deletedAt: null,
          },
          data: { position: column.position },
        });
      }

      return tx.boardColumn.findMany({
        where: {
          boardId,
          organizationId,
          deletedAt: null,
        },
        orderBy: { position: "asc" },
      });
    });
  }
}
