import type {
  MemberCostRate,
  RevenueContractStatus,
  RevenueContractType,
  TimeEntry,
} from "@prisma/client";

type DecimalLike = { toNumber(): number } | number | string;

type RevenueContractLike = {
  startsAt: Date;
  endsAt: Date | null;
  status: RevenueContractStatus;
  type: RevenueContractType;
  amount: DecimalLike;
  projectId?: string | null;
  clientId: string;
};

export type ProfitStatus = "HEALTHY" | "WARNING" | "DANGER" | "LOSS";

export type DateRangeFilter = {
  startDate?: Date;
  endDate?: Date;
};

export function decimalToNumber(
  value: DecimalLike | null | undefined,
): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateMarginPercent(revenue: number, profit: number): number | null {
  if (revenue <= 0) {
    return null;
  }

  return roundMoney((profit / revenue) * 100);
}

export function resolveProfitStatus(
  profit: number,
  marginPercent: number | null,
): ProfitStatus {
  if (profit < 0) {
    return "LOSS";
  }

  if (marginPercent == null) {
    return profit > 0 ? "HEALTHY" : "DANGER";
  }

  if (marginPercent >= 40) {
    return "HEALTHY";
  }

  if (marginPercent >= 15) {
    return "WARNING";
  }

  return "DANGER";
}

export function isWithinDateRange(
  date: Date,
  range: DateRangeFilter,
): boolean {
  if (range.startDate && date < range.startDate) {
    return false;
  }

  if (range.endDate && date > range.endDate) {
    return false;
  }

  return true;
}

export function isContractActiveInPeriod(
  contract: Pick<RevenueContractLike, "startsAt" | "endsAt" | "status">,
  range: DateRangeFilter,
): boolean {
  if (contract.status !== "ACTIVE") {
    return false;
  }

  const periodStart = range.startDate ?? contract.startsAt;
  const periodEnd = range.endDate ?? new Date();

  if (contract.endsAt && contract.endsAt < periodStart) {
    return false;
  }

  if (contract.startsAt > periodEnd) {
    return false;
  }

  return true;
}

export function findApplicableCostRate(
  rates: MemberCostRate[],
  clerkUserId: string,
  referenceDate: Date,
): MemberCostRate | null {
  const matching = rates.filter(
    (rate) =>
      rate.clerkUserId === clerkUserId &&
      rate.startsAt <= referenceDate &&
      (rate.endsAt == null || rate.endsAt >= referenceDate),
  );

  if (matching.length === 0) {
    return null;
  }

  const latest = matching.sort(
    (left, right) => right.startsAt.getTime() - left.startsAt.getTime(),
  )[0];

  return latest ?? null;
}

export function calculateTimeEntryCost(
  entry: Pick<TimeEntry, "clerkUserId" | "startedAt" | "durationMinutes">,
  rates: MemberCostRate[],
): { cost: number; missingCostRate: boolean } {
  const rate = findApplicableCostRate(rates, entry.clerkUserId, entry.startedAt);

  if (!rate) {
    return { cost: 0, missingCostRate: true };
  }

  const durationMinutes = entry.durationMinutes ?? 0;
  const durationHours = durationMinutes / 60;
  const cost = durationHours * decimalToNumber(rate.hourlyCost);

  return { cost: roundMoney(cost), missingCostRate: false };
}

/**
 * MVP revenue calculation — will be refined with proration, billing cycles
 * and hourly contract rules in a future iteration.
 */
export function calculateContractRevenueMvp(
  contract: RevenueContractLike,
  range: DateRangeFilter,
  trackedHours = 0,
): number {
  if (!isContractActiveInPeriod(contract, range)) {
    return 0;
  }

  const amount = decimalToNumber(contract.amount);

  switch (contract.type as RevenueContractType) {
    case "PROJECT_FIXED":
    case "ONE_TIME":
    case "RECURRING":
      return amount;
    case "HOURLY":
      // TODO: refine hourly contract billing rules.
      return roundMoney(amount * trackedHours);
    default:
      return 0;
  }
}

export function buildFinancialSummary(
  revenue: number,
  cost: number,
  trackedMinutes: number,
) {
  const profit = roundMoney(revenue - cost);
  const marginPercent = calculateMarginPercent(revenue, profit);

  return {
    revenue: roundMoney(revenue),
    cost: roundMoney(cost),
    profit,
    marginPercent,
    trackedMinutes,
    trackedHours: roundMoney(trackedMinutes / 60),
    status: resolveProfitStatus(profit, marginPercent),
  };
}

export function validateDateRange(startsAt: Date, endsAt?: Date | null) {
  if (endsAt && endsAt <= startsAt) {
    return false;
  }

  return true;
}

export const ACTIVE_CONTRACT_STATUSES: RevenueContractStatus[] = ["ACTIVE"];
