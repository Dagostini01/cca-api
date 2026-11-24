import { z } from 'zod';
import { entityIdParamSchema } from '../../../../../shared/http/entity-id.js';
import { catalogSearchQuerySchema } from '../../../../../shared/http/page.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from '../../../domain/audit.js';

export const listAuditsQuerySchema = z.object({
  usuarioId: z.coerce.number().int().positive().optional(),
  recursoTipo: z.enum(AUDIT_RESOURCES).optional(),
  acao: z.enum(AUDIT_ACTIONS).optional(),
  desde: z.string().datetime().optional(),
  ate: z.string().datetime().optional(),
  ...catalogSearchQuerySchema,
});

export const auditIdParamsSchema = z.object({
  id: entityIdParamSchema,
});

export const auditResponseSchema = z.object({
  id: z.number().int(),
  criadoEm: z.string().datetime(),
  usuarioId: z.number().int().nullable(),
  acao: z.enum(AUDIT_ACTIONS),
  recursoTipo: z.enum(AUDIT_RESOURCES),
  descricao: z.string(),
});
