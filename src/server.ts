import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { errorHandler } from "./shared/errors/errorHandler";
import { meRoutes } from "./modules/auth/me.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { memberCostRateRoutes } from "./modules/financial/member-cost-rate.routes";
import { profitHunterRoutes } from "./modules/financial/profit-hunter.routes";
import { revenueContractRoutes } from "./modules/financial/revenue-contract.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { clientRoutes } from "./modules/clients/client.routes";
import { organizationRoutes } from "./modules/organizations/organization.routes";
import { boardRoutes } from "./modules/boards/board.routes";
import { projectRoutes } from "./modules/projects/project.routes";
import { commentRoutes } from "./modules/comments/comment.routes";
import { fileRoutes } from "./modules/files/file.routes";
import {
  clientPortalInviteRoutes,
  portalInvitePublicRoutes,
} from "./modules/portal-invites/portal-invite.routes";
import {
  clientPortalMemberRoutes,
  portalRoutes,
} from "./modules/portal/portal.routes";
import {
  projectTimeRoutes,
  taskTimeRoutes,
  timeEntryRoutes,
} from "./modules/time-tracking/time-entry.routes";
import { taskRoutes } from "./modules/tasks/task.routes";
import { memberRoutes } from "./modules/members/member.routes";
import {
  organizationInviteAdminRoutes,
  organizationInvitePublicRoutes,
} from "./modules/organization-invites/organization-invite.routes";
import { notificationRoutes } from "./modules/notifications/notification.routes";

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(helmet);

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await app.register(meRoutes);
  await app.register(dashboardRoutes, { prefix: "/dashboard" });
  await app.register(billingRoutes, { prefix: "/billing" });
  await app.register(memberCostRateRoutes, { prefix: "/financial" });
  await app.register(revenueContractRoutes, { prefix: "/financial" });
  await app.register(profitHunterRoutes, { prefix: "/financial" });
  await app.register(aiRoutes, { prefix: "/ai" });

  await app.register(organizationRoutes, { prefix: "/organizations" });
  await app.register(organizationInvitePublicRoutes, { prefix: "/members" });
  await app.register(organizationInviteAdminRoutes, { prefix: "/members" });
  await app.register(memberRoutes, { prefix: "/members" });
  await app.register(notificationRoutes, { prefix: "/notifications" });
  await app.register(clientRoutes, { prefix: "/clients" });
  await app.register(clientPortalMemberRoutes, { prefix: "/clients" });
  await app.register(clientPortalInviteRoutes, { prefix: "/clients" });
  await app.register(portalRoutes, { prefix: "/portal" });
  await app.register(portalInvitePublicRoutes, { prefix: "/portal" });
  await app.register(projectRoutes, { prefix: "/projects" });
  await app.register(projectTimeRoutes, { prefix: "/projects" });
  await app.register(boardRoutes, { prefix: "/boards" });
  await app.register(taskRoutes, { prefix: "/tasks" });
  await app.register(taskTimeRoutes, { prefix: "/tasks" });
  await app.register(timeEntryRoutes, { prefix: "/time-entries" });
  await app.register(commentRoutes, { prefix: "/tasks" });
  await app.register(fileRoutes, { prefix: "/tasks" });

  return app;
}
