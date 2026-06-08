import { AppError } from "../../shared/errors/AppError";
import { validateDateRange } from "./financial.helpers";
import type { MemberCostRateRepository } from "./member-cost-rate.repository";
import { serializeMemberCostRate } from "./member-cost-rate.repository";
import type {
  CreateMemberCostRateBody,
  ListMemberCostRatesQuery,
  UpdateMemberCostRateBody,
} from "./member-cost-rate.schemas";

export class MemberCostRateService {
  constructor(private readonly repository: MemberCostRateRepository) {}

  async list(organizationId: string, query: ListMemberCostRatesQuery) {
    const { data, total } = await this.repository.list(organizationId, query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data: data.map(serializeMemberCostRate),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async create(organizationId: string, body: CreateMemberCostRateBody) {
    if (!validateDateRange(body.startsAt, body.endsAt)) {
      throw new AppError(
        "endsAt must be greater than startsAt",
        400,
        "INVALID_DATE_RANGE",
      );
    }

    const rate = await this.repository.create(organizationId, body);
    return serializeMemberCostRate(rate);
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateMemberCostRateBody,
  ) {
    const existing = await this.repository.findById(organizationId, id);

    if (!existing) {
      throw new AppError("Cost rate not found", 404, "COST_RATE_NOT_FOUND");
    }

    const startsAt = body.startsAt ?? existing.startsAt;
    const endsAt = body.endsAt === undefined ? existing.endsAt : body.endsAt;

    if (!validateDateRange(startsAt, endsAt)) {
      throw new AppError(
        "endsAt must be greater than startsAt",
        400,
        "INVALID_DATE_RANGE",
      );
    }

    const updated = await this.repository.update(organizationId, id, body);

    if (!updated) {
      throw new AppError("Cost rate not found", 404, "COST_RATE_NOT_FOUND");
    }

    return serializeMemberCostRate(updated);
  }

  async remove(organizationId: string, id: string) {
    const deleted = await this.repository.softDelete(organizationId, id);

    if (!deleted) {
      throw new AppError("Cost rate not found", 404, "COST_RATE_NOT_FOUND");
    }
  }
}
