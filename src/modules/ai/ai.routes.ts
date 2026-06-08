import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireFeature } from "../../shared/middlewares/requireFeature";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { AiController } from "./ai.controller";
import { AiRepository } from "./ai.repository";
import { AiService } from "./ai.service";

const aiAccess = [
  requireAuth,
  requireOrganizationMember,
  requirePermission("use_ai"),
  requireFeature("ai"),
] as const;

export async function aiRoutes(app: FastifyInstance) {
  const controller = new AiController(new AiService(new AiRepository()));

  app.post(
    "/generate-copy",
    { preHandler: [...aiAccess] },
    async (request) => controller.generateCopy(request),
  );

  app.post(
    "/content-ideas",
    { preHandler: [...aiAccess] },
    async (request) => controller.generateContentIdeas(request),
  );

  app.post(
    "/improve-briefing",
    { preHandler: [...aiAccess] },
    async (request) => controller.improveBriefing(request),
  );

  app.post(
    "/recommend-channel",
    { preHandler: [...aiAccess] },
    async (request) => controller.recommendChannel(request),
  );

  app.post(
    "/tasks/:taskId/summarize",
    { preHandler: [...aiAccess] },
    async (request) => controller.summarizeTask(request),
  );

  app.get(
    "/history",
    { preHandler: [...aiAccess] },
    async (request) => controller.listHistory(request),
  );
}
