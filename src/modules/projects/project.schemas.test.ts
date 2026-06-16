import { describe, expect, it } from "vitest";
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  updateProjectBodySchema,
} from "./project.schemas";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";

describe("listProjectsQuerySchema", () => {
  it("accepts the optional type filter", () => {
    const result = listProjectsQuerySchema.parse({ type: "RECURRING" });

    expect(result.type).toBe("RECURRING");
  });

  it("rejects an invalid type filter", () => {
    expect(() => listProjectsQuerySchema.parse({ type: "INVALID" })).toThrow();
  });

  it("leaves type undefined when not provided", () => {
    const result = listProjectsQuerySchema.parse({});

    expect(result.type).toBeUndefined();
  });
});

describe("createProjectBodySchema", () => {
  it("accepts a one-off project without recurrence fields", () => {
    const result = createProjectBodySchema.parse({
      clientId: CLIENT_ID,
      name: "Landing page",
      budget: 5000,
    });

    expect(result.type).toBeUndefined();
    expect(result.monthlyFee).toBeUndefined();
  });

  it("requires monthlyFee and recurrenceInterval for recurring projects", () => {
    const parsed = createProjectBodySchema.safeParse({
      clientId: CLIENT_ID,
      name: "Retainer",
      type: "RECURRING",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("monthlyFee");
      expect(paths).toContain("recurrenceInterval");
    }
  });

  it("accepts a valid recurring project", () => {
    const result = createProjectBodySchema.parse({
      clientId: CLIENT_ID,
      name: "Retainer",
      type: "RECURRING",
      monthlyFee: 2500,
      recurrenceInterval: "MONTHLY",
      renewalDay: 10,
      fixedDeliverables: "4 posts / month",
    });

    expect(result.monthlyFee).toBe(2500);
    expect(result.recurrenceInterval).toBe("MONTHLY");
    expect(result.renewalDay).toBe(10);
  });

  it("rejects a renewalDay outside of 1..31", () => {
    expect(() =>
      createProjectBodySchema.parse({
        clientId: CLIENT_ID,
        name: "Retainer",
        type: "RECURRING",
        monthlyFee: 2500,
        recurrenceInterval: "MONTHLY",
        renewalDay: 32,
      }),
    ).toThrow();
  });

  it("rejects a non-positive monthlyFee", () => {
    expect(() =>
      createProjectBodySchema.parse({
        clientId: CLIENT_ID,
        name: "Retainer",
        type: "RECURRING",
        monthlyFee: 0,
        recurrenceInterval: "MONTHLY",
      }),
    ).toThrow();
  });
});

describe("updateProjectBodySchema", () => {
  it("allows clearing recurrence fields with null", () => {
    const result = updateProjectBodySchema.parse({
      type: "ONE_OFF",
      monthlyFee: null,
      recurrenceInterval: null,
      renewalDay: null,
      fixedDeliverables: null,
    });

    expect(result.monthlyFee).toBeNull();
    expect(result.recurrenceInterval).toBeNull();
  });

  it("rejects an invalid recurrenceInterval", () => {
    expect(() =>
      updateProjectBodySchema.parse({ recurrenceInterval: "WEEKLY" }),
    ).toThrow();
  });
});
