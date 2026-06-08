import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { MemberCostRateRepository } from "../financial/member-cost-rate.repository";
import { ProfitHunterRepository } from "../financial/profit-hunter.repository";
import { ProfitHunterService } from "../financial/profit-hunter.service";
import { RevenueContractRepository } from "../financial/revenue-contract.repository";
import { TimeEntryRepository } from "../time-tracking/time-entry.repository";
import { DashboardController } from "./dashboard.controller";
import { DashboardRepository } from "./dashboard.repository";
import { DashboardService } from "./dashboard.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

function createDashboardController() {
  const profitHunterService = new ProfitHunterService(
    new ProfitHunterRepository(),
    new MemberCostRateRepository(),
    new RevenueContractRepository(),
  );

  const service = new DashboardService(
    new DashboardRepository(),
    new TimeEntryRepository(),
    profitHunterService,
  );

  return new DashboardController(service);
}

export async function dashboardRoutes(app: FastifyInstance) {
  const controller = createDashboardController();

  app.get("/summary", { preHandler: [...withOrgContext] }, async (request) =>
    controller.getSummary(request),
  );
}
