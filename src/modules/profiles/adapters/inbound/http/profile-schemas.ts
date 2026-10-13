import { z } from 'zod';
import { PROFILE_DESCRIPTION_MAX_LENGTH, PROFILE_NAME_MAX_LENGTH } from '../../../domain/profile.js';

const profileStatusSchema = z.enum(['ATIVO', 'INATIVO']);
const descriptionSchema = z.string().trim().min(1).max(PROFILE_DESCRIPTION_MAX_LENGTH);

export const createProfileBodySchema = z.object({
  nome: z.string().trim().min(1).max(PROFILE_NAME_MAX_LENGTH),
  descricao: descriptionSchema.optional(),
  empresaId: z.string().uuid(),
  status: profileStatusSchema.optional(),
}).strict();

export const updateProfileBodySchema = z.object({
  nome: z.string().trim().min(1).max(PROFILE_NAME_MAX_LENGTH).optional(),
  descricao: descriptionSchema.nullable().optional(),
  empresaId: z.string().uuid().optional(),
  status: profileStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.descricao !== undefined || body.empresaId !== undefined || body.status !== undefined, {
  message: 'empty_profile_update',
});

export const profileIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listProfilesQuerySchema = z.object({
  empresaId: z.string().uuid().optional(),
}).strict();

export const profileResponseSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  nome: z.string(),
  descricao: z.string().nullable(),
  status: profileStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
