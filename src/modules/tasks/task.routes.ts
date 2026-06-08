import type { FastifyInstance } from "fastify";
import { BoardRepository } from "../boards/board.repository";
import { ClientRepository } from "../clients/client.repository";
import { ProjectRepository } from "../projects/project.repository";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { TaskActivityRepository } from "./task-activity.repository";
import { TaskActivityService } from "./task-activity.service";
import { TaskApprovalRepository } from "./task-approval.repository";
import { TaskApprovalService } from "./task-approval.service";
import { TimeEntryRepository } from "../time-tracking/time-entry.repository";
import { TimeEntryService } from "../time-tracking/time-entry.service";
import { TaskController } from "./task.controller";
import { TaskRepository } from "./task.repository";
import { TaskService } from "./task.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const viewTask = [
  ...withOrgContext,
  requirePermission("view_tasks"),
  requireFeature("kanban"),
] as const;

const manageTask = [
  ...withOrgContext,
  requirePermission("manage_tasks"),
  requireFeature("kanban"),
] as const;

const approveTask = [
  ...withOrgContext,
  requirePermission("approve_tasks"),
  requireFeature("kanban"),
] as const;

export async function taskRoutes(app: FastifyInstance) {
  const repository = new TaskRepository();
  const boardRepository = new BoardRepository();
  const projectRepository = new ProjectRepository();
  const clientRepository = new ClientRepository();
  const activityService = new TaskActivityService(new TaskActivityRepository());
  const timeEntryService = new TimeEntryService(
    new TimeEntryRepository(),
    activityService,
  );
  const approvalService = new TaskApprovalService(
    repository,
    new TaskApprovalRepository(),
    activityService,
  );
  const service = new TaskService(
    repository,
    boardRepository,
    projectRepository,
    clientRepository,
    activityService,
    timeEntryService,
  );
  const controller = new TaskController(service, approvalService);

  app.get("/", { preHandler: [...viewTask] }, async (request) =>
    controller.list(request),
  );

  app.post("/", { preHandler: [...manageTask] }, async (request) =>
    controller.create(request),
  );

  app.get("/:id/activity", { preHandler: [...viewTask] }, async (request) =>
    controller.getActivity(request),
  );

  app.get("/:id/approval", { preHandler: [...viewTask] }, async (request) =>
    controller.getApproval(request),
  );

  app.post(
    "/:id/request-approval",
    { preHandler: [...manageTask] },
    async (request) => controller.requestApproval(request),
  );

  app.post(
    "/:id/approve",
    { preHandler: [...approveTask] },
    async (request) => controller.approve(request),
  );

  app.post(
    "/:id/request-changes",
    { preHandler: [...approveTask] },
    async (request) => controller.requestChanges(request),
  );

  app.get("/:id", { preHandler: [...viewTask] }, async (request) =>
    controller.getById(request),
  );

  app.patch("/:id", { preHandler: [...manageTask] }, async (request) =>
    controller.update(request),
  );

  app.patch("/:id/move", { preHandler: [...manageTask] }, async (request) =>
    controller.move(request),
  );

  app.delete("/:id", { preHandler: [...manageTask] }, async (request) =>
    controller.remove(request),
  );
}
