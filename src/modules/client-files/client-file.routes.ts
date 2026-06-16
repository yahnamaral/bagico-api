import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { ClientRepository } from "../clients/client.repository";
import { ClientFileController } from "./client-file.controller";
import { ClientFileRepository } from "./client-file.repository";
import { ClientFileService } from "./client-file.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const viewClientFiles = [
  ...withOrgContext,
  requirePermission("view_clients"),
  requireFeature("clients"),
] as const;

const manageClientFiles = [
  ...withOrgContext,
  requirePermission("manage_clients"),
  requireFeature("clients"),
] as const;

export async function clientFileRoutes(app: FastifyInstance) {
  const repository = new ClientFileRepository();
  const clientRepository = new ClientRepository();
  const service = new ClientFileService(repository, clientRepository);
  const controller = new ClientFileController(service);

  app.get(
    "/:clientId/files",
    { preHandler: [...viewClientFiles] },
    async (request) => controller.list(request),
  );

  app.post(
    "/:clientId/files",
    { preHandler: [...manageClientFiles] },
    async (request) => controller.create(request),
  );

  app.delete(
    "/:clientId/files/:fileId",
    { preHandler: [...manageClientFiles] },
    async (request) => controller.remove(request),
  );
}
