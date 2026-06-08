export function calculateDurationMinutes(
  startedAt: Date,
  endedAt: Date,
): number {
  const diffMs = endedAt.getTime() - startedAt.getTime();

  if (diffMs <= 0) {
    throw new Error("endedAt must be greater than startedAt");
  }

  return Math.max(1, Math.round(diffMs / 60_000));
}

export function buildTimeProgressSummary(
  totalMinutes: number,
  estimatedMinutes: number | null | undefined,
) {
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const remainingMinutes =
    estimatedMinutes != null ? estimatedMinutes - totalMinutes : null;
  const progressPercent =
    estimatedMinutes != null && estimatedMinutes > 0
      ? Math.min(100, Math.round((totalMinutes / estimatedMinutes) * 100))
      : null;

  return {
    totalMinutes,
    totalHours,
    estimatedMinutes: estimatedMinutes ?? null,
    remainingMinutes,
    progressPercent,
  };
}

export function canViewAllTimeEntries(
  rolePermissions: readonly string[],
): boolean {
  return rolePermissions.includes("view_time_entries");
}
