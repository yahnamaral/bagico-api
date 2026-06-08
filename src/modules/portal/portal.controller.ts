import type { FastifyRequest } from "fastify";
import type { PortalService } from "./portal.service";
import {
  clientIdParamSchema,
  createPortalMemberBodySchema,
  listPortalTasksQuerySchema,
  portalApproveBodySchema,
  portalCommentBodySchema,
  portalMemberParamsSchema,
  portalRequestChangesBodySchema,
  portalTaskIdParamSchema,
  updatePortalMemberBodySchema,
} from "./portal.schemas";

export class PortalController {
  constructor(private readonly service: PortalService) {}

  getMe(request: FastifyRequest) {
    return this.service.getMe(
      request.organization!.id,
      request.auth!.userId,
      request.organization!,
      request.member!,
    );
  }

  listTasks(request: FastifyRequest) {
    const query = listPortalTasksQuerySchema.parse(request.query);

    return this.service.listTasks(
      request.organization!.id,
      request.auth!.userId,
      request.member!,
      query,
    );
  }

  getTaskById(request: FastifyRequest) {
    const { id } = portalTaskIdParamSchema.parse(request.params);

    return this.service.getTaskById(
      request.organization!.id,
      request.auth!.userId,
      request.member!,
      id,
    );
  }

  addComment(request: FastifyRequest) {
    const { id } = portalTaskIdParamSchema.parse(request.params);
    const body = portalCommentBodySchema.parse(request.body);

    return this.service.addComment(
      request.organization!.id,
      request.auth!.userId,
      request.member!,
      id,
      body,
    );
  }

  approve(request: FastifyRequest) {
    const { id } = portalTaskIdParamSchema.parse(request.params);
    const body = portalApproveBodySchema.parse(request.body ?? {});

    return this.service.approve(
      request.organization!.id,
      request.auth!.userId,
      request.member!,
      id,
      body,
    );
  }

  requestChanges(request: FastifyRequest) {
    const { id } = portalTaskIdParamSchema.parse(request.params);
    const body = portalRequestChangesBodySchema.parse(request.body);

    return this.service.requestChanges(
      request.organization!.id,
      request.auth!.userId,
      request.member!,
      id,
      body,
    );
  }

  listPortalMembers(request: FastifyRequest) {
    const { clientId } = clientIdParamSchema.parse(request.params);

    return this.service.listPortalMembers(
      request.organization!.id,
      clientId,
    );
  }

  createPortalMember(request: FastifyRequest) {
    const { clientId } = clientIdParamSchema.parse(request.params);
    const body = createPortalMemberBodySchema.parse(request.body);

    return this.service.createPortalMember(
      request.organization!.id,
      clientId,
      body,
    );
  }

  updatePortalMember(request: FastifyRequest) {
    const { clientId, memberId } = portalMemberParamsSchema.parse(
      request.params,
    );
    const body = updatePortalMemberBodySchema.parse(request.body);

    return this.service.updatePortalMember(
      request.organization!.id,
      clientId,
      memberId,
      body,
    );
  }

  removePortalMember(request: FastifyRequest) {
    const { clientId, memberId } = portalMemberParamsSchema.parse(
      request.params,
    );

    return this.service.removePortalMember(
      request.organization!.id,
      clientId,
      memberId,
    );
  }
}
