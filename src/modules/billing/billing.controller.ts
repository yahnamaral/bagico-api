import type { FastifyRequest } from "fastify";
import type { BillingService } from "./billing.service";
import { updateCurrentPlanBodySchema } from "./billing.schemas";

export class BillingController {
  constructor(private readonly service: BillingService) {}

  listPlans() {
    return this.service.listPlans();
  }

  getCurrent(request: FastifyRequest) {
    return this.service.getCurrent(request.organization!.id);
  }

  getFeatures(request: FastifyRequest) {
    return this.service.getFeatures(
      request.organization!.id,
      request.organization!.plan,
    );
  }

  updateCurrentPlan(request: FastifyRequest) {
    const body = updateCurrentPlanBodySchema.parse(request.body);

    return this.service.updateCurrentPlan(
      request.organization!.id,
      request.member!.role,
      body,
    );
  }
}
