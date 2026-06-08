import type { FastifyRequest } from "fastify";
import type { ClientService } from "./client.service";
import {
  clientIdParamSchema,
  createClientBodySchema,
  listClientsQuerySchema,
  updateClientBodySchema,
} from "./client.schemas";

export class ClientController {
  constructor(private readonly service: ClientService) {}

  list(request: FastifyRequest) {
    const query = listClientsQuerySchema.parse(request.query);

    return this.service.list(request.organization!.id, query);
  }

  create(request: FastifyRequest) {
    const body = createClientBodySchema.parse(request.body);

    return this.service.create(request.organization!.id, body);
  }

  getById(request: FastifyRequest) {
    const { id } = clientIdParamSchema.parse(request.params);

    return this.service.getById(request.organization!.id, id);
  }

  update(request: FastifyRequest) {
    const { id } = clientIdParamSchema.parse(request.params);
    const body = updateClientBodySchema.parse(request.body);

    return this.service.update(request.organization!.id, id, body);
  }

  remove(request: FastifyRequest) {
    const { id } = clientIdParamSchema.parse(request.params);

    return this.service.remove(request.organization!.id, id);
  }
}
