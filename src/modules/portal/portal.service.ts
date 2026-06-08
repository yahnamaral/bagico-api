import {
  ClientPortalRole,
  OrganizationRole,
  TaskApprovalStatus,
  TaskCommentType,
  TaskStatus,
} from "../../../generated/prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { fireNotification } from "../notifications/notification.helpers";
import { notificationEvents } from "../notifications/notification-events.instance";
import { getPlanFeatures } from "../../shared/permissions/features";
import { getRolePermissions } from "../../shared/permissions/permissions";
import type { Organization, OrganizationMember } from "../../../generated/prisma/client";
import { OrganizationRepository } from "../organizations/organization.repository";
import { TASK_ACTIVITY_TYPES } from "../tasks/task-activity.constants";
import type { TaskActivityService } from "../tasks/task-activity.service";
import type { TaskApprovalRepository } from "../tasks/task-approval.repository";
import {
  moveTaskToColumnByName,
  tryMoveTaskToColumnByName,
} from "../tasks/task-column.helper";
import type { TaskRepository } from "../tasks/task.repository";
import {
  assertClientAccessible,
  resolvePortalAccess,
  type PortalAccess,
} from "./portal-access";
import {
  mapPortalTaskDetail,
  mapPortalTaskListItem,
  PortalRepository,
} from "./portal.repository";
import type {
  CreatePortalMemberBody,
  ListPortalTasksQuery,
  PortalApproveBody,
  PortalCommentBody,
  PortalRequestChangesBody,
  UpdatePortalMemberBody,
} from "./portal.schemas";

function mapPortalRoleToOrganizationRole(
  role: ClientPortalRole,
): OrganizationRole {
  const roleMap: Record<ClientPortalRole, OrganizationRole> = {
    [ClientPortalRole.CLIENT_ADMIN]: OrganizationRole.CLIENT_ADMIN,
    [ClientPortalRole.CLIENT_MANAGER]: OrganizationRole.CLIENT_MANAGER,
    [ClientPortalRole.CLIENT_STAFF]: OrganizationRole.CLIENT_STAFF,
  };

  return roleMap[role];
}

export class PortalService {
  constructor(
    private readonly repository: PortalRepository,
    private readonly taskRepository: TaskRepository,
    private readonly approvalRepository: TaskApprovalRepository,
    private readonly activityService: TaskActivityService,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  private async getAccess(
    organizationId: string,
    userId: string,
    member: OrganizationMember,
  ) {
    return resolvePortalAccess(organizationId, userId, member.role);
  }

  private ensureHasPortalAccess(access: PortalAccess) {
    if (!access.fullAccess && access.clientIds.length === 0) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  private ensureTaskClientAccess(access: PortalAccess, clientId: string) {
    if (!assertClientAccessible(access, clientId)) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }
  }

  private validateClientFilter(access: PortalAccess, clientId?: string) {
    if (clientId && !assertClientAccessible(access, clientId)) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }
  }

  async getMe(
    organizationId: string,
    userId: string,
    organization: Organization,
    member: OrganizationMember,
  ) {
    const access = await this.getAccess(organizationId, userId, member);

    const accessibleClients = access.fullAccess
      ? await this.repository.findAccessibleClients(organizationId, [])
      : await this.repository.findAccessibleClients(
          organizationId,
          access.clientIds,
        );

    return {
      userId,
      organization,
      member,
      accessibleClients,
      permissions: [...getRolePermissions(member.role)],
      features: [...getPlanFeatures(organization.plan)],
    };
  }

