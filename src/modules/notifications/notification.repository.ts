import type {
  NotificationEntityType,
  NotificationType,
  OrganizationRole,
  Prisma,
} from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const notificationPublicSelect = {
  id: true,
  organizationId: true,
  recipientClerkUserId: true,
  actorClerkUserId: true,
  type: true,
  title: true,
  message: true,
  href: true,
  entityType: true,
  entityId: true,
  metadata: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type NotificationPublic = Prisma.NotificationGetPayload<{
  select: typeof notificationPublicSelect;
}>;

export type CreateNotificationData = {
  organizationId: string;
  recipientClerkUserId: string;
  actorClerkUserId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export class NotificationRepository {
  protected readonly db = prisma;

  create(data: CreateNotificationData): Promise<NotificationPublic> {
    return this.db.notification.create({
      data,
      select: notificationPublicSelect,
    });
  }

  createMany(data: CreateNotificationData[]): Promise<NotificationPublic[]> {
    if (data.length === 0) {
      return Promise.resolve([]);
    }

    return this.db.$transaction(
      data.map((item) =>
        this.db.notification.create({
          data: item,
          select: notificationPublicSelect,
        }),
      ),
    );
  }

  list(
    organizationId: string,
    recipientClerkUserId: string,
    options: {
      page: number;
      limit: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    },
  ) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientClerkUserId,
      deletedAt: null,
      ...(options.unreadOnly ? { readAt: null } : {}),
      ...(options.type ? { type: options.type } : {}),
    };

    const skip = (options.page - 1) * options.limit;

    return Promise.all([
      this.db.notification.findMany({
        where,
        select: notificationPublicSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: options.limit,
      }),
      this.db.notification.count({ where }),
      this.getUnreadCount(organizationId, recipientClerkUserId),
    ]);
  }

  getUnreadCount(organizationId: string, recipientClerkUserId: string) {
    return this.db.notification.count({
      where: {
        organizationId,
        recipientClerkUserId,
        deletedAt: null,
        readAt: null,
      },
    });
  }

  findById(
    organizationId: string,
    recipientClerkUserId: string,
    id: string,
  ) {
    return this.db.notification.findFirst({
      where: {
        id,
        organizationId,
        recipientClerkUserId,
        deletedAt: null,
      },
      select: notificationPublicSelect,
    });
  }

  async markAsRead(
    organizationId: string,
    recipientClerkUserId: string,
    id: string,
  ): Promise<NotificationPublic | null> {
    const result = await this.db.notification.updateMany({
      where: {
        id,
        organizationId,
        recipientClerkUserId,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(organizationId, recipientClerkUserId, id);
  }

  markAllAsRead(organizationId: string, recipientClerkUserId: string) {
    return this.db.notification.updateMany({
      where: {
        organizationId,
        recipientClerkUserId,
        deletedAt: null,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  async softDelete(
    organizationId: string,
    recipientClerkUserId: string,
    id: string,
  ) {
    const result = await this.db.notification.updateMany({
      where: {
        id,
        organizationId,
        recipientClerkUserId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  }

  findOrganization(organizationId: string) {
    return this.db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });
  }

  findMemberClerkUserIdsByRoles(
    organizationId: string,
    roles: OrganizationRole[],
  ) {
    return this.db.organizationMember.findMany({
      where: {
        organizationId,
        role: { in: roles },
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { clerkUserId: true },
    });
  }
}
