import { z } from "zod";

export const profitHunterDateRangeQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const profitHunterClientIdParamSchema = z.object({
  clientId: z.uuid(),
});

export const profitHunterProjectIdParamSchema = z.object({
  projectId: z.uuid(),
});

export const profitHunterProjectsQuerySchema =
  profitHunterDateRangeQuerySchema.extend({
    clientId: z.uuid().optional(),
  });

export type ProfitHunterDateRangeQuery = z.infer<
  typeof profitHunterDateRangeQuerySchema
>;
export type ProfitHunterProjectsQuery = z.infer<
  typeof profitHunterProjectsQuerySchema
>;
