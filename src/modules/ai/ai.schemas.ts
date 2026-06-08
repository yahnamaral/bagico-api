import { z } from "zod";

const optionalMediumText = z.string().trim().min(1).max(5000).optional();
const optionalShortText = z.string().trim().min(1).max(500).optional();

export const aiGenerationTypeSchema = z.enum([
  "COPY_GENERATION",
  "CONTENT_IDEAS",
  "BRIEFING_IMPROVEMENT",
  "CHANNEL_RECOMMENDATION",
  "TASK_SUMMARY",
]);

export const generateCopyBodySchema = z.object({
  clientName: optionalShortText,
  niche: z.string().trim().min(1).max(500),
  productOrService: z.string().trim().min(1).max(1000),
  objective: z.string().trim().min(1).max(1000),
  channel: z.string().trim().min(1).max(200),
  toneOfVoice: optionalMediumText,
  targetAudience: optionalMediumText,
  extraContext: optionalMediumText,
});

export const contentIdeasBodySchema = z.object({
  clientName: optionalShortText,
  niche: z.string().trim().min(1).max(500),
  objective: z.string().trim().min(1).max(1000),
  channels: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
  quantity: z.coerce.number().int().min(1).max(10).default(5),
  targetAudience: optionalMediumText,
  extraContext: optionalMediumText,
});

export const improveBriefingBodySchema = z.object({
  briefing: z.string().trim().min(1).max(10000),
  clientName: optionalShortText,
  niche: optionalShortText,
  objective: optionalMediumText,
});

export const recommendChannelBodySchema = z.object({
  contentDescription: z.string().trim().min(1).max(5000),
  niche: optionalShortText,
  objective: z.string().trim().min(1).max(1000),
  targetAudience: optionalMediumText,
});

export const summarizeTaskBodySchema = z.object({
  includeComments: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
});

export const taskIdParamSchema = z.object({
  taskId: z.uuid(),
});

export const listAiHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: aiGenerationTypeSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type GenerateCopyBody = z.infer<typeof generateCopyBodySchema>;
export type ContentIdeasBody = z.infer<typeof contentIdeasBodySchema>;
export type ImproveBriefingBody = z.infer<typeof improveBriefingBodySchema>;
export type RecommendChannelBody = z.infer<typeof recommendChannelBodySchema>;
export type SummarizeTaskBody = z.infer<typeof summarizeTaskBodySchema>;
export type ListAiHistoryQuery = z.infer<typeof listAiHistoryQuerySchema>;
