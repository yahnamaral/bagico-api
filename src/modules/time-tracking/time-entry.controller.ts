import type { FastifyRequest } from "fastify";
import type { TimeEntryService } from "./time-entry.service";
import {
  listTaskTimeQuerySchema,
  manualTimeEntryBodySchema,
  projectIdParamSchema,
  projectTimeSummaryQuerySchema,
  startTimerBodySchema,
  stopTimerBodySchema,
  taskIdParamSchema,
  timeEntryIdParamSchema,
  updateTimeEntryBodySchema,
} from "./time-entry.schemas";

export class TimeEntryController {
  constructor(private readonly service: TimeEntryService) {}

  startTimer(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const body = startTimerBodySchema.parse(request.body ?? {});

    return this.service.startTimer(
      request.organization!.id,
      request.auth!.userId,
      taskId,
      body,
    );
  }

  stopTimer(request: FastifyRequest) {
    const { id } = timeEntryIdParamSchema.parse(request.params);
    const body = stopTimerBodySchema.parse(request.body ?? {});

    return this.service.stopTimer(
      request.organization!.id,
      request.auth!.userId,
      id,
      body,
    );
  }

  createManualEntry(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const body = manualTimeEntryBodySchema.parse(request.body);

    return this.service.createManualEntry(
      request.organization!.id,
      request.auth!.userId,
      taskId,
      body,
    );
  }

  listTaskTime(request: FastifyRequest) {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const query = listTaskTimeQuerySchema.parse(request.query);

    return this.service.listTaskTime(
      request.organization!.id,
      request.auth!.userId,
      request.member!.role,
      taskId,
      query,
    );
  }

  getRunningTimer(request: FastifyRequest) {
    return this.service.getRunningTimer(
      request.organization!.id,
      request.auth!.userId,
    );
  }

  updateEntry(request: FastifyRequest) {
    const { id } = timeEntryIdParamSchema.parse(request.params);
    const body = updateTimeEntryBodySchema.parse(request.body);

    return this.service.updateEntry(
      request.organization!.id,
      request.auth!.userId,
      request.member!.role,
      id,
      body,
    );
  }

  deleteEntry(request: FastifyRequest) {
    const { id } = timeEntryIdParamSchema.parse(request.params);

    return this.service.deleteEntry(
      request.organization!.id,
      request.auth!.userId,
      request.member!.role,
      id,
    );
  }

  getProjectTimeSummary(request: FastifyRequest) {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const query = projectTimeSummaryQuerySchema.parse(request.query);

    return this.service.getProjectTimeSummary(
      request.organization!.id,
      projectId,
      query,
    );
  }
}
