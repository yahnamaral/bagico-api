import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { BillingController } from "./billing.controller";
import { BillingRepository } from "./billing.repository";
import { BillingService } from "./billing.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

export async function billingRoutes(app: FastifyInstance) {
  const controller = new BillingController(
    new BillingService(new BillingRepository()),
  );

  app.get("/plans", async () => controller.listPlans());

  app.get("/current", { preHandler: [...withOrgContext] }, async (request) =>
    controller.getCurrent(request),
  );

  app.get("/features", { preHandler: [...withOrgContext] }, async (request) =>
    controller.getFeatures(request),
  );

  app.patch(
    "/current-plan",
    {
      preHandler: [
        ...withOrgContext,
        requirePermission("manage_billing"),
      ],
    },
    async (request) => controller.updateCurrentPlan(request),
  );
}
