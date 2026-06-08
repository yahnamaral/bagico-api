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

    const project = await this.repository.update(organizationId, id, body);

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    return project;
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
