import { PlanType } from "@prisma/client";

export type PlanLimits = {
  maxUsers: number | null;
  maxClients: number | null;
  maxProjects: number | null;
  aiCredits: number;
};

export type BillingPlanDefinition = {
  plan: PlanType;
  name: string;
  description: string;
  priceMonthly: number | null;
  recommended: boolean;
  features: readonly string[];
  limits: PlanLimits;
};

export const BILLING_PLANS: Record<PlanType, BillingPlanDefinition> = {
  [PlanType.START]: {
    plan: PlanType.START,
    name: "Start",
    description: "Organização básica para freelancers e PMEs iniciando.",
    priceMonthly: 0,
    recommended: false,
    features: ["operation", "kanban", "clients", "projects"],
    limits: {
      maxUsers: 3,
      maxClients: 5,
      maxProjects: 10,
      aiCredits: 0,
    },
  },
  [PlanType.PRO]: {
    plan: PlanType.PRO,
    name: "Pro",
    description:
      "Gestão profissional com portal, financeiro e controle de lucro.",
    priceMonthly: null,
    recommended: true,
    features: [
      "operation",
      "kanban",
      "clients",
      "projects",
      "time_tracking",
      "financial",
      "profit_hunter",
      "client_portal",
    ],
    limits: {
      maxUsers: 10,
      maxClients: 50,
      maxProjects: 100,
      aiCredits: 0,
    },
  },
  [PlanType.AGENCY]: {
    plan: PlanType.AGENCY,
    name: "Agency",
    description: "Escala, automação, IA e integrações avançadas.",
    priceMonthly: null,
    recommended: false,
    features: [
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
    ],
    limits: {
      maxUsers: null,
      maxClients: null,
      maxProjects: null,
      aiCredits: 10000,
    },
  },
};

export const BILLING_PLAN_LIST = Object.values(BILLING_PLANS);

export function getBillingPlan(plan: PlanType): BillingPlanDefinition {
  return BILLING_PLANS[plan];
}

export function getPublicPlanCatalog() {
  return BILLING_PLAN_LIST.map(
    ({ plan, name, description, features, limits, recommended, priceMonthly }) => ({
      plan,
      name,
      description,
      features: [...features],
      limits,
      recommended,
      priceMonthly,
    }),
  );
}
