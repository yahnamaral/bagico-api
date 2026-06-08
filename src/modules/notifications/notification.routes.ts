import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { NotificationController } from "./notification.controller";
import { NotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

export async function notificationRoutes(app: FastifyInstance) {
  const service = new NotificationService(new NotificationRepository());
  const controller = new NotificationController(service);

  app.get("/", { preHandler: [...withOrgContext] }, async (request) =>
    controller.list(request),
  );

  app.get(
    "/unread-count",
    { preHandler: [...withOrgContext] },
    async (request) => controller.getUnreadCount(request),
  );

  app.patch(
    "/read-all",
    { preHandler: [...withOrgContext] },
    async (request) => controller.markAllAsRead(request),
  );

  app.patch(
    "/:id/read",
    { preHandler: [...withOrgContext] },
    async (request) => controller.markAsRead(request),
  );

  app.delete(
    "/:id",
    { preHandler: [...withOrgContext] },
    async (request) => controller.remove(request),
  );
}
