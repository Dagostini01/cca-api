import { z } from 'zod';
import { SYSTEM_NAME_MAX_LENGTH } from '../../../domain/system.js';

const systemStatusSchema = z.enum(['ATIVO', 'INATIVO']);

export const createSystemBodySchema = z.object({
  nome: z.string().trim().min(1).max(SYSTEM_NAME_MAX_LENGTH),
  empresaId: z.string().uuid(),
  status: systemStatusSchema.optional(),
}).strict();

export const updateSystemBodySchema = z.object({
  nome: z.string().trim().min(1).max(SYSTEM_NAME_MAX_LENGTH).optional(),
  empresaId: z.string().uuid().optional(),
  status: systemStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.empresaId !== undefined || body.status !== undefined, {
  message: 'empty_system_update',
});

export const systemIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listSystemsQuerySchema = z.object({
  empresaId: z.string().uuid().optional(),
}).strict();

export const systemResponseSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  nome: z.string(),
  status: systemStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
