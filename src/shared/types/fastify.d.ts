import type { Organization, OrganizationMember } from "@prisma/client";
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      userId: string;
      sessionId?: string | null;
      orgId?: string | null;
    };
    organization?: Organization;
    member?: OrganizationMember;
  }
}
