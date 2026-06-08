import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "TASK_ASSIGNED",
  "TASK_COMMENT_CREATED",
  "TASK_FILE_UPLOADED",
  "TASK_APPROVAL_REQUESTED",
  "TASK_APPROVED",
  "TASK_CHANGES_REQUESTED",
  "PORTAL_COMMENT_CREATED",
  "MEMBER_INVITED",
  "CLIENT_PORTAL_INVITED",
  "SYSTEM",
]);

export const notificationIdParamSchema = z.object({
  id: z.uuid(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      if (typeof value === "boolean") {
        return value;
      }

      return value === "true";
    }),
  type: notificationTypeSchema.optional(),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
