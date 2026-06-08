import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireAnyFeature } from "../../shared/middlewares/requireAnyFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { RevenueContractController } from "./revenue-contract.controller";
import { RevenueContractRepository } from "./revenue-contract.repository";
import { RevenueContractService } from "./revenue-contract.service";

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

export async function revenueContractRoutes(app: FastifyInstance) {
  const controller = new RevenueContractController(
    new RevenueContractService(new RevenueContractRepository()),
  );

  app.get(
    "/revenue-contracts",
    { preHandler: [...viewFinancial] },
    async (request) => controller.list(request),
  );

  app.get(
    "/revenue-contracts/:id",
    { preHandler: [...viewFinancial] },
    async (request) => controller.getById(request),
  );

  app.post(
    "/revenue-contracts",
    { preHandler: [...manageFinancial] },
    async (request) => controller.create(request),
  );

  app.patch(
    "/revenue-contracts/:id",
    { preHandler: [...manageFinancial] },
    async (request) => controller.update(request),
  );

  app.delete(
    "/revenue-contracts/:id",
    { preHandler: [...manageFinancial] },
    async (request) => controller.remove(request),
  );
}
