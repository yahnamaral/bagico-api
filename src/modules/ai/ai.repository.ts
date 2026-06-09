import type {
  AiGenerationType,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import type { ListAiHistoryQuery } from "./ai.schemas";

const historySelect = {
  id: true,
  organizationId: true,
  clerkUserId: true,
  type: true,
  input: true,
  output: true,
  prompt: true,
  model: true,
  tokensUsed: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type AiGenerationRecord = Prisma.AiGenerationGetPayload<{
  select: typeof historySelect;
}>;

export class AiRepository {
  protected readonly db = prisma;

  createGeneration(data: {
    organizationId: string;
    clerkUserId: string;
    type: AiGenerationType;
    input: Prisma.InputJsonValue;
    output: Prisma.InputJsonValue;
    prompt?: string;
    model?: string;
    tokensUsed?: number | null;
  }) {
    return this.db.aiGeneration.create({
      data,
      select: historySelect,
    });
  }

  async listHistory(organizationId: string, query: ListAiHistoryQuery) {
    const { page, limit, type, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AiGenerationWhereInput = {
      organizationId,
      ...(type ? { type } : {}),
      ...(search
        ? {
            prompt: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.aiGeneration.findMany({
        where,
        select: historySelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.db.aiGeneration.count({ where }),
    ]);

    return { items, total };
  }

  findTaskForSummary(
    organizationId: string,
    taskId: string,
    includeComments: boolean,
    includeFiles: boolean,
  ) {
    return this.db.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        mediaType: true,
        dueDate: true,
        approvalStatus: true,
        isRework: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        board: { select: { id: true, name: true } },
        column: { select: { id: true, name: true } },
        comments: includeComments
          ? {
              where: { deletedAt: null },
              select: {
                id: true,
                clerkUserId: true,
                content: true,
                type: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            }
          : false,
        files: includeFiles
          ? {
              where: { deletedAt: null },
              select: {
                id: true,
                fileName: true,
                mimeType: true,
                size: true,
                category: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            }
          : false,
      },
    });
  }
}

const PROMPT_PREVIEW_LIMIT = 200;
const OUTPUT_PREVIEW_LIMIT = 500;

export function mapHistoryItem(item: AiGenerationRecord) {
  const promptPreview =
    item.prompt && item.prompt.length > PROMPT_PREVIEW_LIMIT
      ? `${item.prompt.slice(0, PROMPT_PREVIEW_LIMIT)}...`
      : item.prompt;

  const outputString = JSON.stringify(item.output);
  const outputPreview =
    outputString.length > OUTPUT_PREVIEW_LIMIT
      ? `${outputString.slice(0, OUTPUT_PREVIEW_LIMIT)}...`
      : item.output;

  return {
    id: item.id,
    organizationId: item.organizationId,
    clerkUserId: item.clerkUserId,
    type: item.type,
    input: item.input,
    output: outputPreview,
    outputFullAvailable: outputString.length <= OUTPUT_PREVIEW_LIMIT,
    promptPreview,
    model: item.model,
    tokensUsed: item.tokensUsed,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
