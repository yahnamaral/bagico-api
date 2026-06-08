import type { FastifyRequest } from "fastify";
import type { OrganizationInviteService } from "./organization-invite.service";
import {
  acceptOrganizationInviteBodySchema,
  createOrganizationInviteBodySchema,
  inviteIdParamSchema,
  listOrganizationInvitesQuerySchema,
  validateOrganizationInviteQuerySchema,
} from "./organization-invite.schemas";

export class OrganizationInviteController {
  constructor(private readonly service: OrganizationInviteService) {}

  createInvite(request: FastifyRequest) {
    const body = createOrganizationInviteBodySchema.parse(request.body);

    return this.service.createInvite(
      request.organization!.id,
      request.auth!.userId,
      body,
    );
  }

  listInvites(request: FastifyRequest) {
    const query = listOrganizationInvitesQuerySchema.parse(request.query);

    return this.service.listInvites(request.organization!.id, query);
  }

  resendInvite(request: FastifyRequest) {
    const { inviteId } = inviteIdParamSchema.parse(request.params);

    return this.service.resendInvite(request.organization!.id, inviteId);
  }

  revokeInvite(request: FastifyRequest) {
    const { inviteId } = inviteIdParamSchema.parse(request.params);

    return this.service.revokeInvite(request.organization!.id, inviteId);
  }

  validateInvite(request: FastifyRequest) {
    const { token } = validateOrganizationInviteQuerySchema.parse(request.query);

    return this.service.validateInvite(token);
  }

  acceptInvite(request: FastifyRequest) {
    const body = acceptOrganizationInviteBodySchema.parse(request.body);

    return this.service.acceptInvite(request.auth!.userId, body);
  }
}
