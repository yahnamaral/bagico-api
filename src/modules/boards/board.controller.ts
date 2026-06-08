import type { FastifyRequest } from "fastify";
import type { BoardService } from "./board.service";
import {
  boardColumnParamsSchema,
  boardIdParamSchema,
  createBoardBodySchema,
  createColumnBodySchema,
  listBoardsQuerySchema,
  reorderColumnsBodySchema,
  updateBoardBodySchema,
  updateColumnBodySchema,
} from "./board.schemas";

export class BoardController {
  constructor(private readonly service: BoardService) {}

  list(request: FastifyRequest) {
    const query = listBoardsQuerySchema.parse(request.query);

    return this.service.list(request.organization!.id, query);
  }

  create(request: FastifyRequest) {
    const body = createBoardBodySchema.parse(request.body);

    return this.service.create(request.organization!.id, body);
  }

  getById(request: FastifyRequest) {
    const { id } = boardIdParamSchema.parse(request.params);

    return this.service.getById(
      request.organization!.id,
      id,
      request.auth!.userId,
      request.member!.role,
    );
  }

  update(request: FastifyRequest) {
    const { id } = boardIdParamSchema.parse(request.params);
    const body = updateBoardBodySchema.parse(request.body);

    return this.service.update(request.organization!.id, id, body);
  }

  remove(request: FastifyRequest) {
    const { id } = boardIdParamSchema.parse(request.params);

    return this.service.remove(request.organization!.id, id);
  }

  createColumn(request: FastifyRequest) {
    const { id } = boardIdParamSchema.parse(request.params);
    const body = createColumnBodySchema.parse(request.body);

    return this.service.createColumn(request.organization!.id, id, body);
  }

  updateColumn(request: FastifyRequest) {
    const { id, columnId } = boardColumnParamsSchema.parse(request.params);
    const body = updateColumnBodySchema.parse(request.body);

    return this.service.updateColumn(
      request.organization!.id,
      id,
      columnId,
      body,
    );
  }

  removeColumn(request: FastifyRequest) {
    const { id, columnId } = boardColumnParamsSchema.parse(request.params);

    return this.service.removeColumn(
      request.organization!.id,
      id,
      columnId,
    );
  }

  reorderColumns(request: FastifyRequest) {
    const { id } = boardIdParamSchema.parse(request.params);
    const body = reorderColumnsBodySchema.parse(request.body);

    return this.service.reorderColumns(request.organization!.id, id, body);
  }
}
