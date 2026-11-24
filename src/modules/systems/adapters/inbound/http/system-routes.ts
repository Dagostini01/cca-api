import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeCatalog } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { SystemServices } from '../../../application/factories/system-services-factory.js';
import { tamanhoOf } from '../../../../../shared/http/page.js';
import { createSystemBodySchema, systemIdParamsSchema, systemListQuerySchema, updateSystemBodySchema } from './system-schemas.js';

export function registerSystemRoutes(
  app: FastifyInstance,
  services: SystemServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/sistemas', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const body = createSystemBodySchema.parse(request.body);
    const system = await services.createSystem.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'SISTEMA', recursoId: system.id, descricao: system.nome });
    return reply.code(201).send(system);
  });

  app.get('/v1/sistemas', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const query = systemListQuerySchema.parse(request.query);
    const filter = { empresaId: query.empresaId, q: query.q };
    if (query.pagina === undefined) return services.listSystems.execute(filter);
    return services.listSystems.page({ ...filter, pagina: query.pagina, tamanho: tamanhoOf(query) });
  });

  app.get('/v1/sistemas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = systemIdParamsSchema.parse(request.params);
    return services.getSystem.execute(params.id);
  });

  app.patch('/v1/sistemas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = systemIdParamsSchema.parse(request.params);
    const body = updateSystemBodySchema.parse(request.body);
    const updated = await services.updateSystem.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'SISTEMA', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });

  app.delete('/v1/sistemas/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = systemIdParamsSchema.parse(request.params);
    const system = await services.getSystem.execute(params.id);
    await services.deleteSystem.ensureDeletable(system.id);
    await recordChange(audits, actor.id, { acao: 'EXCLUIR', recursoTipo: 'SISTEMA', recursoId: system.id, descricao: system.nome });
    await services.deleteSystem.execute(system.id);
    return reply.code(204).send();
  });
}
