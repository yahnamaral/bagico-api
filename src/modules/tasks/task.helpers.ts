import { TaskStatus } from "../../../generated/prisma/client";

export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function statusFromColumnName(columnName: string): TaskStatus {
  const normalized = normalizeColumnName(columnName);

  switch (normalized) {
    case "pauta":
    case "briefing":
      return TaskStatus.OPEN;
    case "producao":
      return TaskStatus.IN_PROGRESS;
    case "revisao interna":
    case "aprovacao":
      return TaskStatus.IN_REVIEW;
    case "agendado":
      return TaskStatus.SCHEDULED;
    default:
      return TaskStatus.OPEN;
  }
}
