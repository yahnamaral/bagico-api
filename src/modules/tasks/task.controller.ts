import type { FastifyRequest } from "fastify";
import type { TaskApprovalService } from "./task-approval.service";
import type { TaskService } from "./task.service";
import {
  approveTaskBodySchema,
  createTaskBodySchema,
  listTasksQuerySchema,
  moveTaskBodySchema,
  requestApprovalBodySchema,
  requestChangesBodySchema,
  taskIdParamSchema,
  updateTaskBodySchema,
} from "./task.schemas";

export class TaskController {
  constructor(
    private readonly service: TaskService,
    private readonly approvalService: TaskApprovalService,
  ) {}

  list(request: FastifyRequest) {
    const query = listTasksQuerySchema.parse(request.query);

    return this.service.list(
      request.organization!.id,
      request.auth!.userId,
      query,
    );
  }

  create(request: FastifyRequest) {
    const body = createTaskBodySchema.parse(request.body);

    return this.service.create(
      request.organization!.id,
      request.auth!.userId,
      body,
    );
  }

  getById(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);

    return this.service.getById(
      request.organization!.id,
      id,
      request.auth!.userId,
      request.member!.role,
    );
  }

  getActivity(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);

    return this.service.getActivity(request.organization!.id, id);
  }

  update(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);
    const body = updateTaskBodySchema.parse(request.body);

    return this.service.update(
      request.organization!.id,
      id,
      request.auth!.userId,
      body,
    );
  }

  move(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);
    const body = moveTaskBodySchema.parse(request.body);

    return this.service.move(
      request.organization!.id,
      id,
      request.auth!.userId,
      body,
    );
  }

  remove(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);

    return this.service.remove(request.organization!.id, id);
  }

  requestApproval(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);
    const body = requestApprovalBodySchema.parse(request.body ?? {});

    return this.approvalService.requestApproval(
      request.organization!.id,
      id,
      request.auth!.userId,
      body,
    );
  }

  approve(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);
    const body = approveTaskBodySchema.parse(request.body ?? {});

    return this.approvalService.approve(
      request.organization!.id,
      id,
      request.auth!.userId,
      request.member!.role,
      body,
    );
  }

  requestChanges(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);
    const body = requestChangesBodySchema.parse(request.body);

    return this.approvalService.requestChanges(
      request.organization!.id,
      id,
      request.auth!.userId,
      body,
    );
  }

  getApproval(request: FastifyRequest) {
    const { id } = taskIdParamSchema.parse(request.params);

    return this.approvalService.getApprovalInfo(
      request.organization!.id,
      id,
    );
  }
}
