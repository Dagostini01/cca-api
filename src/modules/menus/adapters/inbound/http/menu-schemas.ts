import { z } from 'zod';
import { MENU_NAME_MAX_LENGTH } from '../../../domain/menu.js';

const menuStatusSchema = z.enum(['ATIVO', 'INATIVO']);

export const createMenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(MENU_NAME_MAX_LENGTH),
  moduloId: z.string().uuid(),
  status: menuStatusSchema.optional(),
}).strict();

export const updateMenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(MENU_NAME_MAX_LENGTH).optional(),
  moduloId: z.string().uuid().optional(),
  status: menuStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.moduloId !== undefined || body.status !== undefined, {
  message: 'empty_menu_update',
});

export const menuIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listMenusQuerySchema = z.object({
  moduloId: z.string().uuid().optional(),
}).strict();

export const menuResponseSchema = z.object({
  id: z.string().uuid(),
  moduloId: z.string().uuid(),
  nome: z.string(),
  status: menuStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
