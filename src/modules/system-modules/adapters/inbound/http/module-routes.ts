import type { FastifyInstance } from 'fastify';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { ModuleServices } from '../../../application/factories/module-services-factory.js';
import { createModuleBodySchema, listModulesQuerySchema, moduleIdParamsSchema, updateModuleBodySchema } from './module-schemas.js';

export function registerModuleRoutes(
  app: FastifyInstance,
  services: ModuleServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
) {
  app.post('/v1/modulos', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createModuleBodySchema.parse(request.body);
    await authorize(authorizer, actor.id, 'criar', { tipo: 'SISTEMA', id: body.sistemaId });
    const module = await services.createModule.execute(body);
    return reply.code(201).send(module);
  });

  app.get('/v1/modulos', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listModulesQuerySchema.parse(request.query);
    const modules = await services.listModules.execute(query);
    return onlyVisible(authorizer, actor.id, modules, (module) => ({ tipo: 'MODULO', id: module.id }));
  });

  app.get('/v1/modulos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = moduleIdParamsSchema.parse(request.params);
    const module = await services.getModule.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'MODULO', id: module.id });
    return module;
  });

  app.patch('/v1/modulos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = moduleIdParamsSchema.parse(request.params);
    const body = updateModuleBodySchema.parse(request.body);
    const module = await services.getModule.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'MODULO', id: module.id });
    if (body.sistemaId && body.sistemaId !== module.sistemaId) {
      await authorize(authorizer, actor.id, 'criar', { tipo: 'SISTEMA', id: body.sistemaId });
    }
    return services.updateModule.execute(params.id, body);
  });
}
