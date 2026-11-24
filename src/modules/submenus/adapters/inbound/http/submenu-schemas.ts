import { z } from 'zod';
import { CATALOG_STATUSES } from '../../../../../shared/catalog/status.js';
import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH } from '../../../../../shared/catalog/text.js';
import { entityIdParamSchema, entityIdSchema } from '../../../../../shared/http/entity-id.js';
import { catalogSearchQuerySchema } from '../../../../../shared/http/page.js';
import { SUBMENU_NAME_MAX_LENGTH } from '../../../domain/submenu.js';

const statusSchema = z.enum(CATALOG_STATUSES);
const shortText = z.string().trim().max(SHORT_TEXT_MAX_LENGTH).nullable();
const longText = z.string().trim().max(LONG_TEXT_MAX_LENGTH).nullable();

export const createSubmenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(SUBMENU_NAME_MAX_LENGTH),
  menuId: entityIdSchema,
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
}).strict();

export const updateSubmenuBodySchema = z.object({
  nome: z.string().trim().min(1).max(SUBMENU_NAME_MAX_LENGTH).optional(),
  menuId: entityIdSchema.optional(),
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
}).strict().refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'empty_submenu_update',
});

export const listSubmenusQuerySchema = z.object({
  menuId: z.coerce.number().int().positive().optional(),
  ...catalogSearchQuerySchema,
});

export const submenuIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const submenuResponseSchema = z.object({
  id: z.number().int(),
  menuId: z.number().int(),
  nome: z.string(),
  descricaoCurta: z.string().nullable(),
  descricaoLonga: z.string().nullable(),
  status: statusSchema,
  criadoEm: z.string().datetime(),
});
