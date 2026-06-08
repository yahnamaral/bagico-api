import type { FastifyRequest } from "fastify";
import type { RevenueContractService } from "./revenue-contract.service";
import {
  createRevenueContractBodySchema,
  listRevenueContractsQuerySchema,
  revenueContractIdParamSchema,
  updateRevenueContractBodySchema,
} from "./revenue-contract.schemas";

export class RevenueContractController {
  constructor(private readonly service: RevenueContractService) {}

  list(request: FastifyRequest) {
    const query = listRevenueContractsQuerySchema.parse(request.query);

    return this.service.list(request.organization!.id, query);
  }

  getById(request: FastifyRequest) {
    const { id } = revenueContractIdParamSchema.parse(request.params);

    return this.service.getById(request.organization!.id, id);
  }

  create(request: FastifyRequest) {
    const body = createRevenueContractBodySchema.parse(request.body);

    return this.service.create(request.organization!.id, body);
  }

  update(request: FastifyRequest) {
    const { id } = revenueContractIdParamSchema.parse(request.params);
    const body = updateRevenueContractBodySchema.parse(request.body);

    return this.service.update(request.organization!.id, id, body);
  }

  remove(request: FastifyRequest) {
    const { id } = revenueContractIdParamSchema.parse(request.params);

    return this.service.remove(request.organization!.id, id);
  }
}
