import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { ClientController } from "./client.controller";
import { ClientRepository } from "./client.repository";
import { ClientService } from "./client.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

export async function clientRoutes(app: FastifyInstance) {
  const repository = new ClientRepository();
  const service = new ClientService(repository);
  const controller = new ClientController(service);

  app.get(
    "/",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("view_clients"),
        requireFeature("clients"),
      ],
    },
    async (request) => controller.list(request),
  );

  app.post(
    "/",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_clients"),
        requireFeature("clients"),
      ],
    },
    async (request) => controller.create(request),
  );

  app.get(
    "/:id",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("view_clients"),
        requireFeature("clients"),
      ],
    },
    async (request) => controller.getById(request),
  );

  app.patch(
    "/:id",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_clients"),
        requireFeature("clients"),
      ],
    },
    async (request) => controller.update(request),
  );

  app.delete(
    "/:id",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_clients"),
        requireFeature("clients"),
      ],
    },
    async (request) => controller.remove(request),
  );
}
