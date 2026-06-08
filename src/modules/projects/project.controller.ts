import type { FastifyRequest } from "fastify";
import type { ProjectService } from "./project.service";
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectBodySchema,
} from "./project.schemas";

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list(request: FastifyRequest) {
    const query = listProjectsQuerySchema.parse(request.query);

    return this.service.list(request.organization!.id, query);
  }

  create(request: FastifyRequest) {
    const body = createProjectBodySchema.parse(request.body);

    return this.service.create(request.organization!.id, body);
  }

  getById(request: FastifyRequest) {
    const { id } = projectIdParamSchema.parse(request.params);

    return this.service.getById(request.organization!.id, id);
  }

  update(request: FastifyRequest) {
    const { id } = projectIdParamSchema.parse(request.params);
    const body = updateProjectBodySchema.parse(request.body);

    return this.service.update(request.organization!.id, id, body);
  }

  remove(request: FastifyRequest) {
    const { id } = projectIdParamSchema.parse(request.params);

    return this.service.remove(request.organization!.id, id);
  }
}
