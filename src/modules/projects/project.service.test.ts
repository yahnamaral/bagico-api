import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectService } from "./project.service";

const ORG_ID = "org-1";
const PROJECT_ID = "project-1";

function buildService(existing: Record<string, unknown>) {
  const repository = {
    findById: vi.fn().mockResolvedValue(existing),
    update: vi.fn().mockResolvedValue({ id: PROJECT_ID, ...existing }),
  };

  const clientRepository = {
    findById: vi.fn().mockResolvedValue({ id: "client-1" }),
  };

  const service = new ProjectService(
    repository as never,
    clientRepository as never,
  );

  return { service, repository };
}

const oneOffProject = {
  id: PROJECT_ID,
  type: "ONE_OFF",
  monthlyFee: null,
  recurrenceInterval: null,
  renewalDay: null,
  fixedDeliverables: null,
};

const recurringProject = {
  id: PROJECT_ID,
  type: "RECURRING",
  monthlyFee: 2500,
  recurrenceInterval: "MONTHLY",
  renewalDay: 5,
  fixedDeliverables: "4 posts",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProjectService.update", () => {
  it("clears recurrence fields when the effective type is ONE_OFF", async () => {
    const { service, repository } = buildService(recurringProject);

    await service.update(ORG_ID, PROJECT_ID, { type: "ONE_OFF" });

    expect(repository.update).toHaveBeenCalledWith(
      ORG_ID,
      PROJECT_ID,
      expect.objectContaining({
        type: "ONE_OFF",
        monthlyFee: null,
        recurrenceInterval: null,
        renewalDay: null,
        fixedDeliverables: null,
      }),
    );
  });

  it("keeps recurrence fields untouched when only updating the name of a recurring project", async () => {
    const { service, repository } = buildService(recurringProject);

    await service.update(ORG_ID, PROJECT_ID, { name: "New name" });

    expect(repository.update).toHaveBeenCalledWith(ORG_ID, PROJECT_ID, {
      name: "New name",
    });
  });

  it("requires monthlyFee when switching a project to RECURRING without one", async () => {
    const { service, repository } = buildService(oneOffProject);

    await expect(
      service.update(ORG_ID, PROJECT_ID, {
        type: "RECURRING",
        recurrenceInterval: "MONTHLY",
      }),
    ).rejects.toMatchObject({ code: "PROJECT_MONTHLY_FEE_REQUIRED" });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("requires recurrenceInterval when switching a project to RECURRING without one", async () => {
    const { service, repository } = buildService(oneOffProject);

    await expect(
      service.update(ORG_ID, PROJECT_ID, {
        type: "RECURRING",
        monthlyFee: 1500,
      }),
    ).rejects.toMatchObject({ code: "PROJECT_RECURRENCE_INTERVAL_REQUIRED" });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("accepts switching to RECURRING with the required fields", async () => {
    const { service, repository } = buildService(oneOffProject);

    await service.update(ORG_ID, PROJECT_ID, {
      type: "RECURRING",
      monthlyFee: 1500,
      recurrenceInterval: "QUARTERLY",
    });

    expect(repository.update).toHaveBeenCalledWith(
      ORG_ID,
      PROJECT_ID,
      expect.objectContaining({
        type: "RECURRING",
        monthlyFee: 1500,
        recurrenceInterval: "QUARTERLY",
      }),
    );
  });

  it("throws when the project does not exist", async () => {
    const { service, repository } = buildService(oneOffProject);
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update(ORG_ID, PROJECT_ID, { name: "x" }),
    ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });
});
