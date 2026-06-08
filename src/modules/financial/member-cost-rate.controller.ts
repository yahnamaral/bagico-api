import type { FastifyRequest } from "fastify";
import type { MemberCostRateService } from "./member-cost-rate.service";
import {
  createMemberCostRateBodySchema,
  listMemberCostRatesQuerySchema,
  memberCostRateIdParamSchema,
  updateMemberCostRateBodySchema,
} from "./member-cost-rate.schemas";

export class MemberCostRateController {
  constructor(private readonly service: MemberCostRateService) {}

  list(request: FastifyRequest) {
    const query = listMemberCostRatesQuerySchema.parse(request.query);

    return this.service.list(request.organization!.id, query);
  }

  create(request: FastifyRequest) {
    const body = createMemberCostRateBodySchema.parse(request.body);

    return this.service.create(request.organization!.id, body);
  }

  update(request: FastifyRequest) {
    const { id } = memberCostRateIdParamSchema.parse(request.params);
    const body = updateMemberCostRateBodySchema.parse(request.body);

    return this.service.update(request.organization!.id, id, body);
  }

  remove(request: FastifyRequest) {
    const { id } = memberCostRateIdParamSchema.parse(request.params);

    return this.service.remove(request.organization!.id, id);
  }
}
