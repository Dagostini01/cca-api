import { z } from 'zod';
import { CATALOG_STATUSES } from '../../../../../shared/catalog/status.js';
import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH } from '../../../../../shared/catalog/text.js';
import { entityIdParamSchema } from '../../../../../shared/http/entity-id.js';
import { catalogSearchQuerySchema } from '../../../../../shared/http/page.js';
import { SYSTEM_NAME_MAX_LENGTH } from '../../../domain/system.js';

const statusSchema = z.enum(CATALOG_STATUSES);
const shortText = z.string().trim().max(SHORT_TEXT_MAX_LENGTH).nullable();
const longText = z.string().trim().max(LONG_TEXT_MAX_LENGTH).nullable();
const companyIds = z.array(z.number().int().positive()).min(1).max(500);

export const createSystemBodySchema = z.object({
  nome: z.string().trim().min(1).max(SYSTEM_NAME_MAX_LENGTH),
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
  empresaIds: companyIds,
}).strict();

export const updateSystemBodySchema = z.object({
  nome: z.string().trim().min(1).max(SYSTEM_NAME_MAX_LENGTH).optional(),
  descricaoCurta: shortText.optional(),
  descricaoLonga: longText.optional(),
  status: statusSchema.optional(),
  empresaIds: companyIds.optional(),
}).strict().refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'empty_system_update',
});

export const systemIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const systemListQuerySchema = z.object({
  empresaId: entityIdParamSchema.optional(),
  ...catalogSearchQuerySchema,
});

export const systemResponseSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  descricaoCurta: z.string().nullable(),
  descricaoLonga: z.string().nullable(),
  status: statusSchema,
  empresaIds: z.array(z.number().int()),
  criadoEm: z.string().datetime(),
});
