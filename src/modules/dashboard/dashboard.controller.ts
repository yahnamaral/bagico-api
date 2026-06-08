import type { FastifyRequest } from "fastify";
import type { DashboardService } from "./dashboard.service";
import { dashboardSummaryQuerySchema } from "./dashboard.schemas";

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  getSummary(request: FastifyRequest) {
    const query = dashboardSummaryQuerySchema.parse(request.query);

    return this.service.getSummary(
      request.organization!,
      request.member!,
      request.auth!.userId,
      query,
    );
  }
}
