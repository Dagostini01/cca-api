import { z } from 'zod';
import { CATALOG_STATUSES } from '../../../../../shared/catalog/status.js';
import { LONG_TEXT_MAX_LENGTH } from '../../../../../shared/catalog/text.js';
import { entityIdParamSchema } from '../../../../../shared/http/entity-id.js';
import { catalogSearchQuerySchema } from '../../../../../shared/http/page.js';
import { isValidCnpj } from '../../../domain/cnpj.js';
import { COMPANY_NAME_MAX_LENGTH } from '../../../domain/company.js';

const companyStatusSchema = z.enum(CATALOG_STATUSES);

const cnpjSchema = z.string().trim().min(1).max(20).refine((value) => isValidCnpj(value.replace(/\D/g, '')), {
  message: 'invalid_company_document',
});

const aliasSchema = z.string().trim().max(LONG_TEXT_MAX_LENGTH).nullable();

export const createCompanyBodySchema = z.object({
  razaoSocial: z.string().trim().min(1).max(COMPANY_NAME_MAX_LENGTH),
  nomeFantasia: aliasSchema.optional(),
  nomeReduzido: aliasSchema.optional(),
  cnpj: cnpjSchema.nullable().optional(),
  dataConstituicao: z.string().datetime().nullable().optional(),
  status: companyStatusSchema.optional(),
}).strict();

export const updateCompanyBodySchema = z.object({
  razaoSocial: z.string().trim().min(1).max(COMPANY_NAME_MAX_LENGTH).optional(),
  nomeFantasia: aliasSchema.optional(),
  nomeReduzido: aliasSchema.optional(),
  cnpj: cnpjSchema.nullable().optional(),
  dataConstituicao: z.string().datetime().nullable().optional(),
  status: companyStatusSchema.optional(),
}).strict().refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'empty_company_update',
});

export const companyIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const companyListQuerySchema = z.object(catalogSearchQuerySchema);

export const companyResponseSchema = z.object({
  id: z.number().int(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
  nomeReduzido: z.string().nullable(),
  cnpj: z.string().nullable(),
  dataConstituicao: z.string().datetime().nullable(),
  status: companyStatusSchema,
  criadoEm: z.string().datetime(),
});
