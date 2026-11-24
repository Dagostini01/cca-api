import { z } from 'zod';
import { CATALOG_STATUSES } from '../../../../../shared/catalog/status.js';
import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH } from '../../../../../shared/catalog/text.js';
import { entityIdParamSchema, entityIdSchema } from '../../../../../shared/http/entity-id.js';
import { catalogSearchQuerySchema } from '../../../../../shared/http/page.js';
import { MODULE_NAME_MAX_LENGTH } from '../../../domain/module.js';

const statusSchema = z.enum(CATALOG_STATUSES);
const shortText = z.string().trim().max(SHORT_TEXT_MAX_LENGTH).nullable();
const longText = z.string().trim().max(LONG_TEXT_MAX_LENGTH).nullable();

export const createModuleBodySchema = z.object({
  nome: z.string().trim().min(1).max(MODULE_NAME_MAX_LENGTH),
  sistemaId: entityIdSchema,
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
}).strict();

export const updateModuleBodySchema = z.object({
  nome: z.string().trim().min(1).max(MODULE_NAME_MAX_LENGTH).optional(),
  sistemaId: entityIdSchema.optional(),
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
}).strict().refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'empty_module_update',
});

export const listModulesQuerySchema = z.object({
  sistemaId: z.coerce.number().int().positive().optional(),
  ...catalogSearchQuerySchema,
});

export const moduleIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const moduleResponseSchema = z.object({
  id: z.number().int(),
  sistemaId: z.number().int(),
  nome: z.string(),
  descricaoCurta: z.string().nullable(),
  descricaoLonga: z.string().nullable(),
  status: statusSchema,
  criadoEm: z.string().datetime(),
});
