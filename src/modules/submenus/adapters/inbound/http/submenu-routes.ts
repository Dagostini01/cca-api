import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeCatalog } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { SubmenuServices } from '../../../application/factories/submenu-services-factory.js';
import { tamanhoOf } from '../../../../../shared/http/page.js';
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
    await authorizeCatalog(authorizer, actor.id);
    const body = createSubmenuBodySchema.parse(request.body);
    const submenu = await services.createSubmenu.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'SUBMENU', recursoId: submenu.id, descricao: submenu.nome });
    return reply.code(201).send(submenu);
  });

  app.get('/v1/submenus', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const query = listSubmenusQuerySchema.parse(request.query);
    const filter = { menuId: query.menuId, q: query.q };
    if (query.pagina === undefined) return services.listSubmenus.execute(filter);
    return services.listSubmenus.page({ ...filter, pagina: query.pagina, tamanho: tamanhoOf(query) });
  });

  app.get('/v1/submenus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = submenuIdParamsSchema.parse(request.params);
    return services.getSubmenu.execute(params.id);
  });

  app.patch('/v1/submenus/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = submenuIdParamsSchema.parse(request.params);
    const body = updateSubmenuBodySchema.parse(request.body);
    const updated = await services.updateSubmenu.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'SUBMENU', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });

  app.delete('/v1/submenus/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = submenuIdParamsSchema.parse(request.params);
    const submenu = await services.getSubmenu.execute(params.id);
    await services.deleteSubmenu.ensureDeletable(submenu.id);
    await recordChange(audits, actor.id, { acao: 'EXCLUIR', recursoTipo: 'SUBMENU', recursoId: submenu.id, descricao: submenu.nome });
    await services.deleteSubmenu.execute(submenu.id);
    return reply.code(204).send();
  });
}
