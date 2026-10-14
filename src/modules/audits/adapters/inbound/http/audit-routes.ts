import type { FastifyInstance } from 'fastify';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { AuditServices } from '../../../application/factories/audit-services-factory.js';
import { auditIdParamsSchema, listAuditsQuerySchema } from './audit-schemas.js';

export function registerAuditRoutes(
  app: FastifyInstance,
  services: AuditServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
) {
  app.get('/v1/auditorias', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listAuditsQuerySchema.parse(request.query);
    const entries = await services.listAudits.execute({
      ...query,
      desde: query.desde ? new Date(query.desde) : undefined,
      ate: query.ate ? new Date(query.ate) : undefined,
    });
    return onlyVisible(authorizer, actor.id, entries, (entry) => ({ tipo: 'EMPRESA', id: entry.empresaId }));
  });

  app.get('/v1/auditorias/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = auditIdParamsSchema.parse(request.params);
    const entry = await services.getAudit.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'EMPRESA', id: entry.empresaId });
    return entry;
  });
}
