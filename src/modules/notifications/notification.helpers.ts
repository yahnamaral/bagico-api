export function uniqueRecipients(
  userIds: Array<string | null | undefined>,
  actorClerkUserId?: string | null,
): string[] {
  const recipients = new Set<string>();

  for (const userId of userIds) {
    if (!userId || userId === actorClerkUserId) {
      continue;
    }

    recipients.add(userId);
  }

  return [...recipients];
}

export function buildTaskHref(taskId: string): string {
  return `/tasks/${taskId}`;
}

export function buildAppUrl(path: string): string {
  const baseUrl = process.env.APP_WEB_URL ?? "http://localhost:3000";
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function fireNotification(callback: () => Promise<void>): void {
  void callback().catch((error) => {
    console.error("[NotificationEvents]", error);
  });
}
