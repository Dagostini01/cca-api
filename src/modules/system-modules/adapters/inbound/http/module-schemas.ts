import { z } from 'zod';
import { MODULE_NAME_MAX_LENGTH } from '../../../domain/module.js';

const moduleStatusSchema = z.enum(['ATIVO', 'INATIVO']);

export const createModuleBodySchema = z.object({
  nome: z.string().trim().min(1).max(MODULE_NAME_MAX_LENGTH),
  sistemaId: z.string().uuid(),
  status: moduleStatusSchema.optional(),
}).strict();

export const updateModuleBodySchema = z.object({
  nome: z.string().trim().min(1).max(MODULE_NAME_MAX_LENGTH).optional(),
  sistemaId: z.string().uuid().optional(),
  status: moduleStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.sistemaId !== undefined || body.status !== undefined, {
  message: 'empty_module_update',
});

export const moduleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listModulesQuerySchema = z.object({
  sistemaId: z.string().uuid().optional(),
}).strict();

export const moduleResponseSchema = z.object({
  id: z.string().uuid(),
  sistemaId: z.string().uuid(),
  nome: z.string(),
  status: moduleStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
