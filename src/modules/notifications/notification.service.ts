import { AppError } from "../../shared/errors/AppError";
import type {
  CreateNotificationData,
  NotificationPublic,
  NotificationRepository,
} from "./notification.repository";
import type { ListNotificationsQuery } from "./notification.schemas";

export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  createNotification(
    data: CreateNotificationData,
  ): Promise<NotificationPublic> {
    return this.repository.create(data);
  }

  createManyNotifications(
    data: CreateNotificationData[],
  ): Promise<NotificationPublic[]> {
    return this.repository.createMany(data);
  }

  async list(
    organizationId: string,
    recipientClerkUserId: string,
    query: ListNotificationsQuery,
  ) {
    const [data, total, unreadCount] = await this.repository.list(
      organizationId,
      recipientClerkUserId,
      {
        page: query.page,
        limit: query.limit,
        unreadOnly: query.unreadOnly,
        type: query.type,
      },
    );

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
      unreadCount,
    };
  }

  getUnreadCount(organizationId: string, recipientClerkUserId: string) {
    return this.repository.getUnreadCount(organizationId, recipientClerkUserId);
  }

  async markAsRead(
    organizationId: string,
    recipientClerkUserId: string,
    id: string,
  ) {
    const notification = await this.repository.findById(
      organizationId,
      recipientClerkUserId,
      id,
    );

    if (!notification) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }

    if (notification.readAt) {
      return notification;
    }

    const updated = await this.repository.markAsRead(
      organizationId,
      recipientClerkUserId,
      id,
    );

    if (!updated) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }

    return updated;
  }

  async markAllAsRead(organizationId: string, recipientClerkUserId: string) {
    const result = await this.repository.markAllAsRead(
      organizationId,
      recipientClerkUserId,
    );

    return { updatedCount: result.count };
  }

  async remove(
    organizationId: string,
    recipientClerkUserId: string,
    id: string,
  ) {
    const notification = await this.repository.findById(
      organizationId,
      recipientClerkUserId,
      id,
    );

    if (!notification) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }

    const deleted = await this.repository.softDelete(
      organizationId,
      recipientClerkUserId,
      id,
    );

    if (!deleted) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }

    return { success: true };
  }
}
