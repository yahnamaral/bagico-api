import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireAnyFeature } from "../../shared/middlewares/requireAnyFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { MemberCostRateController } from "./member-cost-rate.controller";
import { MemberCostRateRepository } from "./member-cost-rate.repository";
import { MemberCostRateService } from "./member-cost-rate.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const financialFeature = [
  ...withOrgContext,
  requireAnyFeature(["profit_hunter", "financial"]),
] as const;

const viewFinancial = [
  ...financialFeature,
  requirePermission("view_financial"),
] as const;

const manageFinancial = [
  ...financialFeature,
  requirePermission("manage_financial"),
] as const;

export async function memberCostRateRoutes(app: FastifyInstance) {
  const controller = new MemberCostRateController(
    new MemberCostRateService(new MemberCostRateRepository()),
  );

  app.get(
    "/member-cost-rates",
    { preHandler: [...viewFinancial] },
    async (request) => controller.list(request),
  );

  app.post(
    "/member-cost-rates",
    { preHandler: [...manageFinancial] },
    async (request) => controller.create(request),
  );

  app.patch(
    "/member-cost-rates/:id",
    { preHandler: [...manageFinancial] },
    async (request) => controller.update(request),
  );

  app.delete(
    "/member-cost-rates/:id",
    { preHandler: [...manageFinancial] },
    async (request) => controller.remove(request),
  );
}
