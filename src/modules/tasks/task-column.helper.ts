import { prisma } from "../../infrastructure/database/prisma";
import { normalizeColumnName } from "./task.helpers";

const taskInclude = {
  board: { select: { id: true, name: true } },
  column: { select: { id: true, name: true, position: true } },
  project: { select: { id: true, name: true } },
  client: { select: { id: true, name: true, segment: true } },
} as const;

type MoveTaskToColumnInput = {
  taskId: string;
  organizationId: string;
  boardId: string;
  columnName: string;
};

async function findColumnByName(
  organizationId: string,
  boardId: string,
  columnName: string,
) {
  const columns = await prisma.boardColumn.findMany({
    where: {
      boardId,
      organizationId,
      deletedAt: null,
    },
  });

  const normalizedTarget = normalizeColumnName(columnName);

  return (
    columns.find(
      (column) => normalizeColumnName(column.name) === normalizedTarget,
    ) ?? null
  );
}

export async function moveTaskToColumnByName({
  taskId,
  organizationId,
  boardId,
  columnName,
}: MoveTaskToColumnInput) {
  const targetColumn = await findColumnByName(
    organizationId,
    boardId,
    columnName,
  );

  if (!targetColumn) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        boardId,
        deletedAt: null,
      },
    });

    if (!task || task.columnId === targetColumn.id) {
      if (!task) {
        return null;
      }

      return tx.task.findFirst({
        where: { id: taskId },
        include: taskInclude,
      });
    }

    await tx.task.updateMany({
      where: {
        organizationId,
        columnId: task.columnId,
        deletedAt: null,
        position: { gt: task.position },
      },
      data: { position: { decrement: 1 } },
    });

    const maxPosition = await tx.task.aggregate({
      where: {
        organizationId,
        columnId: targetColumn.id,
        deletedAt: null,
      },
      _max: { position: true },
    });

    const newPosition = (maxPosition._max.position ?? 0) + 1;

    await tx.task.update({
      where: { id: taskId },
      data: {
        columnId: targetColumn.id,
        position: newPosition,
      },
    });

    return tx.task.findFirst({
      where: { id: taskId },
      include: taskInclude,
    });
  });
}

export async function tryMoveTaskToColumnByName(
  input: MoveTaskToColumnInput,
): Promise<boolean> {
  const result = await moveTaskToColumnByName(input);
  if (!result) {
    return false;
  }

  const targetColumn = await findColumnByName(
    input.organizationId,
    input.boardId,
    input.columnName,
  );

  return targetColumn !== null && result.columnId === targetColumn.id;
}
