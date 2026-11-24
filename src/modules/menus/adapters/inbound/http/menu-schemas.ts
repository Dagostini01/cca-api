import { z } from 'zod';
import { CATALOG_STATUSES } from '../../../../../shared/catalog/status.js';
import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH } from '../../../../../shared/catalog/text.js';
import { entityIdParamSchema, entityIdSchema } from '../../../../../shared/http/entity-id.js';
import { catalogSearchQuerySchema } from '../../../../../shared/http/page.js';
import { MENU_NAME_MAX_LENGTH } from '../../../domain/menu.js';

const statusSchema = z.enum(CATALOG_STATUSES);
const shortText = z.string().trim().max(SHORT_TEXT_MAX_LENGTH).nullable();
const longText = z.string().trim().max(LONG_TEXT_MAX_LENGTH).nullable();

export const createMenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(MENU_NAME_MAX_LENGTH),
  moduloId: entityIdSchema,
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
}).strict();

export const updateMenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(MENU_NAME_MAX_LENGTH).optional(),
  moduloId: entityIdSchema.optional(),
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
}).strict().refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'empty_menu_update',
});

export const listMenusQuerySchema = z.object({
  moduloId: z.coerce.number().int().positive().optional(),
  ...catalogSearchQuerySchema,
});

export const menuIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const menuResponseSchema = z.object({
  id: z.number().int(),
  moduloId: z.number().int(),
  nome: z.string(),
  descricaoCurta: z.string().nullable(),
  descricaoLonga: z.string().nullable(),
  status: statusSchema,
  criadoEm: z.string().datetime(),
});
