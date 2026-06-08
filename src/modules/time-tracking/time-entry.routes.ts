import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireAnyPermission } from "../../shared/middlewares/requireAnyPermission";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { TaskActivityRepository } from "../tasks/task-activity.repository";
import { TaskActivityService } from "../tasks/task-activity.service";
import { TimeEntryController } from "./time-entry.controller";
import { TimeEntryRepository } from "./time-entry.repository";
import { TimeEntryService } from "./time-entry.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const timeTrackingBase = [
  ...withOrgContext,
  requireFeature("time_tracking"),
] as const;

const trackTime = [
  ...timeTrackingBase,
  requirePermission("track_time"),
] as const;

const viewTaskTime = [
  ...timeTrackingBase,
  requireAnyPermission(["view_time_entries", "track_time"]),
] as const;

const viewProjectTimeSummary = [
  ...timeTrackingBase,
  requirePermission("view_time_entries"),
] as const;

function createTimeEntryController() {
  const activityService = new TaskActivityService(new TaskActivityRepository());

  return new TimeEntryController(
    new TimeEntryService(new TimeEntryRepository(), activityService),
  );
}

export async function taskTimeRoutes(app: FastifyInstance) {
  const controller = createTimeEntryController();

  app.post(
    "/:taskId/time/start",
    { preHandler: [...trackTime] },
    async (request) => controller.startTimer(request),
  );

  app.post(
    "/:taskId/time/manual",
    { preHandler: [...trackTime] },
    async (request) => controller.createManualEntry(request),
  );

  app.get(
    "/:taskId/time",
    { preHandler: [...viewTaskTime] },
    async (request) => controller.listTaskTime(request),
  );
}

export async function timeEntryRoutes(app: FastifyInstance) {
  const controller = createTimeEntryController();

  app.get(
    "/running",
    { preHandler: [...trackTime] },
    async (request) => controller.getRunningTimer(request),
  );

  app.post(
    "/:id/stop",
    { preHandler: [...trackTime] },
    async (request) => controller.stopTimer(request),
  );

  app.patch(
    "/:id",
    { preHandler: [...trackTime] },
    async (request) => controller.updateEntry(request),
  );

  app.delete(
    "/:id",
    { preHandler: [...trackTime] },
    async (request) => controller.deleteEntry(request),
  );
}

export async function projectTimeRoutes(app: FastifyInstance) {
  const controller = createTimeEntryController();

  app.get(
    "/:projectId/time-summary",
    { preHandler: [...viewProjectTimeSummary] },
    async (request) => controller.getProjectTimeSummary(request),
  );
}
