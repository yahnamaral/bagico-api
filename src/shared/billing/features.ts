import { PlanType } from "@prisma/client";
import { BILLING_PLANS } from "./plans";

export const FEATURES = [
  "operation",
  "kanban",
  "clients",
  "projects",
  "time_tracking",
  "financial",
  "profit_hunter",
  "client_portal",
  "ai",
  "white_label",
  "crm_integrations",
  "billing",
] as const;

export type Feature = (typeof FEATURES)[number];

export const PLAN_FEATURES: Record<PlanType, readonly Feature[]> = {
  [PlanType.START]: BILLING_PLANS[PlanType.START].features as readonly Feature[],
  [PlanType.PRO]: BILLING_PLANS[PlanType.PRO].features as readonly Feature[],
  [PlanType.AGENCY]: BILLING_PLANS[PlanType.AGENCY].features as readonly Feature[],
};

export function getPlanFeatures(plan: PlanType): readonly Feature[] {
  return PLAN_FEATURES[plan];
}

export function planHasFeature(plan: PlanType, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

export function getLockedFeatures(plan: PlanType): Feature[] {
  return FEATURES.filter((feature) => !planHasFeature(plan, feature));
}

export function getRequiredPlansForFeature(feature: Feature): PlanType[] {
  return (Object.values(PlanType) as PlanType[]).filter((plan) =>
    planHasFeature(plan, feature),
  );
}

export function getPlanComparison() {
  return (Object.values(PlanType) as PlanType[]).map((plan) => ({
    plan,
    name: BILLING_PLANS[plan].name,
    features: [...getPlanFeatures(plan)],
    lockedFeatures: getLockedFeatures(plan),
    limits: BILLING_PLANS[plan].limits,
    recommended: BILLING_PLANS[plan].recommended,
  }));
}
