import { z } from 'zod';
import { RESOURCE_KINDS } from '../../../domain/permission.js';

const resourceKindSchema = z.enum(RESOURCE_KINDS);
const actionsSchema = {
  visualizar: z.boolean(),
  criar: z.boolean(),
  editar: z.boolean(),
  excluir: z.boolean(),
};

export const createPermissionBodySchema = z.object({
  perfilId: z.string().uuid(),
  recursoTipo: resourceKindSchema,
  recursoId: z.string().uuid(),
  ...actionsSchema,
}).strict().refine((body) => body.visualizar || body.criar || body.editar || body.excluir, {
  message: 'invalid_permission_actions',
});

export const updatePermissionBodySchema = z.object({
  visualizar: z.boolean().optional(),
  criar: z.boolean().optional(),
  editar: z.boolean().optional(),
  excluir: z.boolean().optional(),
}).strict().refine((body) => body.visualizar !== undefined || body.criar !== undefined || body.editar !== undefined || body.excluir !== undefined, {
  message: 'empty_permission_update',
});

export const permissionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listPermissionsQuerySchema = z.object({
  perfilId: z.string().uuid().optional(),
}).strict();

export const permissionResponseSchema = z.object({
  id: z.string().uuid(),
  perfilId: z.string().uuid(),
  recursoTipo: resourceKindSchema,
  recursoId: z.string().uuid(),
  visualizar: z.boolean(),
  criar: z.boolean(),
  editar: z.boolean(),
  excluir: z.boolean(),
  criadoEm: z.string().datetime(),
  atualizadoEm: z.string().datetime(),
});