  async listTasks(
    organizationId: string,
    userId: string,
    member: OrganizationMember,
    query: ListPortalTasksQuery,
  ) {
    const access = await this.getAccess(organizationId, userId, member);

    if (!access.fullAccess && access.clientIds.length === 0) {
      return {
        data: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    this.validateClientFilter(access, query.clientId);

    const { tasks, total } = await this.repository.listTasks(
      organizationId,
      access,
      query,
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data: tasks.map(mapPortalTaskListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getTaskById(
    organizationId: string,
    userId: string,
    member: OrganizationMember,
    taskId: string,
  ) {
    const access = await this.getAccess(organizationId, userId, member);
    this.ensureHasPortalAccess(access);

    const task = await this.repository.findTaskById(organizationId, taskId);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    this.ensureTaskClientAccess(access, task.clientId);

    const [approvalComments, approvalActivities] = await Promise.all([
      this.approvalRepository.findApprovalComments(organizationId, taskId),
      this.approvalRepository.findApprovalActivities(organizationId, taskId),
    ]);

    const mappedTask = mapPortalTaskDetail(task);

    return {
      ...mappedTask,
      approval: {
        approvalStatus: task.approvalStatus,
        approvalRequestedAt: task.approvalRequestedAt,
        approvedAt: task.approvedAt,
        changeRequestedAt: task.changeRequestedAt,
        comments: approvalComments,
        activities: approvalActivities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          message: activity.message,
          createdAt: activity.createdAt,
        })),
      },
    };
  }

  async addComment(
    organizationId: string,
    userId: string,
    member: OrganizationMember,
    taskId: string,
    body: PortalCommentBody,
  ) {
    const access = await this.getAccess(organizationId, userId, member);
    this.ensureHasPortalAccess(access);

    const task = await this.taskRepository.findById(organizationId, taskId);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    this.ensureTaskClientAccess(access, task.clientId);

    const comment = await this.approvalRepository.createTypedComment(
      organizationId,
      taskId,
      userId,
      body.content,
      TaskCommentType.COMMENT,
    );

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.PORTAL_COMMENT_CREATED,
      "Portal comment added",
      {
        clerkUserId: userId,
        metadata: { commentId: comment.id },
      },
    );

    fireNotification(() =>
      notificationEvents.notifyPortalCommentCreated({
        organizationId,
        task,
        comment,
        actorClerkUserId: userId,
      }),
    );

    return comment;
  }

  async approve(
    organizationId: string,
    userId: string,
    member: OrganizationMember,
    taskId: string,
    body: PortalApproveBody,
  ) {
    const access = await this.getAccess(organizationId, userId, member);
    this.ensureHasPortalAccess(access);

    const task = await this.taskRepository.findByIdWithCounts(
      organizationId,
      taskId,
    );

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    this.ensureTaskClientAccess(access, task.clientId);

    const now = new Date();

    const movedToAprovado = await tryMoveTaskToColumnByName({
      taskId,
      organizationId,
      boardId: task.boardId,
      columnName: "Aprovado",
    });

    if (!movedToAprovado) {
      await moveTaskToColumnByName({
        taskId,
        organizationId,
        boardId: task.boardId,
        columnName: "Agendado",
      });
    }

    await this.approvalRepository.updateApprovalFields(organizationId, taskId, {
      approvalStatus: TaskApprovalStatus.APPROVED,
      approvedAt: now,
      approvedByClerkUserId: userId,
      status: TaskStatus.APPROVED,
      isRework: false,
    });

    if (body.comment) {
      await this.approvalRepository.createTypedComment(
        organizationId,
        taskId,
        userId,
        body.comment,
        TaskCommentType.APPROVAL,
      );
    }

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.PORTAL_TASK_APPROVED,
      "Task approved via portal",
      {
        clerkUserId: userId,
        metadata: { comment: body.comment ?? null },
      },
    );

    fireNotification(() =>
      notificationEvents.notifyTaskApproved({
        organizationId,
        task,
        actorClerkUserId: userId,
      }),
    );

    return this.getTaskById(organizationId, userId, member, taskId);
  }

  async requestChanges(
    organizationId: string,
    userId: string,
    member: OrganizationMember,
    taskId: string,
    body: PortalRequestChangesBody,
  ) {
    const access = await this.getAccess(organizationId, userId, member);
    this.ensureHasPortalAccess(access);

    const task = await this.taskRepository.findById(organizationId, taskId);

    if (!task) {
      throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    }

    this.ensureTaskClientAccess(access, task.clientId);

    const now = new Date();

    await this.approvalRepository.updateApprovalFields(organizationId, taskId, {
      approvalStatus: TaskApprovalStatus.CHANGES_REQUESTED,
      changeRequestedAt: now,
      changeRequestedByClerkUserId: userId,
      status: TaskStatus.IN_PROGRESS,
      isRework: true,
    });

    await this.approvalRepository.createTypedComment(
      organizationId,
      taskId,
      userId,
      body.comment,
      TaskCommentType.CHANGE_REQUEST,
    );

    await this.activityService.log(
      organizationId,
      taskId,
      TASK_ACTIVITY_TYPES.PORTAL_CHANGES_REQUESTED,
      "Changes requested via portal",
      {
        clerkUserId: userId,
        metadata: { comment: body.comment },
      },
    );

    fireNotification(() =>
      notificationEvents.notifyChangesRequested({
        organizationId,
        task,
        actorClerkUserId: userId,
      }),
    );

    await moveTaskToColumnByName({
      taskId,
      organizationId,
      boardId: task.boardId,
      columnName: "Produção",
    });

    return this.getTaskById(organizationId, userId, member, taskId);
  }

  async listPortalMembers(organizationId: string, clientId: string) {
    const client = await this.repository.findClient(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    return this.repository.findClientMembers(organizationId, clientId);
  }

  async createPortalMember(
    organizationId: string,
    clientId: string,
    body: CreatePortalMemberBody,
  ) {
    const client = await this.repository.findClient(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    const existing = await this.repository.findClientMemberByUser(
      organizationId,
      clientId,
      body.clerkUserId,
    );

    if (existing) {
      throw new AppError(
        "User is already linked to this client",
        409,
        "PORTAL_MEMBER_EXISTS",
      );
    }

    const orgMember = await this.organizationRepository.findMember(
      organizationId,
      body.clerkUserId,
    );

    if (!orgMember) {
      await this.organizationRepository.createMemberWithRole(
        organizationId,
        body.clerkUserId,
        mapPortalRoleToOrganizationRole(body.role),
      );
    }

    return this.repository.createClientMember({
      organizationId,
      clientId,
      clerkUserId: body.clerkUserId,
      role: body.role,
    });
  }

  async updatePortalMember(
    organizationId: string,
    clientId: string,
    memberId: string,
    body: UpdatePortalMemberBody,
  ) {
    const member = await this.repository.updateClientMember(
      organizationId,
      clientId,
      memberId,
      body.role,
    );

    if (!member) {
      throw new AppError("Portal member not found", 404, "PORTAL_MEMBER_NOT_FOUND");
    }

    return member;
  }

  async removePortalMember(
    organizationId: string,
    clientId: string,
    memberId: string,
  ) {
    const deleted = await this.repository.softDeleteClientMember(
      organizationId,
      clientId,
      memberId,
    );

    if (!deleted) {
      throw new AppError("Portal member not found", 404, "PORTAL_MEMBER_NOT_FOUND");
    }
  }
}
