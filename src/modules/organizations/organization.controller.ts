import type { FastifyRequest } from "fastify";
import type { OrganizationService } from "./organization.service";
import { syncOrganizationBodySchema } from "./organization.schemas";

export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  async sync(request: FastifyRequest) {
    const body = syncOrganizationBodySchema.parse(request.body);

    return this.service.sync({
      userId: request.auth!.userId,
      authOrgId: request.auth!.orgId,
      body,
    });
  }

  async getCurrent(request: FastifyRequest) {
    return this.service.getCurrent({
      userId: request.auth!.userId,
      authOrgId: request.auth!.orgId,
    });
  }
}
