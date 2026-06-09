import { OrganizationRole, PlanType } from "@prisma/client";
import {
  getBillingPlan,
  getPublicPlanCatalog,
} from "../../shared/billing/plans";
import {
  getLockedFeatures,
  getPlanComparison,
  getPlanFeatures,
} from "../../shared/billing/features";
import { AppError } from "../../shared/errors/AppError";
import type { BillingRepository } from "./billing.repository";
import type { UpdateCurrentPlanBody } from "./billing.schemas";

const PLAN_CHANGE_ROLES = new Set<OrganizationRole>([
  OrganizationRole.SUPER_ADMIN,
  OrganizationRole.AGENCY_OWNER,
]);

function buildPlanContext(plan: PlanType) {
  const planDetails = getBillingPlan(plan);

  return {
    currentPlan: plan,
    availableFeatures: [...getPlanFeatures(plan)],
    lockedFeatures: getLockedFeatures(plan),
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
}

export class BillingService {
  constructor(private readonly repository: BillingRepository) {}

  listPlans() {
    return getPublicPlanCatalog();
  }

  async getCurrent(organizationId: string) {
    const organization = await this.repository.findOrganization(organizationId);

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    const subscription =
      await this.repository.findActiveSubscription(organizationId);

    const planContext = buildPlanContext(organization.plan);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      ...planContext,
      subscription,
    };
  }

  getFeatures(organizationId: string, plan: PlanType) {
    const planContext = buildPlanContext(plan);

    return {
      organizationId,
      ...planContext,
      features: planContext.availableFeatures,
      planComparison: getPlanComparison(),
    };
  }

  // TODO: Replace manual plan changes with a payment gateway webhook flow.
  async updateCurrentPlan(
    organizationId: string,
    memberRole: OrganizationRole,
    body: UpdateCurrentPlanBody,
  ) {
    if (!PLAN_CHANGE_ROLES.has(memberRole)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const organization = await this.repository.findOrganization(organizationId);

    if (!organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    await this.repository.updateOrganizationPlan(organizationId, body.plan);

    const activeSubscription =
      await this.repository.findActiveSubscription(organizationId);

    if (activeSubscription) {
      await this.repository.updateSubscriptionPlan(
        organizationId,
        activeSubscription.id,
        body.plan,
      );
    }

    const subscription =
      (await this.repository.findActiveSubscription(organizationId)) ??
      (await this.repository.createSubscription(organizationId, body.plan));

    const updatedOrganization = await this.repository.findOrganization(
      organizationId,
    );

    const planContext = buildPlanContext(body.plan);

    return {
      organization: updatedOrganization,
      subscription,
      ...planContext,
    };
  }
}
