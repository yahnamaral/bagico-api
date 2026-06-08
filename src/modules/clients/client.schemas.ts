import { z } from "zod";

const clientStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

const optionalString = z.string().trim().min(1).optional();

export const listClientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  status: clientStatusSchema.optional(),
});

export const createClientBodySchema = z.object({
  name: z.string().trim().min(2),
  document: optionalString,
  email: z.email().optional(),
  phone: optionalString,
  website: z.url().optional(),
  segment: optionalString,
  notes: optionalString,
  status: clientStatusSchema.optional(),
});

export const updateClientBodySchema = z.object({
  name: z.string().trim().min(2).optional(),
  document: optionalString.nullable(),
  email: z.email().nullable().optional(),
  phone: optionalString.nullable(),
  website: z.url().nullable().optional(),
  segment: optionalString.nullable(),
  notes: optionalString.nullable(),
  status: clientStatusSchema.optional(),
});

export const clientIdParamSchema = z.object({
  id: z.uuid(),
});

export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
export type CreateClientBody = z.infer<typeof createClientBodySchema>;
export type UpdateClientBody = z.infer<typeof updateClientBodySchema>;
