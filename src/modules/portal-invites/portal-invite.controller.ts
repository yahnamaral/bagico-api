import type { FastifyRequest } from "fastify";
import type { PortalInviteService } from "./portal-invite.service";
import {
  acceptInviteBodySchema,
  clientIdParamSchema,
  createPortalInviteBodySchema,
  inviteParamsSchema,
  validateInviteQuerySchema,
} from "./portal-invite.schemas";

export class PortalInviteController {
  constructor(private readonly service: PortalInviteService) {}

  createInvite(request: FastifyRequest) {
    const { clientId } = clientIdParamSchema.parse(request.params);
    const body = createPortalInviteBodySchema.parse(request.body);

    return this.service.createInvite(
      request.organization!.id,
      clientId,
      request.auth!.userId,
      body,
    );
  }

  listInvites(request: FastifyRequest) {
    const { clientId } = clientIdParamSchema.parse(request.params);

    return this.service.listInvites(request.organization!.id, clientId);
  }

  resendInvite(request: FastifyRequest) {
    const { clientId, inviteId } = inviteParamsSchema.parse(request.params);

    return this.service.resendInvite(
      request.organization!.id,
      clientId,
      inviteId,
    );
  }

  revokeInvite(request: FastifyRequest) {
    const { clientId, inviteId } = inviteParamsSchema.parse(request.params);

    return this.service.revokeInvite(
      request.organization!.id,
      clientId,
      inviteId,
    );
  }

  validateInvite(request: FastifyRequest) {
    const { token } = validateInviteQuerySchema.parse(request.query);

    return this.service.validateInvite(token);
  }

  acceptInvite(request: FastifyRequest) {
    const body = acceptInviteBodySchema.parse(request.body);

    return this.service.acceptInvite(request.auth!.userId, body);
  }
}
