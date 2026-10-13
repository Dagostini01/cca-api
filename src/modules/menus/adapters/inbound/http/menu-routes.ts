import type { FastifyInstance } from 'fastify';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { MenuServices } from '../../../application/factories/menu-services-factory.js';
import { createMenuBodySchema, listMenusQuerySchema, menuIdParamsSchema, updateMenuBodySchema } from './menu-schemas.js';

export function registerMenuRoutes(
  app: FastifyInstance,
  services: MenuServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
) {
  app.post('/v1/menus', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createMenuBodySchema.parse(request.body);
    await authorize(authorizer, actor.id, 'criar', { tipo: 'MODULO', id: body.moduloId });
    const menu = await services.createMenu.execute(body);
    return reply.code(201).send(menu);
  });

  app.get('/v1/menus', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listMenusQuerySchema.parse(request.query);
    const menus = await services.listMenus.execute(query);
    return onlyVisible(authorizer, actor.id, menus, (menu) => ({ tipo: 'MENU', id: menu.id }));
  });

  app.get('/v1/menus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = menuIdParamsSchema.parse(request.params);
    const menu = await services.getMenu.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'MENU', id: menu.id });
    return menu;
  });

  app.patch('/v1/menus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = menuIdParamsSchema.parse(request.params);
    const body = updateMenuBodySchema.parse(request.body);
    const menu = await services.getMenu.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'MENU', id: menu.id });
    if (body.moduloId && body.moduloId !== menu.moduloId) {
      await authorize(authorizer, actor.id, 'criar', { tipo: 'MODULO', id: body.moduloId });
    }
    return services.updateMenu.execute(params.id, body);
  });
}
