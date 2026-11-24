import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeCatalog } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { MenuServices } from '../../../application/factories/menu-services-factory.js';
import { tamanhoOf } from '../../../../../shared/http/page.js';
import { createMenuBodySchema, listMenusQuerySchema, menuIdParamsSchema, updateMenuBodySchema } from './menu-schemas.js';

export function registerMenuRoutes(
  app: FastifyInstance,
  services: MenuServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/menus', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const body = createMenuBodySchema.parse(request.body);
    const menu = await services.createMenu.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'MENU', recursoId: menu.id, descricao: menu.nome });
    return reply.code(201).send(menu);
  });

  app.get('/v1/menus', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const query = listMenusQuerySchema.parse(request.query);
    const filter = { moduloId: query.moduloId, q: query.q };
    if (query.pagina === undefined) return services.listMenus.execute(filter);
    return services.listMenus.page({ ...filter, pagina: query.pagina, tamanho: tamanhoOf(query) });
  });

  app.get('/v1/menus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = menuIdParamsSchema.parse(request.params);
    return services.getMenu.execute(params.id);
  });

  app.patch('/v1/menus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = menuIdParamsSchema.parse(request.params);
    const body = updateMenuBodySchema.parse(request.body);
    const updated = await services.updateMenu.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'MENU', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });

  app.delete('/v1/menus/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = menuIdParamsSchema.parse(request.params);
    const menu = await services.getMenu.execute(params.id);
    await services.deleteMenu.ensureDeletable(menu.id);
    await recordChange(audits, actor.id, { acao: 'EXCLUIR', recursoTipo: 'MENU', recursoId: menu.id, descricao: menu.nome });
    await services.deleteMenu.execute(menu.id);
    return reply.code(204).send();
  });
}
