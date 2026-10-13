import { z } from 'zod';

const accessStatusSchema = z.enum(['ATIVO', 'INATIVO']);

export const createAccessBodySchema = z.object({
  usuarioId: z.string().uuid(),
  perfilId: z.string().uuid(),
  sistemaId: z.string().uuid(),
  status: accessStatusSchema.optional(),
}).strict();

export const updateAccessBodySchema = z.object({
  perfilId: z.string().uuid().optional(),
  status: accessStatusSchema.optional(),
}).strict().refine((body) => body.perfilId !== undefined || body.status !== undefined, {
  message: 'empty_access_update',
});

export const accessIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listAccessesQuerySchema = z.object({
  usuarioId: z.string().uuid().optional(),
  sistemaId: z.string().uuid().optional(),
}).strict();

export const accessResponseSchema = z.object({
  id: z.string().uuid(),
  usuarioId: z.string().uuid(),
  perfilId: z.string().uuid(),
  sistemaId: z.string().uuid(),
  status: accessStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
