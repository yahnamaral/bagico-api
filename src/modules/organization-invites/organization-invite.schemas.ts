import { z } from "zod";

export const internalInviteRoleSchema = z.enum([
  "AGENCY_MANAGER",
  "AGENCY_MAKER",
  "FREELANCER",
]);

export const organizationInviteStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
]);

export const inviteIdParamSchema = z.object({
  inviteId: z.uuid(),
});

export const createOrganizationInviteBodySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  role: internalInviteRoleSchema,
});

export const listOrganizationInvitesQuerySchema = z.object({
  status: organizationInviteStatusSchema.optional(),
});

export const validateOrganizationInviteQuerySchema = z.object({
  token: z.string().trim().min(1),
});

export const acceptOrganizationInviteBodySchema = z.object({
  token: z.string().trim().min(1),
});

export type CreateOrganizationInviteBody = z.infer<
  typeof createOrganizationInviteBodySchema
>;
export type ListOrganizationInvitesQuery = z.infer<
  typeof listOrganizationInvitesQuerySchema
>;
export type AcceptOrganizationInviteBody = z.infer<
  typeof acceptOrganizationInviteBodySchema
>;
