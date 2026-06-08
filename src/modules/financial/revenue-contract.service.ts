import { AppError } from "../../shared/errors/AppError";
import { validateDateRange } from "./financial.helpers";
import type { RevenueContractRepository } from "./revenue-contract.repository";
import { serializeRevenueContract } from "./revenue-contract.repository";
import type {
  CreateRevenueContractBody,
  ListRevenueContractsQuery,
  UpdateRevenueContractBody,
} from "./revenue-contract.schemas";

export class RevenueContractService {
  constructor(private readonly repository: RevenueContractRepository) {}

  private async validateClientAndProject(
    organizationId: string,
    clientId: string,
    projectId?: string | null,
  ) {
    const client = await this.repository.findClient(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    if (projectId) {
      const project = await this.repository.findProject(
        organizationId,
        projectId,
        clientId,
      );

      if (!project) {
        throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
      }
    }
  }

  async list(organizationId: string, query: ListRevenueContractsQuery) {
    const { data, total } = await this.repository.list(organizationId, query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data: data.map(serializeRevenueContract),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getById(organizationId: string, id: string) {
    const contract = await this.repository.findById(organizationId, id);

    if (!contract) {
      throw new AppError("Contract not found", 404, "CONTRACT_NOT_FOUND");
    }

    return serializeRevenueContract(contract);
  }

  async create(organizationId: string, body: CreateRevenueContractBody) {
    if (!validateDateRange(body.startsAt, body.endsAt)) {
      throw new AppError(
        "endsAt must be greater than startsAt",
        400,
        "INVALID_DATE_RANGE",
      );
    }

    await this.validateClientAndProject(
      organizationId,
      body.clientId,
      body.projectId,
    );

    const contract = await this.repository.create(organizationId, body);
    return serializeRevenueContract(contract);
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateRevenueContractBody,
  ) {
    const existing = await this.repository.findById(organizationId, id);

    if (!existing) {
      throw new AppError("Contract not found", 404, "CONTRACT_NOT_FOUND");
    }

    const clientId = body.clientId ?? existing.clientId;
    const projectId =
      body.projectId === undefined ? existing.projectId : body.projectId;

    await this.validateClientAndProject(organizationId, clientId, projectId);

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
      throw new AppError("Contract not found", 404, "CONTRACT_NOT_FOUND");
    }

    return serializeRevenueContract(updated);
  }

  async remove(organizationId: string, id: string) {
    const deleted = await this.repository.softDelete(organizationId, id);

    if (!deleted) {
      throw new AppError("Contract not found", 404, "CONTRACT_NOT_FOUND");
    }
  }
}
