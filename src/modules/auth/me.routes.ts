import type { FastifyInstance } from "fastify";
import { getBillingPlan } from "../../shared/billing/plans";
import { getLockedFeatures, getPlanFeatures } from "../../shared/permissions/features";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireOrganizationMember } from "../../shared/middlewares/requireOrganizationMember";
import { getRolePermissions } from "../../shared/permissions/permissions";

export async function meRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    {
      preHandler: [requireAuth],
    },
    async (request) => {
      return {
        userId: request.auth?.userId,
        sessionId: request.auth?.sessionId,
        orgId: request.auth?.orgId,
      };
    },
  );

  app.get(
    "/me/permissions",
    {
      preHandler: [requireAuth, requireOrganizationMember],
    },
    async (request) => {
      const currentPlan = request.organization!.plan;
      const planDetails = getBillingPlan(currentPlan);

      return {
        userId: request.auth!.userId,
        organization: request.organization!,
        member: request.member!,
        permissions: [...getRolePermissions(request.member!.role)],
        currentPlan,
        features: [...getPlanFeatures(currentPlan)],
        lockedFeatures: getLockedFeatures(currentPlan),
        limits: planDetails.limits,
        planDetails: {
          plan: planDetails.plan,
          name: planDetails.name,
          description: planDetails.description,
          priceMonthly: planDetails.priceMonthly,
          recommended: planDetails.recommended,
          features: [...planDetails.features],
          limits: planDetails.limits,
        },
      };
    },
  );
}
