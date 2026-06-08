import type { FastifyInstance } from "fastify";
import { MailService } from "../../infrastructure/mail/mail.service";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { PortalInviteController } from "./portal-invite.controller";
import { PortalInviteRepository } from "./portal-invite.repository";
import { PortalInviteService } from "./portal-invite.service";

const withOrgContext = [requireAuth, requireOrganizationMember] as const;

const managePortal = [
  ...withOrgContext,
  requirePermission("manage_portal"),
  requireFeature("client_portal"),
] as const;

function createPortalInviteController() {
  const service = new PortalInviteService(
    new PortalInviteRepository(),
    new MailService(),
  );

  return new PortalInviteController(service);
}

export async function clientPortalInviteRoutes(app: FastifyInstance) {
  const controller = createPortalInviteController();

  app.get(
    "/:clientId/portal-invites",
    { preHandler: [...managePortal] },
    async (request) => controller.listInvites(request),
  );

  app.post(
    "/:clientId/portal-invites",
    { preHandler: [...managePortal] },
    async (request) => controller.createInvite(request),
  );

  app.post(
    "/:clientId/portal-invites/:inviteId/resend",
    { preHandler: [...managePortal] },
    async (request) => controller.resendInvite(request),
  );

  app.post(
    "/:clientId/portal-invites/:inviteId/revoke",
    { preHandler: [...managePortal] },
    async (request) => controller.revokeInvite(request),
  );
}

export async function portalInvitePublicRoutes(app: FastifyInstance) {
  const controller = createPortalInviteController();

  app.get("/invites/validate", async (request) =>
    controller.validateInvite(request),
  );

  app.post(
    "/invites/accept",
    { preHandler: [requireAuth] },
    async (request) => controller.acceptInvite(request),
  );
}
