import type { FastifyInstance } from "fastify";
import { ProjectRepository } from "../projects/project.repository";
import { TaskActivityRepository } from "../tasks/task-activity.repository";
import { TaskActivityService } from "../tasks/task-activity.service";
import { TimeEntryRepository } from "../time-tracking/time-entry.repository";
import { TimeEntryService } from "../time-tracking/time-entry.service";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { BoardController } from "./board.controller";
import { BoardRepository } from "./board.repository";
import { BoardService } from "./board.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const viewBoard = [
  ...withOrgContext,
  requirePermission("view_boards"),
  requireFeature("kanban"),
] as const;

const manageBoard = [
  ...withOrgContext,
  requirePermission("manage_boards"),
  requireFeature("kanban"),
] as const;

export async function boardRoutes(app: FastifyInstance) {
  const repository = new BoardRepository();
  const projectRepository = new ProjectRepository();
  const activityService = new TaskActivityService(new TaskActivityRepository());
  const timeEntryService = new TimeEntryService(
    new TimeEntryRepository(),
    activityService,
  );
  const service = new BoardService(
    repository,
    projectRepository,
    timeEntryService,
  );
  const controller = new BoardController(service);

  app.get("/", { preHandler: [...viewBoard] }, async (request) =>
    controller.list(request),
  );

  app.post("/", { preHandler: [...manageBoard] }, async (request) =>
    controller.create(request),
  );

  app.get("/:id", { preHandler: [...viewBoard] }, async (request) =>
    controller.getById(request),
  );

  app.patch("/:id", { preHandler: [...manageBoard] }, async (request) =>
    controller.update(request),
  );

  app.delete("/:id", { preHandler: [...manageBoard] }, async (request) =>
    controller.remove(request),
  );

  app.post("/:id/columns", { preHandler: [...manageBoard] }, async (request) =>
    controller.createColumn(request),
  );

  app.patch(
    "/:id/columns/reorder",
    { preHandler: [...manageBoard] },
    async (request) => controller.reorderColumns(request),
  );

  app.patch(
    "/:id/columns/:columnId",
    { preHandler: [...manageBoard] },
    async (request) => controller.updateColumn(request),
  );

  app.delete(
    "/:id/columns/:columnId",
    { preHandler: [...manageBoard] },
    async (request) => controller.removeColumn(request),
  );
}
