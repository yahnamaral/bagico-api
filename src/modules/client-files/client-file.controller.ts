import type { FastifyRequest } from "fastify";
import type { ClientFileService } from "./client-file.service";
import {
  clientFileParamsSchema,
  clientIdParamSchema,
  createClientFileBodySchema,
} from "./client-file.schemas";

export class ClientFileController {
  constructor(private readonly service: ClientFileService) {}

  list(request: FastifyRequest) {
    const { clientId } = clientIdParamSchema.parse(request.params);

    return this.service.list(request.organization!.id, clientId);
  }

  create(request: FastifyRequest) {
    const { clientId } = clientIdParamSchema.parse(request.params);
    const body = createClientFileBodySchema.parse(request.body);

    return this.service.create(
      request.organization!.id,
      clientId,
      request.auth!.userId,
      body,
    );
  }

  remove(request: FastifyRequest) {
    const { clientId, fileId } = clientFileParamsSchema.parse(request.params);

    return this.service.remove(request.organization!.id, clientId, fileId);
  }
}
