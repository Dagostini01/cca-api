import type { FastifyInstance } from 'fastify';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { ProfileRepository } from '../../../../profiles/application/ports/profile-repository.js';
import { PermissionProfileNotFoundError } from '../../../domain/permission-errors.js';
import type { PermissionServices } from '../../../application/factories/permission-services-factory.js';
import { createPermissionBodySchema, listPermissionsQuerySchema, permissionIdParamsSchema, updatePermissionBodySchema } from './permission-schemas.js';

export function registerPermissionRoutes(
  app: FastifyInstance,
  services: PermissionServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  profiles?: ProfileRepository,
) {
  async function companyOf(perfilId: string) {
    const profile = await profiles?.findById(perfilId);
    if (!profile) throw new PermissionProfileNotFoundError();
    return profile.empresaId;
  }

  app.post('/v1/permissoes', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createPermissionBodySchema.parse(request.body);
    if (authorizer) await authorize(authorizer, actor.id, 'criar', { tipo: 'EMPRESA', id: await companyOf(body.perfilId) });
    const permission = await services.createPermission.execute(body);
    return reply.code(201).send(permission);
  });

  app.get('/v1/permissoes', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listPermissionsQuerySchema.parse(request.query);
    const permissions = await services.listPermissions.execute(query);
    if (!authorizer) return permissions;
    const located = [];
    for (const permission of permissions) {
      const profile = await profiles?.findById(permission.perfilId);
      if (!profile) continue;
      located.push({ permission, empresaId: profile.empresaId });
    }
    const visible = await onlyVisible(authorizer, actor.id, located, (row) => ({ tipo: 'EMPRESA', id: row.empresaId }));
    return visible.map((row) => row.permission);
  });

  app.get('/v1/permissoes/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = permissionIdParamsSchema.parse(request.params);
    const permission = await services.getPermission.execute(params.id);
    if (authorizer) await authorize(authorizer, actor.id, 'visualizar', { tipo: 'EMPRESA', id: await companyOf(permission.perfilId) });
    return permission;
  });

  app.patch('/v1/permissoes/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = permissionIdParamsSchema.parse(request.params);
    const body = updatePermissionBodySchema.parse(request.body);
    const permission = await services.getPermission.execute(params.id);
    if (authorizer) await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: await companyOf(permission.perfilId) });
    return services.updatePermission.execute(params.id, body);
  });
}
