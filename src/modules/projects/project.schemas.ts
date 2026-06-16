import { z } from "zod";

const projectStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "FINISHED",
  "ARCHIVED",
]);

const projectPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const projectTypeSchema = z.enum(["ONE_OFF", "RECURRING"]);

const recurrenceIntervalSchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
]);

const optionalDescription = z.string().trim().min(1).optional();

const renewalDaySchema = z.coerce.number().int().min(1).max(31);

const fixedDeliverablesSchema = z.string().trim().min(1);

function validateDateRange(
  data: { startDate?: Date; dueDate?: Date },
  ctx: z.RefinementCtx,
) {
  if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
    ctx.addIssue({
      code: "custom",
      message: "dueDate cannot be earlier than startDate",
      path: ["dueDate"],
    });
  }
}

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  type: projectTypeSchema.optional(),
  clientId: z.uuid().optional(),
});

export const createProjectBodySchema = z
  .object({
    clientId: z.uuid(),
    name: z.string().trim().min(2),
    description: optionalDescription,
    status: projectStatusSchema.optional(),
    priority: projectPrioritySchema.optional(),
    type: projectTypeSchema.optional(),
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    budget: z.coerce.number().positive().optional(),
    monthlyFee: z.coerce.number().positive().optional(),
    recurrenceInterval: recurrenceIntervalSchema.optional(),
    renewalDay: renewalDaySchema.optional(),
    fixedDeliverables: fixedDeliverablesSchema.optional(),
  })
  .superRefine((data, ctx) => {
    validateDateRange(data, ctx);

    if ((data.type ?? "ONE_OFF") === "RECURRING") {
      if (data.monthlyFee === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "monthlyFee is required for recurring projects",
          path: ["monthlyFee"],
        });
      }

      if (!data.recurrenceInterval) {
        ctx.addIssue({
          code: "custom",
          message: "recurrenceInterval is required for recurring projects",
          path: ["recurrenceInterval"],
        });
      }
    }
  });

export const updateProjectBodySchema = z
  .object({
    clientId: z.uuid().optional(),
    name: z.string().trim().min(2).optional(),
    description: optionalDescription.nullable(),
    status: projectStatusSchema.optional(),
    priority: projectPrioritySchema.optional(),
    type: projectTypeSchema.optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    budget: z.coerce.number().positive().nullable().optional(),
    monthlyFee: z.coerce.number().positive().nullable().optional(),
    recurrenceInterval: recurrenceIntervalSchema.nullable().optional(),
    renewalDay: renewalDaySchema.nullable().optional(),
    fixedDeliverables: fixedDeliverablesSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    validateDateRange(
      {
        startDate: data.startDate ?? undefined,
        dueDate: data.dueDate ?? undefined,
      },
      ctx,
    );
  });

export const projectIdParamSchema = z.object({
  id: z.uuid(),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
