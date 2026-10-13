import { z } from 'zod';
import { USER_EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH } from '../../../domain/user.js';

const userStatusSchema = z.enum(['ATIVO', 'INATIVO']);

export const createUserBodySchema = z.object({
  nome: z.string().trim().min(1).max(USER_NAME_MAX_LENGTH),
  email: z.string().trim().email().max(USER_EMAIL_MAX_LENGTH),
  keycloakSub: z.string().uuid(),
  empresaId: z.string().uuid(),
  status: userStatusSchema.optional(),
}).strict();

export const updateUserBodySchema = z.object({
  nome: z.string().trim().min(1).max(USER_NAME_MAX_LENGTH).optional(),
  email: z.string().trim().email().max(USER_EMAIL_MAX_LENGTH).optional(),
  empresaId: z.string().uuid().optional(),
  status: userStatusSchema.optional(),
}).strict().refine((body) => body.nome !== undefined || body.email !== undefined || body.empresaId !== undefined || body.status !== undefined, {
  message: 'empty_user_update',
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  empresaId: z.string().uuid().optional(),
}).strict();

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  keycloakSub: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  empresaId: z.string().uuid(),
  status: userStatusSchema,
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
