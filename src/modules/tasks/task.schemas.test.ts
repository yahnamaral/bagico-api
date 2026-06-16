import { describe, expect, it } from "vitest";
import {
  approveTaskBodySchema,
  requestApprovalBodySchema,
} from "./task.schemas";

const APPROVER_ID = "user_2abc";

describe("approveTaskBodySchema", () => {
  it("accepts an empty body", () => {
    const result = approveTaskBodySchema.parse({});

    expect(result.bypassApprovalRequest).toBeUndefined();
  });

  it("accepts the bypassApprovalRequest flag", () => {
    const result = approveTaskBodySchema.parse({
      bypassApprovalRequest: true,
      comment: "Approved by owner",
    });

    expect(result.bypassApprovalRequest).toBe(true);
    expect(result.comment).toBe("Approved by owner");
  });

  it("rejects a non-boolean bypassApprovalRequest", () => {
    expect(() =>
      approveTaskBodySchema.parse({ bypassApprovalRequest: "yes" }),
    ).toThrow();
  });
});

describe("requestApprovalBodySchema", () => {
  it("accepts an empty body", () => {
    const result = requestApprovalBodySchema.parse({});

    expect(result.approverClerkUserId).toBeUndefined();
    expect(result.approverKind).toBeUndefined();
  });

  it("accepts approver fields when both are provided", () => {
    const result = requestApprovalBodySchema.parse({
      approverClerkUserId: APPROVER_ID,
      approverKind: "INTERNAL",
    });

    expect(result.approverClerkUserId).toBe(APPROVER_ID);
    expect(result.approverKind).toBe("INTERNAL");
  });

  it("requires approverKind when approverClerkUserId is provided", () => {
    const parsed = requestApprovalBodySchema.safeParse({
      approverClerkUserId: APPROVER_ID,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("approverKind");
    }
  });

  it("rejects an invalid approverKind", () => {
    expect(() =>
      requestApprovalBodySchema.parse({
        approverClerkUserId: APPROVER_ID,
        approverKind: "EXTERNAL",
      }),
    ).toThrow();
  });
});
