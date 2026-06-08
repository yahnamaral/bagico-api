import { z } from "zod";

export const planTypeSchema = z.enum(["START", "PRO", "AGENCY"]);

export const updateCurrentPlanBodySchema = z.object({
  plan: planTypeSchema,
});

export type UpdateCurrentPlanBody = z.infer<typeof updateCurrentPlanBodySchema>;
