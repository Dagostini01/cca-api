import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { SubmenuServices } from '../../../application/factories/submenu-services-factory.js';
import { createSubmenuBodySchema, listSubmenusQuerySchema, submenuIdParamsSchema, updateSubmenuBodySchema } from './submenu-schemas.js';

export function registerSubmenuRoutes(
  app: FastifyInstance,
  services: SubmenuServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/submenus', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createSubmenuBodySchema.parse(request.body);
    await authorize(authorizer, actor.id, 'criar', { tipo: 'MENU', id: body.menuId });
    const submenu = await services.createSubmenu.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'SUBMENU', recursoId: submenu.id, descricao: submenu.nome });
    return reply.code(201).send(submenu);
  });

  app.get('/v1/submenus', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listSubmenusQuerySchema.parse(request.query);
    const submenus = await services.listSubmenus.execute(query);
    return onlyVisible(authorizer, actor.id, submenus, (submenu) => ({ tipo: 'SUBMENU', id: submenu.id }));
  });

  app.get('/v1/submenus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = submenuIdParamsSchema.parse(request.params);
    const submenu = await services.getSubmenu.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'SUBMENU', id: submenu.id });
    return submenu;
  });

  app.patch('/v1/submenus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = submenuIdParamsSchema.parse(request.params);
    const body = updateSubmenuBodySchema.parse(request.body);
    const submenu = await services.getSubmenu.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'SUBMENU', id: submenu.id });
    if (body.menuId && body.menuId !== submenu.menuId) {
      await authorize(authorizer, actor.id, 'criar', { tipo: 'MENU', id: body.menuId });
    }
    const updated = await services.updateSubmenu.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'SUBMENU', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });
}
