import {
  OrganizationRole,
  TaskApprovalStatus,
  TaskApproverKind,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./task-column.helper", () => ({
  moveTaskToColumnByName: vi.fn().mockResolvedValue(undefined),
  tryMoveTaskToColumnByName: vi.fn().mockResolvedValue(true),
}));

vi.mock("../notifications/notification-events.instance", () => ({
  notificationEvents: {
    notifyApprovalRequested: vi.fn().mockResolvedValue(undefined),
    notifyTaskApproved: vi.fn().mockResolvedValue(undefined),
    notifyChangesRequested: vi.fn().mockResolvedValue(undefined),
  },
}));

import { AppError } from "../../shared/errors/AppError";
import { notificationEvents } from "../notifications/notification-events.instance";
import { TaskApprovalService } from "./task-approval.service";

const ORG_ID = "org-1";
const TASK_ID = "task-1";
const USER_ID = "user-actor";
const APPROVER_ID = "user-approver";
const CLIENT_ID = "client-1";

function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    organizationId: ORG_ID,
    boardId: "board-1",
    clientId: CLIENT_ID,
    title: "Creative",
    approvalStatus: TaskApprovalStatus.PENDING,
    approvalRequestedAt: null,
    approvedAt: null,
    changeRequestedAt: null,
    approvalRequestedByClerkUserId: null,
    approvedByClerkUserId: null,
    changeRequestedByClerkUserId: null,
    responsibleApproverClerkUserId: null,
    responsibleApproverKind: null,
    createdByClerkUserId: "user-creator",
    assignedToClerkUserId: null,
    ...overrides,
  };
}

