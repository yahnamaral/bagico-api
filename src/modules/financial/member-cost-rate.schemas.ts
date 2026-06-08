import { z } from "zod";

const positiveMoney = z.coerce.number().positive();

export const memberCostRateIdParamSchema = z.object({
  id: z.uuid(),
});

export const listMemberCostRatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clerkUserId: z.string().trim().min(1).optional(),
});

export const createMemberCostRateBodySchema = z
  .object({
    clerkUserId: z.string().trim().min(1),
    hourlyCost: positiveMoney,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "endsAt must be greater than startsAt",
    path: ["endsAt"],
  });

export const updateMemberCostRateBodySchema = z
  .object({
    hourlyCost: positiveMoney.optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt > data.startsAt;
      }

      return true;
    },
    {
      message: "endsAt must be greater than startsAt",
      path: ["endsAt"],
    },
  );

export type ListMemberCostRatesQuery = z.infer<
  typeof listMemberCostRatesQuerySchema
>;
export type CreateMemberCostRateBody = z.infer<
  typeof createMemberCostRateBodySchema
>;
export type UpdateMemberCostRateBody = z.infer<
  typeof updateMemberCostRateBodySchema
>;
