import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError";
import type { Feature } from "../permissions/features";
import { planHasFeature } from "../permissions/features";

export function requireAnyFeature(features: Feature[]) {
  return async function requireAnyFeatureHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.organization) {
      throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
    }

    const hasFeature = features.some((feature) =>
      planHasFeature(request.organization!.plan, feature),
    );

    if (!hasFeature) {
      throw new AppError(
        "Esta funcionalidade não está disponível no plano atual.",
        403,
        "FEATURE_NOT_AVAILABLE",
        {
          requiredFeatures: features,
          currentPlan: request.organization.plan,
        },
      );
    }
  };
}
