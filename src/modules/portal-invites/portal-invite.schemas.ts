import { z } from "zod";

export const clientPortalRoleSchema = z.enum([
  "CLIENT_ADMIN",
  "CLIENT_MANAGER",
  "CLIENT_STAFF",
]);

export const clientIdParamSchema = z.object({
  clientId: z.uuid(),
});

export const inviteParamsSchema = z.object({
  clientId: z.uuid(),
  inviteId: z.uuid(),
});

export const createPortalInviteBodySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  role: clientPortalRoleSchema,
});

export const validateInviteQuerySchema = z.object({
  token: z.string().trim().min(1),
});

export const acceptInviteBodySchema = z.object({
  token: z.string().trim().min(1),
});

export type CreatePortalInviteBody = z.infer<typeof createPortalInviteBodySchema>;
export type AcceptInviteBody = z.infer<typeof acceptInviteBodySchema>;
