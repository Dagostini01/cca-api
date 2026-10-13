import { z } from 'zod';
import { SUBMENU_NAME_MAX_LENGTH } from '../../../domain/submenu.js';

const submenuStatusSchema = z.enum(['ATIVO', 'INATIVO']);

export const createSubmenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(SUBMENU_NAME_MAX_LENGTH),
  menuId: z.string().uuid(),
  status: submenuStatusSchema.optional(),
}).strict();

export const updateSubmenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(SUBMENU_NAME_MAX_LENGTH).optional(),
  menuId: z.string().uuid().optional(),
  status: submenuStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.menuId !== undefined || body.status !== undefined, {
  message: 'empty_submenu_update',
});

export const submenuIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listSubmenusQuerySchema = z.object({
  menuId: z.string().uuid().optional(),
}).strict();

export const submenuResponseSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  nome: z.string(),
  status: submenuStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
