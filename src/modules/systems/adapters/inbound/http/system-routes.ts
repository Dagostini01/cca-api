import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { SystemServices } from '../../../application/factories/system-services-factory.js';
import { createSystemBodySchema, listSystemsQuerySchema, systemIdParamsSchema, updateSystemBodySchema } from './system-schemas.js';

export function registerSystemRoutes(
  app: FastifyInstance,
  services: SystemServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/sistemas', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createSystemBodySchema.parse(request.body);
    await authorize(authorizer, actor.id, 'criar', { tipo: 'EMPRESA', id: body.empresaId });
    const system = await services.createSystem.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'SISTEMA', recursoId: system.id, descricao: system.nome });
    return reply.code(201).send(system);
  });

  app.get('/v1/sistemas', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listSystemsQuerySchema.parse(request.query);
    const systems = await services.listSystems.execute(query);
    return onlyVisible(authorizer, actor.id, systems, (system) => ({ tipo: 'SISTEMA', id: system.id }));
  });

  app.get('/v1/sistemas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = systemIdParamsSchema.parse(request.params);
    const system = await services.getSystem.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'SISTEMA', id: system.id });
    return system;
  });

  app.patch('/v1/sistemas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = systemIdParamsSchema.parse(request.params);
    const body = updateSystemBodySchema.parse(request.body);
    const system = await services.getSystem.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'SISTEMA', id: system.id });
    if (body.empresaId && body.empresaId !== system.empresaId) {
      await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: body.empresaId });
    }
    const updated = await services.updateSystem.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'SISTEMA', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });
}
