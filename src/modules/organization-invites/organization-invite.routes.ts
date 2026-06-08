import type { FastifyInstance } from "fastify";
import { MailService } from "../../infrastructure/mail/mail.service";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { OrganizationInviteController } from "./organization-invite.controller";
import { OrganizationInviteRepository } from "./organization-invite.repository";
import { OrganizationInviteService } from "./organization-invite.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

function createOrganizationInviteController() {
  const service = new OrganizationInviteService(
    new OrganizationInviteRepository(),
    new MailService(),
  );

  return new OrganizationInviteController(service);
}

export async function organizationInvitePublicRoutes(app: FastifyInstance) {
  const controller = createOrganizationInviteController();

  app.get("/invites/validate", async (request) =>
    controller.validateInvite(request),
  );

  app.post(
    "/invites/accept",
    { preHandler: [requireAuth] },
    async (request) => controller.acceptInvite(request),
  );
}

export async function organizationInviteAdminRoutes(app: FastifyInstance) {
  const controller = createOrganizationInviteController();

  app.post(
    "/invites",
    {
      preHandler: [...withOrgContext, requirePermission("manage_members")],
    },
    async (request) => controller.createInvite(request),
  );

  app.get(
    "/invites",
    {
      preHandler: [...withOrgContext, requirePermission("view_members")],
    },
    async (request) => controller.listInvites(request),
  );

  app.post(
    "/invites/:inviteId/resend",
    {
      preHandler: [...withOrgContext, requirePermission("manage_members")],
    },
    async (request) => controller.resendInvite(request),
  );

  app.post(
    "/invites/:inviteId/revoke",
    {
      preHandler: [...withOrgContext, requirePermission("manage_members")],
    },
    async (request) => controller.revokeInvite(request),
  );
}
