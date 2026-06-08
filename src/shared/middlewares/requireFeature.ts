import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError";
import type { Feature } from "../permissions/features";
import {
  getRequiredPlansForFeature,
  planHasFeature,
} from "../permissions/features";

export function requireFeature(feature: Feature) {
  return async function requireFeatureHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    const currentPlan = request.organization.plan;

    if (!planHasFeature(currentPlan, feature)) {
      throw new AppError(
        "Esta funcionalidade não está disponível no plano atual.",
        403,
        "FEATURE_NOT_AVAILABLE",
        {
          feature,
          currentPlan,
          requiredPlans: getRequiredPlansForFeature(feature),
        },
      );
    }
  };
}
