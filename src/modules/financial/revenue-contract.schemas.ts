import { z } from "zod";

const positiveMoney = z.coerce.number().positive();

export const revenueContractTypeSchema = z.enum([
  "RECURRING",
  "PROJECT_FIXED",
  "HOURLY",
  "ONE_TIME",
]);

export const billingCycleSchema = z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]);

export const revenueContractStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "FINISHED",
  "CANCELED",
]);

export const revenueContractIdParamSchema = z.object({
  id: z.uuid(),
});

export const listRevenueContractsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clientId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  status: revenueContractStatusSchema.optional(),
  type: revenueContractTypeSchema.optional(),
});

const contractDateFields = {
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
};

export const createRevenueContractBodySchema = z
  .object({
    clientId: z.uuid(),
    projectId: z.uuid().optional(),
    name: z.string().trim().min(1).max(200),
    type: revenueContractTypeSchema,
    amount: positiveMoney,
    billingCycle: billingCycleSchema.optional(),
    status: revenueContractStatusSchema.optional(),
    ...contractDateFields,
  })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "endsAt must be greater than startsAt",
    path: ["endsAt"],
  });

export const updateRevenueContractBodySchema = z
  .object({
    clientId: z.uuid().optional(),
    projectId: z.uuid().nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    type: revenueContractTypeSchema.optional(),
    amount: positiveMoney.optional(),
    billingCycle: billingCycleSchema.nullable().optional(),
    status: revenueContractStatusSchema.optional(),
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

export type ListRevenueContractsQuery = z.infer<
  typeof listRevenueContractsQuerySchema
>;
export type CreateRevenueContractBody = z.infer<
  typeof createRevenueContractBodySchema
>;
export type UpdateRevenueContractBody = z.infer<
  typeof updateRevenueContractBodySchema
>;
