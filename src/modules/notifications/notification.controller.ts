import type { FastifyRequest } from "fastify";
import type { NotificationService } from "./notification.service";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from "./notification.schemas";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  list(request: FastifyRequest) {
    const query = listNotificationsQuerySchema.parse(request.query);

    return this.service.list(
      request.organization!.id,
      request.auth!.userId,
      query,
    );
  }

  getUnreadCount(request: FastifyRequest) {
    return this.service
      .getUnreadCount(request.organization!.id, request.auth!.userId)
      .then((unreadCount) => ({ unreadCount }));
  }

  markAsRead(request: FastifyRequest) {
    const { id } = notificationIdParamSchema.parse(request.params);

    return this.service.markAsRead(
      request.organization!.id,
      request.auth!.userId,
      id,
    );
  }

  markAllAsRead(request: FastifyRequest) {
    return this.service.markAllAsRead(
      request.organization!.id,
      request.auth!.userId,
    );
  }

  remove(request: FastifyRequest) {
    const { id } = notificationIdParamSchema.parse(request.params);

    return this.service.remove(
      request.organization!.id,
      request.auth!.userId,
      id,
    );
  }
}
