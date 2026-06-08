import type { FastifyRequest } from "fastify";
import type { ProfitHunterService } from "./profit-hunter.service";
import {
  profitHunterClientIdParamSchema,
  profitHunterDateRangeQuerySchema,
  profitHunterProjectIdParamSchema,
  profitHunterProjectsQuerySchema,
} from "./profit-hunter.schemas";

export class ProfitHunterController {
  constructor(private readonly service: ProfitHunterService) {}

  getOverview(request: FastifyRequest) {
    const query = profitHunterDateRangeQuerySchema.parse(request.query);

    return this.service.getOverview(request.organization!.id, query);
  }

  listClients(request: FastifyRequest) {
    const query = profitHunterDateRangeQuerySchema.parse(request.query);

    return this.service.listClients(request.organization!.id, query);
  }

  getClientDetail(request: FastifyRequest) {
    const { clientId } = profitHunterClientIdParamSchema.parse(request.params);
    const query = profitHunterDateRangeQuerySchema.parse(request.query);

    return this.service.getClientDetail(
      request.organization!.id,
      clientId,
      query,
    );
  }

  listProjects(request: FastifyRequest) {
    const query = profitHunterProjectsQuerySchema.parse(request.query);

    return this.service.listProjects(request.organization!.id, query);
  }

  getProjectDetail(request: FastifyRequest) {
    const { projectId } = profitHunterProjectIdParamSchema.parse(
      request.params,
    );
    const query = profitHunterDateRangeQuerySchema.parse(request.query);

    return this.service.getProjectDetail(
      request.organization!.id,
      projectId,
      query,
    );
  }
}
