import type { FastifyRequest } from "fastify";
import type { FileService } from "./file.service";
import {
  createFileBodySchema,
  fileParamsSchema,
  taskIdParamSchema,
} from "./file.schemas";

export class FileController {
  constructor(private readonly service: FileService) {}

  list(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);

    return this.service.list(request.organization!.id, taskId);
  }

  create(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const body = createFileBodySchema.parse(request.body);

    return this.service.create(
      request.organization!.id,
      taskId,
      request.auth!.userId,
      body,
    );
  }

  remove(request: FastifyRequest) {
    const { taskId, fileId } = fileParamsSchema.parse(request.params);

    return this.service.remove(
      request.organization!.id,
      taskId,
      fileId,
      request.auth!.userId,
    );
  }
}
