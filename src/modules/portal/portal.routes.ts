import type { FastifyInstance } from "fastify";
import { OrganizationRepository } from "../organizations/organization.repository";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { TaskActivityRepository } from "../tasks/task-activity.repository";
import { TaskActivityService } from "../tasks/task-activity.service";
import { TaskApprovalRepository } from "../tasks/task-approval.repository";
import { TaskRepository } from "../tasks/task.repository";
import { PortalController } from "./portal.controller";
import { PortalRepository } from "./portal.repository";
import { PortalService } from "./portal.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const portalBase = [
  ...withOrgContext,
  requirePermission("access_portal"),
  requireFeature("client_portal"),
] as const;

const portalViewTasks = [
  ...portalBase,
  requirePermission("view_tasks"),
] as const;

const portalComment = [
  ...portalBase,
  requirePermission("comment_tasks"),
] as const;

const portalApprove = [
  ...portalBase,
  requirePermission("approve_tasks"),
] as const;

const managePortal = [
  ...withOrgContext,
  requirePermission("manage_portal"),
  requireFeature("client_portal"),
] as const;

function createPortalController() {
  const activityService = new TaskActivityService(new TaskActivityRepository());

  const service = new PortalService(
    new PortalRepository(),
    new TaskRepository(),
    new TaskApprovalRepository(),
    activityService,
    new OrganizationRepository(),
  );

  return new PortalController(service);
}

export async function portalRoutes(app: FastifyInstance) {
  const controller = createPortalController();

  app.get("/me", { preHandler: [...portalBase] }, async (request) =>
    controller.getMe(request),
  );

  app.get("/tasks", { preHandler: [...portalViewTasks] }, async (request) =>
    controller.listTasks(request),
  );

  app.get("/tasks/:id", { preHandler: [...portalViewTasks] }, async (request) =>
    controller.getTaskById(request),
  );

  app.post(
    "/tasks/:id/comments",
    { preHandler: [...portalComment] },
    async (request) => controller.addComment(request),
  );

  app.post(
    "/tasks/:id/approve",
    { preHandler: [...portalApprove] },
    async (request) => controller.approve(request),
  );

  app.post(
    "/tasks/:id/request-changes",
    { preHandler: [...portalApprove] },
    async (request) => controller.requestChanges(request),
  );
}

export async function clientPortalMemberRoutes(app: FastifyInstance) {
  const controller = createPortalController();

  app.get(
    "/:clientId/portal-members",
    { preHandler: [...managePortal] },
    async (request) => controller.listPortalMembers(request),
  );

  app.post(
    "/:clientId/portal-members",
    { preHandler: [...managePortal] },
    async (request) => controller.createPortalMember(request),
  );

  app.patch(
    "/:clientId/portal-members/:memberId",
    { preHandler: [...managePortal] },
    async (request) => controller.updatePortalMember(request),
  );

  app.delete(
    "/:clientId/portal-members/:memberId",
    { preHandler: [...managePortal] },
    async (request) => controller.removePortalMember(request),
  );
}
