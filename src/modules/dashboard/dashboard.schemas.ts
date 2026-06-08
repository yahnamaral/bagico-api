import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
