import { z } from "zod";

export const syncOrganizationBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  personaMode: z.enum(["AGENCY", "BUSINESS"]),
  clerkOrgId: z.string().trim().min(1).optional(),
});

export type SyncOrganizationBody = z.infer<typeof syncOrganizationBodySchema>;
