import { z } from "zod";

const taskStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "DONE",
  "ARCHIVED",
]);

const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const optionalDescription = z.string().trim().min(1).optional();

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  boardId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  clientId: z.uuid().optional(),
  assignedToMe: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export const createTaskBodySchema = z.object({
  boardId: z.uuid(),
  columnId: z.uuid(),
  title: z.string().trim().min(2),
  description: optionalDescription,
  priority: taskPrioritySchema.optional(),
  mediaType: z.string().trim().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  assignedToClerkUserId: z.string().trim().min(1).optional(),
});

export const updateTaskBodySchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: optionalDescription.nullable(),
  priority: taskPrioritySchema.optional(),
  mediaType: z.string().trim().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assignedToClerkUserId: z.string().trim().min(1).nullable().optional(),
  estimatedMinutes: z.coerce.number().int().min(0).nullable().optional(),
  status: taskStatusSchema.optional(),
});

export const moveTaskBodySchema = z.object({
  targetColumnId: z.uuid(),
  targetPosition: z.coerce.number().int().min(1),
});

export const taskIdParamSchema = z.object({
  id: z.uuid(),
});

export const requestApprovalBodySchema = z.object({
  message: z.string().trim().min(1).max(3000).optional(),
});

export const approveTaskBodySchema = z.object({
  comment: z.string().trim().min(1).max(3000).optional(),
});

export const requestChangesBodySchema = z.object({
  comment: z.string().trim().min(1).max(5000),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type MoveTaskBody = z.infer<typeof moveTaskBodySchema>;
export type RequestApprovalBody = z.infer<typeof requestApprovalBodySchema>;
export type ApproveTaskBody = z.infer<typeof approveTaskBodySchema>;
export type RequestChangesBody = z.infer<typeof requestChangesBodySchema>;
