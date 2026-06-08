import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireAnyFeature } from "../../shared/middlewares/requireAnyFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { MemberCostRateRepository } from "./member-cost-rate.repository";
import { ProfitHunterController } from "./profit-hunter.controller";
import { ProfitHunterRepository } from "./profit-hunter.repository";
import { ProfitHunterService } from "./profit-hunter.service";
import { RevenueContractRepository } from "./revenue-contract.repository";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const viewProfitHunter = [
  ...withOrgContext,
  requireAnyFeature(["profit_hunter", "financial"]),
  requirePermission("view_financial"),
] as const;

function createProfitHunterController() {
  return new ProfitHunterController(
    new ProfitHunterService(
      new ProfitHunterRepository(),
      new MemberCostRateRepository(),
      new RevenueContractRepository(),
    ),
  );
}

export async function profitHunterRoutes(app: FastifyInstance) {
  const controller = createProfitHunterController();

  app.get(
    "/profit-hunter/overview",
    { preHandler: [...viewProfitHunter] },
    async (request) => controller.getOverview(request),
  );

  app.get(
    "/profit-hunter/clients",
    { preHandler: [...viewProfitHunter] },
    async (request) => controller.listClients(request),
  );

  app.get(
    "/profit-hunter/clients/:clientId",
    { preHandler: [...viewProfitHunter] },
    async (request) => controller.getClientDetail(request),
  );

  app.get(
    "/profit-hunter/projects",
    { preHandler: [...viewProfitHunter] },
    async (request) => controller.listProjects(request),
  );

  app.get(
    "/profit-hunter/projects/:projectId",
    { preHandler: [...viewProfitHunter] },
    async (request) => controller.getProjectDetail(request),
  );
}
