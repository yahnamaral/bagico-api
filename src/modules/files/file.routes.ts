import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { TaskActivityRepository } from "../tasks/task-activity.repository";
import { TaskActivityService } from "../tasks/task-activity.service";
import { TaskRepository } from "../tasks/task.repository";
import { FileController } from "./file.controller";
import { FileRepository } from "./file.repository";
import { FileService } from "./file.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const viewFiles = [
  ...withOrgContext,
  requirePermission("view_tasks"),
  requireFeature("kanban"),
] as const;

const manageFiles = [
  ...withOrgContext,
  requirePermission("manage_tasks"),
  requireFeature("kanban"),
] as const;

export async function fileRoutes(app: FastifyInstance) {
  const repository = new FileRepository();
  const taskRepository = new TaskRepository();
  const activityService = new TaskActivityService(new TaskActivityRepository());
  const service = new FileService(repository, taskRepository, activityService);
  const controller = new FileController(service);

  app.get("/:taskId/files", { preHandler: [...viewFiles] }, async (request) =>
    controller.list(request),
  );

  app.post("/:taskId/files", { preHandler: [...manageFiles] }, async (request) =>
    controller.create(request),
  );

  app.delete(
    "/:taskId/files/:fileId",
    { preHandler: [...manageFiles] },
    async (request) => controller.remove(request),
  );
}
