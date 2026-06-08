import { z } from "zod";

const taskApprovalStatusSchema = z.enum([
  "NOT_REQUESTED",
  "PENDING",
  "APPROVED",
  "CHANGES_REQUESTED",
]);

const taskStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "DONE",
  "ARCHIVED",
]);

export const listPortalTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  approvalStatus: taskApprovalStatusSchema.optional(),
  status: taskStatusSchema.optional(),
  clientId: z.uuid().optional(),
  projectId: z.uuid().optional(),
});

export const portalTaskIdParamSchema = z.object({
  id: z.uuid(),
});

export const portalCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const portalApproveBodySchema = z.object({
  comment: z.string().trim().min(1).max(5000).optional(),
});

export const portalRequestChangesBodySchema = z.object({
  comment: z.string().trim().min(1).max(5000),
});

export const clientPortalRoleSchema = z.enum([
  "CLIENT_ADMIN",
  "CLIENT_MANAGER",
  "CLIENT_STAFF",
]);

export const clientIdParamSchema = z.object({
  clientId: z.uuid(),
});

export const portalMemberParamsSchema = z.object({
  clientId: z.uuid(),
  memberId: z.uuid(),
});

export const createPortalMemberBodySchema = z.object({
  clerkUserId: z.string().trim().min(1),
  role: clientPortalRoleSchema,
});

export const updatePortalMemberBodySchema = z.object({
  role: clientPortalRoleSchema,
});

export type ListPortalTasksQuery = z.infer<typeof listPortalTasksQuerySchema>;
export type PortalCommentBody = z.infer<typeof portalCommentBodySchema>;
export type PortalApproveBody = z.infer<typeof portalApproveBodySchema>;
export type PortalRequestChangesBody = z.infer<
  typeof portalRequestChangesBodySchema
>;
export type CreatePortalMemberBody = z.infer<typeof createPortalMemberBodySchema>;
export type UpdatePortalMemberBody = z.infer<typeof updatePortalMemberBodySchema>;
