import type { FastifyRequest } from "fastify";
import type { CommentService } from "./comment.service";
import {
  commentParamsSchema,
  createCommentBodySchema,
  taskIdParamSchema,
  updateCommentBodySchema,
} from "./comment.schemas";

export class CommentController {
  constructor(private readonly service: CommentService) {}

  list(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);

    return this.service.list(request.organization!.id, taskId);
  }

  create(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const body = createCommentBodySchema.parse(request.body);

    return this.service.create(
      request.organization!.id,
      taskId,
      request.auth!.userId,
      body,
    );
  }

  update(request: FastifyRequest) {
    const { taskId, commentId } = commentParamsSchema.parse(request.params);
    const body = updateCommentBodySchema.parse(request.body);

    return this.service.update(
      request.organization!.id,
      taskId,
      commentId,
      request.auth!.userId,
      body,
    );
  }

  remove(request: FastifyRequest) {
    const { taskId, commentId } = commentParamsSchema.parse(request.params);

    return this.service.remove(
      request.organization!.id,
      taskId,
      commentId,
      request.auth!.userId,
      request.member!.role,
    );
  }
}
