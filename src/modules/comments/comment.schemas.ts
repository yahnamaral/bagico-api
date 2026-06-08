import { z } from "zod";

const taskCommentTypeSchema = z.enum([
  "COMMENT",
  "SYSTEM",
  "APPROVAL",
  "CHANGE_REQUEST",
]);

export const taskIdParamSchema = z.object({
  taskId: z.uuid(),
});

export const commentParamsSchema = z.object({
  taskId: z.uuid(),
  commentId: z.uuid(),
});

export const createCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
  type: taskCommentTypeSchema.optional(),
});

export const updateCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>;
