import type { FastifyRequest } from "fastify";
import type { AiService } from "./ai.service";
import {
  contentIdeasBodySchema,
  generateCopyBodySchema,
  improveBriefingBodySchema,
  listAiHistoryQuerySchema,
  recommendChannelBodySchema,
  summarizeTaskBodySchema,
  taskIdParamSchema,
} from "./ai.schemas";

export class AiController {
  constructor(private readonly service: AiService) {}

  generateCopy(request: FastifyRequest) {
    const body = generateCopyBodySchema.parse(request.body);

    return this.service.generateCopy(
      request.organization!.id,
      request.auth!.userId,
      body,
    );
  }

  generateContentIdeas(request: FastifyRequest) {
    const body = contentIdeasBodySchema.parse(request.body);

    return this.service.generateContentIdeas(
      request.organization!.id,
      request.auth!.userId,
      body,
    );
  }

  improveBriefing(request: FastifyRequest) {
    const body = improveBriefingBodySchema.parse(request.body);

    return this.service.improveBriefing(
      request.organization!.id,
      request.auth!.userId,
      body,
    );
  }

  recommendChannel(request: FastifyRequest) {
    const body = recommendChannelBodySchema.parse(request.body);

    return this.service.recommendChannel(
      request.organization!.id,
      request.auth!.userId,
      body,
    );
  }

  summarizeTask(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const body = summarizeTaskBodySchema.parse(request.body ?? {});

    return this.service.summarizeTask(
      request.organization!.id,
      request.auth!.userId,
      taskId,
      body,
    );
  }

  listHistory(request: FastifyRequest) {
    const query = listAiHistoryQuerySchema.parse(request.query);

    return this.service.listHistory(request.organization!.id, query);
  }
}
