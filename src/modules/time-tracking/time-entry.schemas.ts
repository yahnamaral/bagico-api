import { z } from "zod";

const optionalDescription = z.string().trim().min(1).max(1000).optional();

export const timeEntrySourceSchema = z.enum(["TIMER", "MANUAL"]);

export const taskIdParamSchema = z.object({
  taskId: z.uuid(),
});

export const timeEntryIdParamSchema = z.object({
  id: z.uuid(),
});

export const projectIdParamSchema = z.object({
  projectId: z.uuid(),
});

export const startTimerBodySchema = z.object({
  description: optionalDescription,
});

export const stopTimerBodySchema = z.object({
  endedAt: z.coerce.date().optional(),
});

export const manualTimeEntryBodySchema = z.object({
  description: optionalDescription,
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().positive().optional(),
});

export const listTaskTimeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clerkUserId: z.string().trim().min(1).optional(),
  source: timeEntrySourceSchema.optional(),
});

export const updateTimeEntryBodySchema = z.object({
  description: optionalDescription.nullable(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
});

export const projectTimeSummaryQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.enum(["user", "task", "day"]).optional(),
});

export type StartTimerBody = z.infer<typeof startTimerBodySchema>;
export type StopTimerBody = z.infer<typeof stopTimerBodySchema>;
export type ManualTimeEntryBody = z.infer<typeof manualTimeEntryBodySchema>;
export type ListTaskTimeQuery = z.infer<typeof listTaskTimeQuerySchema>;
export type UpdateTimeEntryBody = z.infer<typeof updateTimeEntryBodySchema>;
export type ProjectTimeSummaryQuery = z.infer<
  typeof projectTimeSummaryQuerySchema
>;
