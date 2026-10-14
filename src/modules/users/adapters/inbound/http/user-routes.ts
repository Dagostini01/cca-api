import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { UserServices } from '../../../application/factories/user-services-factory.js';
import { createUserBodySchema, listUsersQuerySchema, updateUserBodySchema, userIdParamsSchema } from './user-schemas.js';

export function registerUserRoutes(
  app: FastifyInstance,
  services: UserServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/usuarios', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createUserBodySchema.parse(request.body);
    await authorize(authorizer, actor.id, 'criar', { tipo: 'EMPRESA', id: body.empresaId });
    const user = await services.createUser.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'USUARIO', recursoId: user.id, descricao: user.nome });
    return reply.code(201).send(user);
  });

  app.get('/v1/usuarios/eu', async (request) => {
    const authenticated = await requireUser(request, getCurrentUser);
    return services.getUserBySubject.execute(authenticated.id);
  });

  app.get('/v1/usuarios', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listUsersQuerySchema.parse(request.query);
    const users = await services.listUsers.execute(query);
    return onlyVisible(authorizer, actor.id, users, (user) => ({ tipo: 'EMPRESA', id: user.empresaId }));
  });

  app.get('/v1/usuarios/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const user = await services.getUser.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'EMPRESA', id: user.empresaId });
    return user;
  });

  app.patch('/v1/usuarios/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const body = updateUserBodySchema.parse(request.body);
    const user = await services.getUser.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: user.empresaId });
    if (body.empresaId && body.empresaId !== user.empresaId) {
      await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: body.empresaId });
    }
    const updated = await services.updateUser.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'USUARIO', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });
}
