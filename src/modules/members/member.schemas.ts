import { z } from "zod";
import { internalInviteRoleSchema } from "../organization-invites/organization-invite.schemas";

export const memberIdParamSchema = z.object({
  memberId: z.uuid(),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: internalInviteRoleSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export const updateMemberRoleBodySchema = z.object({
  role: internalInviteRoleSchema,
});

export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBodySchema>;
