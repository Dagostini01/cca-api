import { z } from 'zod';
import { CATALOG_STATUSES, USER_TYPES } from '../../../../../shared/catalog/status.js';
import { entityIdParamSchema, entityIdSchema } from '../../../../../shared/http/entity-id.js';

const statusSchema = z.enum(CATALOG_STATUSES);

export const createAccessBodySchema = z.object({
  usuarioId: entityIdSchema,
  empresaId: entityIdSchema,
  submenuId: entityIdSchema,
  sistemaId: entityIdSchema.optional(),
  moduloId: entityIdSchema.optional(),
  menuId: entityIdSchema.optional(),
  status: statusSchema.optional(),
}).strict();

export const updateAccessBodySchema = z.object({
  status: statusSchema,
}).strict();

export const listAccessesQuerySchema = z.object({
  usuarioId: z.coerce.number().int().positive(),
  q: z.string().trim().min(1).max(80).optional(),
  empresaId: z.coerce.number().int().positive().optional(),
  sistemaId: z.coerce.number().int().positive().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  tamanho: z.coerce.number().int().min(1).max(50).default(20),
});

export const accessIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const accessResponseSchema = z.object({
  id: z.number().int(),
  usuarioId: z.number().int(),
  empresaId: z.number().int(),
  sistemaId: z.number().int(),
  moduloId: z.number().int(),
  menuId: z.number().int(),
  submenuId: z.number().int(),
  tipo: z.enum(USER_TYPES),
  status: statusSchema,
  criadoEm: z.string().datetime(),
});

export const accessViewSchema = accessResponseSchema.extend({
  empresa: z.string(),
  sistema: z.string(),
  modulo: z.string(),
  menu: z.string(),
  submenu: z.string(),
});

export const accessPageSchema = z.object({
  itens: z.array(accessViewSchema),
  total: z.number().int().nonnegative(),
  pagina: z.number().int().positive(),
  tamanho: z.number().int().positive(),
});
