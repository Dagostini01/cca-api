import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeCatalog } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { ModuleServices } from '../../../application/factories/module-services-factory.js';
import { tamanhoOf } from '../../../../../shared/http/page.js';
import { createModuleBodySchema, listModulesQuerySchema, moduleIdParamsSchema, updateModuleBodySchema } from './module-schemas.js';

export function registerModuleRoutes(
  app: FastifyInstance,
  services: ModuleServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/modulos', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const body = createModuleBodySchema.parse(request.body);
    const module = await services.createModule.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'MODULO', recursoId: module.id, descricao: module.nome });
    return reply.code(201).send(module);
  });

  app.get('/v1/modulos', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const query = listModulesQuerySchema.parse(request.query);
    const filter = { sistemaId: query.sistemaId, q: query.q };
    if (query.pagina === undefined) return services.listModules.execute(filter);
    return services.listModules.page({ ...filter, pagina: query.pagina, tamanho: tamanhoOf(query) });
  });

  app.get('/v1/modulos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = moduleIdParamsSchema.parse(request.params);
    return services.getModule.execute(params.id);
  });

  app.patch('/v1/modulos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = moduleIdParamsSchema.parse(request.params);
    const body = updateModuleBodySchema.parse(request.body);
    const updated = await services.updateModule.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'MODULO', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });

  app.delete('/v1/modulos/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = moduleIdParamsSchema.parse(request.params);
    const module = await services.getModule.execute(params.id);
    await services.deleteModule.ensureDeletable(module.id);
    await recordChange(audits, actor.id, { acao: 'EXCLUIR', recursoTipo: 'MODULO', recursoId: module.id, descricao: module.nome });
    await services.deleteModule.execute(module.id);
    return reply.code(204).send();
  });
}
