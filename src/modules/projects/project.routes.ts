import type { FastifyInstance } from "fastify";
import { ClientRepository } from "../clients/client.repository";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { ProjectController } from "./project.controller";
import { ProjectRepository } from "./project.repository";
import { ProjectService } from "./project.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

export async function projectRoutes(app: FastifyInstance) {
  const repository = new ProjectRepository();
  const clientRepository = new ClientRepository();
  const service = new ProjectService(repository, clientRepository);
  const controller = new ProjectController(service);

  app.get(
    "/",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("view_projects"),
        requireFeature("projects"),
      ],
    },
    async (request) => controller.list(request),
  );

  app.post(
    "/",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_projects"),
        requireFeature("projects"),
      ],
    },
    async (request) => controller.create(request),
  );

  app.get(
    "/:id",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("view_projects"),
        requireFeature("projects"),
      ],
    },
     async (request) => controller.getById(request),
  );

  app.patch(
    "/:id",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_projects"),
        requireFeature("projects"),
      ],
    },
    async (request) => controller.update(request),
  );

  app.delete(
    "/:id",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_projects"),
        requireFeature("projects"),
      ],
    },
    async (request) => controller.remove(request),
  );
}
