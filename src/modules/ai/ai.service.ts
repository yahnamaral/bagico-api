import {
  AiGenerationType,
  type Prisma,
} from "@prisma/client";
import {
  generateAiJsonResponse,
  parseAiJsonResponse,
} from "../../infrastructure/ai/openai-client";
import { AppError } from "../../shared/errors/AppError";
import {
  BAGIAI_SYSTEM_PROMPT,
  buildContentIdeasPrompt,
  buildGenerateCopyPrompt,
  buildImproveBriefingPrompt,
  buildRecommendChannelPrompt,
  buildTaskSummaryPrompt,
} from "./ai.prompts";
import { AiRepository, mapHistoryItem } from "./ai.repository";
import type {
  ContentIdeasBody,
  GenerateCopyBody,
  ImproveBriefingBody,
  ListAiHistoryQuery,
  RecommendChannelBody,
  SummarizeTaskBody,
} from "./ai.schemas";

// TODO: Deduct aiCredits from organization plan limits after each generation.

type CopyGenerationOutput = {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  variations: Array<{
    headline: string;
    caption: string;
    cta: string;
  }>;
};

type ContentIdeasOutput = {
  ideas: Array<{
    title: string;
    description: string;
    channel: string;
    format: string;
    hook: string;
    cta: string;
  }>;
};

type BriefingImprovementOutput = {
  improvedBriefing: string;
  missingQuestions: string[];
  suggestedTasks: string[];
  risks: string[];
  nextSteps: string[];
};

type ChannelRecommendationOutput = {
  primaryChannel: string;
  secondaryChannels: string[];
  reasoning: string;
  suggestedFormat: string;
  distributionTips: string[];
};

type TaskSummaryOutput = {
  summary: string;
  pendingItems: string[];
  decisions: string[];
  nextActions: string[];
  risks: string[];
};

export class AiService {
  constructor(private readonly repository: AiRepository) {}

  private async runGeneration<T>(input: {
    organizationId: string;
    clerkUserId: string;
    type: AiGenerationType;
    body: Record<string, unknown>;
    userPrompt: string;
  }): Promise<T> {
    const aiResult = await generateAiJsonResponse(
      BAGIAI_SYSTEM_PROMPT,
      input.userPrompt,
    );

    const output = parseAiJsonResponse<T>(aiResult.raw);

    await this.repository.createGeneration({
      organizationId: input.organizationId,
      clerkUserId: input.clerkUserId,
      type: input.type,
      input: input.body as Prisma.InputJsonValue,
      output: output as Prisma.InputJsonValue,
      prompt: input.userPrompt,
      model: aiResult.model,
      tokensUsed: aiResult.tokensUsed,
    });

    return output;
  }

  generateCopy(
    organizationId: string,
    clerkUserId: string,
    body: GenerateCopyBody,
  ) {
    const userPrompt = buildGenerateCopyPrompt(body);

    return this.runGeneration<CopyGenerationOutput>({
      organizationId,
      clerkUserId,
      type: AiGenerationType.COPY_GENERATION,
      body,
      userPrompt,
    });
  }

  generateContentIdeas(
    organizationId: string,
    clerkUserId: string,
    body: ContentIdeasBody,
  ) {
    const userPrompt = buildContentIdeasPrompt(body, body.quantity);

    return this.runGeneration<ContentIdeasOutput>({
      organizationId,
      clerkUserId,
      type: AiGenerationType.CONTENT_IDEAS,
      body,
      userPrompt,
    });
  }

  improveBriefing(
    organizationId: string,
    clerkUserId: string,
    body: ImproveBriefingBody,
  ) {
    const userPrompt = buildImproveBriefingPrompt(body);

    return this.runGeneration<BriefingImprovementOutput>({
      organizationId,
      clerkUserId,
      type: AiGenerationType.BRIEFING_IMPROVEMENT,
      body,
      userPrompt,
    });
  }

  recommendChannel(
    organizationId: string,
    clerkUserId: string,
    body: RecommendChannelBody,
  ) {
    const userPrompt = buildRecommendChannelPrompt(body);

    return this.runGeneration<ChannelRecommendationOutput>({
      organizationId,
      clerkUserId,
      type: AiGenerationType.CHANNEL_RECOMMENDATION,
      body,
      userPrompt,
    });
  }

  async summarizeTask(
    organizationId: string,
    clerkUserId: string,
    taskId: string,
    body: SummarizeTaskBody,
  ) {
    const task = await this.repository.findTaskForSummary(
      organizationId,
      taskId,
      body.includeComments,
      body.includeFiles,
    );

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    const taskContext = {
      task,
      includeComments: body.includeComments,
      includeFiles: body.includeFiles,
    };

    const userPrompt = buildTaskSummaryPrompt(taskContext);

    return this.runGeneration<TaskSummaryOutput>({
      organizationId,
      clerkUserId,
      type: AiGenerationType.TASK_SUMMARY,
      body: { taskId, ...body },
      userPrompt,
    });
  }

  async listHistory(organizationId: string, query: ListAiHistoryQuery) {
    const { items, total } = await this.repository.listHistory(
      organizationId,
      query,
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data: items.map(mapHistoryItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }
}
