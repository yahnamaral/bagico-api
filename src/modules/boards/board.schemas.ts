import { z } from "zod";

const optionalDescription = z.string().trim().min(1).optional();

export const listBoardsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  projectId: z.uuid().optional(),
  search: z.string().trim().min(1).optional(),
});

export const createBoardBodySchema = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(2),
  description: optionalDescription,
});

export const updateBoardBodySchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: optionalDescription.nullable(),
});

export const boardIdParamSchema = z.object({
  id: z.uuid(),
});

export const boardColumnParamsSchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
});

export const createColumnBodySchema = z.object({
  name: z.string().trim().min(2),
  color: z.string().trim().min(1).optional(),
});

export const updateColumnBodySchema = z.object({
  name: z.string().trim().min(2).optional(),
  color: z.string().trim().min(1).nullable().optional(),
  position: z.coerce.number().int().min(1).optional(),
});

export const reorderColumnsBodySchema = z.object({
  columns: z
    .array(
      z.object({
        id: z.uuid(),
        position: z.coerce.number().int().min(1),
      }),
    )
    .min(1),
});

export type ListBoardsQuery = z.infer<typeof listBoardsQuerySchema>;
export type CreateBoardBody = z.infer<typeof createBoardBodySchema>;
export type UpdateBoardBody = z.infer<typeof updateBoardBodySchema>;
export type CreateColumnBody = z.infer<typeof createColumnBodySchema>;
export type UpdateColumnBody = z.infer<typeof updateColumnBodySchema>;
export type ReorderColumnsBody = z.infer<typeof reorderColumnsBodySchema>;
