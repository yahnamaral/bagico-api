import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { MemberController } from "./member.controller";
import { MemberRepository } from "./member.repository";
import { MemberService } from "./member.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

function createMemberController() {
  const service = new MemberService(new MemberRepository());
  return new MemberController(service);
}

export async function memberRoutes(app: FastifyInstance) {
  const controller = createMemberController();

  app.get(
    "/",
    {
      preHandler: [...withOrgContext, requirePermission("view_members")],
    },
    async (request) => controller.list(request),
  );

  app.patch(
    "/:memberId/role",
    {
      preHandler: [...withOrgContext, requirePermission("manage_members")],
    },
    async (request) => controller.updateRole(request),
  );

  app.delete(
    "/:memberId",
    {
      preHandler: [...withOrgContext, requirePermission("manage_members")],
    },
    async (request) => controller.remove(request),
  );
}
