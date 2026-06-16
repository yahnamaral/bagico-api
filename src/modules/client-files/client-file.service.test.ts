import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientFileService } from "./client-file.service";

const ORG_ID = "org-1";
const CLIENT_ID = "client-1";
const FILE_ID = "file-1";
const USER_ID = "user-1";

function buildService() {
  const repository = {
    findByClient: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: FILE_ID }),
    softDelete: vi.fn().mockResolvedValue(true),
  };

  const clientRepository = {
    findById: vi.fn().mockResolvedValue({ id: CLIENT_ID }),
  };

  const service = new ClientFileService(
    repository as never,
    clientRepository as never,
  );

  return { service, repository, clientRepository };
}

const body = {
  fileName: "contract.pdf",
  fileUrl: "https://files.example.com/contract.pdf",
  fileKey: undefined,
  mimeType: "application/pdf",
  size: 1024,
  category: "CONTRACT" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ClientFileService.list", () => {
  it("returns the client files scoped to the organization", async () => {
    const { service, repository } = buildService();

    await service.list(ORG_ID, CLIENT_ID);

    expect(repository.findByClient).toHaveBeenCalledWith(ORG_ID, CLIENT_ID);
  });

  it("throws when the client does not exist", async () => {
    const { service, clientRepository, repository } = buildService();
    clientRepository.findById.mockResolvedValue(null);

    await expect(service.list(ORG_ID, CLIENT_ID)).rejects.toMatchObject({
      code: "CLIENT_NOT_FOUND",
    });
    expect(repository.findByClient).not.toHaveBeenCalled();
  });
});

describe("ClientFileService.create", () => {
  it("creates a file for an existing client", async () => {
    const { service, repository } = buildService();

    await service.create(ORG_ID, CLIENT_ID, USER_ID, body);

    expect(repository.create).toHaveBeenCalledWith(
      ORG_ID,
      CLIENT_ID,
      USER_ID,
      body,
    );
  });

  it("throws when creating for a missing client", async () => {
    const { service, clientRepository, repository } = buildService();
    clientRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(ORG_ID, CLIENT_ID, USER_ID, body),
    ).rejects.toMatchObject({ code: "CLIENT_NOT_FOUND" });
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe("ClientFileService.remove", () => {
  it("soft deletes an existing file", async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue({ id: FILE_ID, fileName: "x" });

    await service.remove(ORG_ID, CLIENT_ID, FILE_ID);

    expect(repository.softDelete).toHaveBeenCalledWith(
      ORG_ID,
      CLIENT_ID,
      FILE_ID,
    );
  });

  it("throws when the file does not exist", async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(null);

    await expect(
      service.remove(ORG_ID, CLIENT_ID, FILE_ID),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
