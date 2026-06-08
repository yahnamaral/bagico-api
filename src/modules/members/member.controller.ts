import type { FastifyRequest } from "fastify";
import type { MemberService } from "./member.service";
import {
  listMembersQuerySchema,
  memberIdParamSchema,
  updateMemberRoleBodySchema,
} from "./member.schemas";

export class MemberController {
  constructor(private readonly service: MemberService) {}

  list(request: FastifyRequest) {
    const query = listMembersQuerySchema.parse(request.query);

    return this.service.list(request.organization!.id, query);
  }

  updateRole(request: FastifyRequest) {
    const { memberId } = memberIdParamSchema.parse(request.params);
    const body = updateMemberRoleBodySchema.parse(request.body);

    return this.service.updateRole(
      request.organization!.id,
      request.auth!.userId,
      memberId,
      body,
    );
  }

  remove(request: FastifyRequest) {
    const { memberId } = memberIdParamSchema.parse(request.params);

    return this.service.remove(
      request.organization!.id,
      request.auth!.userId,
      memberId,
    );
  }
}
