import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireAnyPermission } from "../../shared/middlewares/requireAnyPermission";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { TaskActivityRepository } from "../tasks/task-activity.repository";
import { TaskActivityService } from "../tasks/task-activity.service";
import { TaskRepository } from "../tasks/task.repository";
import { CommentController } from "./comment.controller";
import { CommentRepository } from "./comment.repository";
import { CommentService } from "./comment.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const viewComments = [
  ...withOrgContext,
  requireAnyPermission(["comment_tasks", "view_tasks"]),
  requireFeature("kanban"),
] as const;

const manageComments = [
  ...withOrgContext,
  requirePermission("comment_tasks"),
  requireFeature("kanban"),
] as const;

export async function commentRoutes(app: FastifyInstance) {
  const repository = new CommentRepository();
  const taskRepository = new TaskRepository();
  const activityService = new TaskActivityService(new TaskActivityRepository());
  const service = new CommentService(repository, taskRepository, activityService);
  const controller = new CommentController(service);

  app.get("/:taskId/comments", { preHandler: [...viewComments] }, async (request) =>
    controller.list(request),
  );

  app.post("/:taskId/comments", { preHandler: [...manageComments] }, async (request) =>
    controller.create(request),
  );

  app.patch(
    "/:taskId/comments/:commentId",
    { preHandler: [...manageComments] },
    async (request) => controller.update(request),
  );

  app.delete(
    "/:taskId/comments/:commentId",
    { preHandler: [...manageComments] },
    async (request) => controller.remove(request),
  );
}