function buildService(task: ReturnType<typeof buildTask>) {
  const taskRepository = {
    findByIdWithCounts: vi.fn().mockResolvedValue(task),
  };

  const approvalRepository = {
    updateApprovalFields: vi.fn().mockResolvedValue({ count: 1 }),
    createTypedComment: vi.fn().mockResolvedValue({}),
    findActiveOrganizationMember: vi.fn().mockResolvedValue(null),
    findActiveClientMember: vi.fn().mockResolvedValue(null),
    findApprovalComments: vi.fn().mockResolvedValue([]),
    findApprovalActivities: vi.fn().mockResolvedValue([]),
  };

  const activityService = {
    log: vi.fn().mockResolvedValue(undefined),
  };

  const service = new TaskApprovalService(
    taskRepository as never,
    approvalRepository as never,
    activityService as never,
  );

  return { service, taskRepository, approvalRepository, activityService };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TaskApprovalService.approve", () => {
  it("approves immediately when an owner bypasses a NOT_REQUESTED task", async () => {
    const task = buildTask({ approvalStatus: TaskApprovalStatus.NOT_REQUESTED });
    const { service, approvalRepository } = buildService(task);

    await service.approve(ORG_ID, TASK_ID, USER_ID, OrganizationRole.AGENCY_OWNER, {
      bypassApprovalRequest: true,
    });

    expect(approvalRepository.updateApprovalFields).toHaveBeenCalledWith(
      ORG_ID,
      TASK_ID,
      expect.objectContaining({
        approvalStatus: TaskApprovalStatus.APPROVED,
        approvedByClerkUserId: USER_ID,
      }),
    );
  });

  it("allows SUPER_ADMIN to bypass a CHANGES_REQUESTED task", async () => {
    const task = buildTask({
      approvalStatus: TaskApprovalStatus.CHANGES_REQUESTED,
    });
    const { service, approvalRepository } = buildService(task);

    await service.approve(ORG_ID, TASK_ID, USER_ID, OrganizationRole.SUPER_ADMIN, {
      bypassApprovalRequest: true,
    });

    expect(approvalRepository.updateApprovalFields).toHaveBeenCalledWith(
      ORG_ID,
      TASK_ID,
      expect.objectContaining({ approvalStatus: TaskApprovalStatus.APPROVED }),
    );
  });

  it("forbids bypass for non-owner roles", async () => {
    const task = buildTask({ approvalStatus: TaskApprovalStatus.NOT_REQUESTED });
    const { service, approvalRepository } = buildService(task);

    await expect(
      service.approve(ORG_ID, TASK_ID, USER_ID, OrganizationRole.AGENCY_MANAGER, {
        bypassApprovalRequest: true,
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_BYPASS_FORBIDDEN" });

    expect(approvalRepository.updateApprovalFields).not.toHaveBeenCalled();
  });

  it("approves a PENDING task through the normal flow", async () => {
    const task = buildTask({ approvalStatus: TaskApprovalStatus.PENDING });
    const { service, approvalRepository } = buildService(task);

    await service.approve(
      ORG_ID,
      TASK_ID,
      USER_ID,
      OrganizationRole.AGENCY_MANAGER,
      {},
    );

    expect(approvalRepository.updateApprovalFields).toHaveBeenCalledWith(
      ORG_ID,
      TASK_ID,
      expect.objectContaining({ approvalStatus: TaskApprovalStatus.APPROVED }),
    );
  });

  it("rejects a normal approval when the task is not pending", async () => {
    const task = buildTask({ approvalStatus: TaskApprovalStatus.NOT_REQUESTED });
    const { service, approvalRepository } = buildService(task);

    await expect(
      service.approve(
        ORG_ID,
        TASK_ID,
        USER_ID,
        OrganizationRole.AGENCY_MANAGER,
        {},
      ),
    ).rejects.toMatchObject({ code: "TASK_NOT_PENDING_APPROVAL" });

    expect(approvalRepository.updateApprovalFields).not.toHaveBeenCalled();
  });
});

describe("TaskApprovalService.requestApproval", () => {
  it("persists an internal responsible approver when the member is active", async () => {
    const task = buildTask({ approvalStatus: TaskApprovalStatus.NOT_REQUESTED });
    const { service, approvalRepository } = buildService(task);
    approvalRepository.findActiveOrganizationMember.mockResolvedValue({
      id: "member-1",
    });

    await service.requestApproval(ORG_ID, TASK_ID, USER_ID, {
      approverClerkUserId: APPROVER_ID,
      approverKind: "INTERNAL",
    });

    expect(approvalRepository.findActiveOrganizationMember).toHaveBeenCalledWith(
      ORG_ID,
      APPROVER_ID,
    );
    expect(approvalRepository.updateApprovalFields).toHaveBeenCalledWith(
      ORG_ID,
      TASK_ID,
      expect.objectContaining({
        responsibleApproverClerkUserId: APPROVER_ID,
        responsibleApproverKind: TaskApproverKind.INTERNAL,
      }),
    );
    expect(notificationEvents.notifyApprovalRequested).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: [APPROVER_ID] }),
    );
  });

  it("rejects an internal approver that is not an active member", async () => {
    const task = buildTask();
    const { service, approvalRepository } = buildService(task);
    approvalRepository.findActiveOrganizationMember.mockResolvedValue(null);

    await expect(
      service.requestApproval(ORG_ID, TASK_ID, USER_ID, {
        approverClerkUserId: APPROVER_ID,
        approverKind: "INTERNAL",
      }),
    ).rejects.toMatchObject({ code: "APPROVER_NOT_ORGANIZATION_MEMBER" });

    expect(approvalRepository.updateApprovalFields).not.toHaveBeenCalled();
  });

  it("validates a client approver against the task's client portal members", async () => {
    const task = buildTask();
    const { service, approvalRepository } = buildService(task);
    approvalRepository.findActiveClientMember.mockResolvedValue(null);

    await expect(
      service.requestApproval(ORG_ID, TASK_ID, USER_ID, {
        approverClerkUserId: APPROVER_ID,
        approverKind: "CLIENT",
      }),
    ).rejects.toMatchObject({ code: "APPROVER_NOT_CLIENT_MEMBER" });

    expect(approvalRepository.findActiveClientMember).toHaveBeenCalledWith(
      ORG_ID,
      CLIENT_ID,
      APPROVER_ID,
    );
  });

  it("persists no responsible approver when none is provided", async () => {
    const task = buildTask({ approvalStatus: TaskApprovalStatus.NOT_REQUESTED });
    const { service, approvalRepository } = buildService(task);

    await service.requestApproval(ORG_ID, TASK_ID, USER_ID, {});

    expect(approvalRepository.updateApprovalFields).toHaveBeenCalledWith(
      ORG_ID,
      TASK_ID,
      expect.objectContaining({
        responsibleApproverClerkUserId: null,
        responsibleApproverKind: null,
      }),
    );
  });
});

describe("TaskApprovalService.getApprovalInfo", () => {
  it("includes the responsible approver in the payload", async () => {
    const task = buildTask({
      responsibleApproverClerkUserId: APPROVER_ID,
      responsibleApproverKind: TaskApproverKind.CLIENT,
    });
    const { service } = buildService(task);

    const result = await service.getApprovalInfo(ORG_ID, TASK_ID);

    expect(result.responsibleApproverClerkUserId).toBe(APPROVER_ID);
    expect(result.responsibleApproverKind).toBe(TaskApproverKind.CLIENT);
  });
});

describe("AppError contract", () => {
  it("carries an HTTP status code and machine-readable code", () => {
    const error = new AppError("nope", 403, "APPROVAL_BYPASS_FORBIDDEN");

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("APPROVAL_BYPASS_FORBIDDEN");
  });
});
