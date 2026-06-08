import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { OrganizationController } from "./organization.controller";
import { OrganizationRepository } from "./organization.repository";
import { OrganizationService } from "./organization.service";

export async function organizationRoutes(app: FastifyInstance) {
  const repository = new OrganizationRepository();
  const service = new OrganizationService(repository);
  const controller = new OrganizationController(service);

  app.post(
    "/sync",
    { preHandler: [requireAuth] },
    async (request) => controller.sync(request),
  );

  app.get(
    "/current",
    { preHandler: [requireAuth] },
    async (request) => controller.getCurrent(request),
  );
}
