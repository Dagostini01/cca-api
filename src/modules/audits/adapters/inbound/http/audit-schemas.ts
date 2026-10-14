import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from '../../../domain/audit.js';

export const auditIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listAuditsQuerySchema = z.object({
  empresaId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  recursoTipo: z.enum(AUDIT_RESOURCES).optional(),
  desde: z.string().datetime().optional(),
  ate: z.string().datetime().optional(),
}).strict();

export const auditResponseSchema = z.object({
  id: z.string().uuid(),
  ocorridoEm: z.string().datetime(),
  usuarioId: z.string().uuid().nullable(),
  usuarioNome: z.string().nullable(),
  acao: z.enum(AUDIT_ACTIONS),
  recursoTipo: z.enum(AUDIT_RESOURCES),
  recursoId: z.string().uuid(),
  descricao: z.string(),
  empresaId: z.string().uuid(),
});
