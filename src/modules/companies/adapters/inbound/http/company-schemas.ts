import { z } from 'zod';
import { isValidCnpj } from '../../../domain/cnpj.js';
import { COMPANY_NAME_MAX_LENGTH } from '../../../domain/company.js';

const companyStatusSchema = z.enum(['ATIVO', 'INATIVO']);

const cnpjSchema = z.string().trim().min(1).max(20).refine((value) => isValidCnpj(value.replace(/\D/g, '')), {
  message: 'invalid_company_document',
});

export const createCompanyBodySchema = z.object({
  nome: z.string().trim().min(1).max(COMPANY_NAME_MAX_LENGTH),
  cnpj: cnpjSchema.nullable().optional(),
  status: companyStatusSchema.optional(),
}).strict();

export const updateCompanyBodySchema = z.object({
  nome: z.string().trim().min(1).max(COMPANY_NAME_MAX_LENGTH).optional(),
  cnpj: cnpjSchema.nullable().optional(),
  status: companyStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.cnpj !== undefined || body.status !== undefined, {
  message: 'empty_company_update',
});

export const companyIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const companyResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cnpj: z.string().nullable(),
  status: companyStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
