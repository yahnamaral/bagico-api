import type { PlanType } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const ACTIVE_SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIALING"] as const;

export class BillingRepository {
  protected readonly db = prisma;

  findOrganization(organizationId: string) {
    return this.db.organization.findUnique({
      where: { id: organizationId },
    });
  }

  findActiveSubscription(organizationId: string) {
    return this.db.organizationSubscription.findFirst({
      where: {
        organizationId,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  updateOrganizationPlan(organizationId: string, plan: PlanType) {
    return this.db.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
  }

  createSubscription(organizationId: string, plan: PlanType) {
    return this.db.organizationSubscription.create({
      data: {
        organizationId,
        plan,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });
  }

  updateSubscriptionPlan(organizationId: string, subscriptionId: string, plan: PlanType) {
    return this.db.organizationSubscription.updateMany({
      where: {
        id: subscriptionId,
        organizationId,
      },
      data: { plan },
    });
  }
}
