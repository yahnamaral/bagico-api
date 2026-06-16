import { z } from "zod";

export const clientFileCategorySchema = z.enum([
  "CONTRACT",
  "BRANDBOOK",
  "LOGO",
  "BRIEFING",
  "REFERENCE",
  "OTHER",
]);

export const clientIdParamSchema = z.object({
  clientId: z.uuid(),
});

export const clientFileParamsSchema = z.object({
  clientId: z.uuid(),
  fileId: z.uuid(),
});

function normalizeOptionalFileKey(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeUploadThingPayload(input: unknown): unknown {
  if (typeof input !== "object" || input === null) {
    return input;
  }

  const data = input as Record<string, unknown>;

  return {
    fileName: data.fileName ?? data.name,
    fileUrl: data.fileUrl ?? data.url,
    fileKey: data.fileKey ?? data.key,
    mimeType: data.mimeType ?? data.type,
    size: data.size,
    category: data.category,
  };
}

export const createClientFileBodySchema = z.preprocess(
  normalizeUploadThingPayload,
  z.object({
    fileName: z.string().trim().min(1, "fileName is required"),
    fileUrl: z.url("fileUrl must be a valid URL"),
    fileKey: z
      .union([z.string(), z.null()])
      .optional()
      .transform(normalizeOptionalFileKey),
    mimeType: z.string().trim().min(1, "mimeType is required"),
    size: z.coerce.number().int().positive("size must be a positive number"),
    category: clientFileCategorySchema.optional(),
  }),
);

export type CreateClientFileBody = z.infer<typeof createClientFileBodySchema>;
