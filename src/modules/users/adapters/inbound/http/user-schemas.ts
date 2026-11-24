import { z } from 'zod';
import { CATALOG_STATUSES, USER_TYPES } from '../../../../../shared/catalog/status.js';
import { entityIdParamSchema, entityIdSchema } from '../../../../../shared/http/entity-id.js';
import { USER_DOCUMENT_MAX_LENGTH, USER_EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH, USER_PHONE_MAX_LENGTH } from '../../../domain/user.js';

const statusSchema = z.enum(CATALOG_STATUSES);
const tipoSchema = z.enum(USER_TYPES);
const optionalName = z.string().trim().max(USER_NAME_MAX_LENGTH).nullable();

export const screenBodySchema = z.object({
  empresaId: entityIdSchema,
  submenuId: entityIdSchema,
  sistemaId: entityIdSchema.optional(),
  moduloId: entityIdSchema.optional(),
  menuId: entityIdSchema.optional(),
}).strict();

export const createUserBodySchema = z.object({
  nome: z.string().trim().min(1).max(USER_NAME_MAX_LENGTH),
  sobrenome: optionalName.optional(),
  apelido: optionalName.optional(),
  rg: z.string().trim().max(USER_DOCUMENT_MAX_LENGTH).nullable().optional(),
  cpf: z.string().trim().max(USER_DOCUMENT_MAX_LENGTH).nullable().optional(),
  email: z.string().trim().email().max(USER_EMAIL_MAX_LENGTH),
  celular: z.string().trim().max(USER_PHONE_MAX_LENGTH).nullable().optional(),
  keycloakSub: z.string().uuid().optional(),
  tipo: tipoSchema.optional(),
  status: statusSchema.optional(),
  telas: z.array(screenBodySchema).optional(),
}).strict();

export const updateUserBodySchema = z.object({
  nome: z.string().trim().min(1).max(USER_NAME_MAX_LENGTH).optional(),
  sobrenome: optionalName.optional(),
  apelido: optionalName.optional(),
  rg: z.string().trim().max(USER_DOCUMENT_MAX_LENGTH).nullable().optional(),
  cpf: z.string().trim().max(USER_DOCUMENT_MAX_LENGTH).nullable().optional(),
  email: z.string().trim().email().max(USER_EMAIL_MAX_LENGTH).optional(),
  celular: z.string().trim().max(USER_PHONE_MAX_LENGTH).nullable().optional(),
  tipo: tipoSchema.optional(),
  status: statusSchema.optional(),
  telas: z.array(screenBodySchema).optional(),
}).strict().refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: 'empty_user_update',
});

export const userIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const userResponseSchema = z.object({
  id: z.number().int(),
  keycloakSub: z.string().nullable(),
  nome: z.string(),
  sobrenome: z.string().nullable(),
  apelido: z.string().nullable(),
  rg: z.string().nullable(),
  cpf: z.string().nullable(),
  email: z.string().nullable(),
  celular: z.string().nullable(),
  tipo: tipoSchema,
  status: statusSchema,
  criadoPorId: z.number().int().nullable(),
  criadoEm: z.string().datetime(),
});

export const screenViewSchema = z.object({
  sistemaId: z.number().int(),
  sistema: z.string(),
  moduloId: z.number().int(),
  modulo: z.string(),
  menuId: z.number().int(),
  menu: z.string(),
  submenuId: z.number().int(),
  submenu: z.string(),
});

export const userListQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  tipo: tipoSchema.optional(),
  status: statusSchema.optional(),
  pagina: z.coerce.number().int().positive().default(1),
  tamanho: z.coerce.number().int().min(1).max(50).default(20),
});

export const userPageSchema = z.object({
  itens: z.array(userResponseSchema),
  total: z.number().int().nonnegative(),
  pagina: z.number().int().positive(),
  tamanho: z.number().int().positive(),
});
