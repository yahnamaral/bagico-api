import { AppError } from "../../shared/errors/AppError";
import { ClientRepository } from "../clients/client.repository";
import type { ProjectRepository, ProjectWithClient } from "./project.repository";
import type {
  CreateProjectBody,
  ListProjectsQuery,
  UpdateProjectBody,
} from "./project.schemas";

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  private async ensureClientBelongsToOrganization(
    organizationId: string,
    clientId: string,
  ): Promise<void> {
    const client = await this.clientRepository.findById(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }
  }

  async list(organizationId: string, query: ListProjectsQuery) {
    if (query.clientId) {
      await this.ensureClientBelongsToOrganization(
        organizationId,
        query.clientId,
      );
    }

    const [data, total] = await Promise.all([
      this.repository.findMany(organizationId, query),
      this.repository.count(organizationId, {
        search: query.search,
        status: query.status,
        priority: query.priority,
        type: query.type,
        clientId: query.clientId,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async create(
    organizationId: string,
    body: CreateProjectBody,
  ): Promise<ProjectWithClient> {
    await this.ensureClientBelongsToOrganization(organizationId, body.clientId);

    return this.repository.create(organizationId, body);
  }

  async getById(
    organizationId: string,
    id: string,
  ): Promise<ProjectWithClient> {
    const project = await this.repository.findById(organizationId, id);

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    return project;
  }

  async update(
    organizationId: string,
    id: string,
    body: UpdateProjectBody,
  ): Promise<ProjectWithClient> {
    if (body.clientId) {
      await this.ensureClientBelongsToOrganization(
        organizationId,
        body.clientId,
      );
    }

    const existing = await this.repository.findById(organizationId, id);

    if (!existing) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    const data = this.buildUpdateData(existing, body);

    const project = await this.repository.update(organizationId, id, data);

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    return project;
  }

  private buildUpdateData(
    existing: ProjectWithClient,
    body: UpdateProjectBody,
  ): UpdateProjectBody {
    const effectiveType = body.type ?? existing.type;

    if (effectiveType === "ONE_OFF") {
      // ONE_OFF projects keep budget/dueDate as-is and drop recurrence fields.
      return {
        ...body,
        monthlyFee: null,
        recurrenceInterval: null,
        renewalDay: null,
        fixedDeliverables: null,
      };
    }

    const effectiveMonthlyFee =
      body.monthlyFee !== undefined
        ? body.monthlyFee
        : existing.monthlyFee !== null
          ? Number(existing.monthlyFee)
          : null;

    if (effectiveMonthlyFee === null || effectiveMonthlyFee <= 0) {
      throw new AppError(
        "monthlyFee is required for recurring projects",
        422,
        "PROJECT_MONTHLY_FEE_REQUIRED",
      );
    }

    const effectiveRecurrenceInterval =
      body.recurrenceInterval !== undefined
        ? body.recurrenceInterval
        : existing.recurrenceInterval;

    if (!effectiveRecurrenceInterval) {
      throw new AppError(
        "recurrenceInterval is required for recurring projects",
        422,
        "PROJECT_RECURRENCE_INTERVAL_REQUIRED",
      );
    }

    return body;
  }

  async remove(
    organizationId: string,
    id: string,
  ): Promise<ProjectWithClient> {
    const project = await this.repository.softDelete(organizationId, id);

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    return project;
  }
}
