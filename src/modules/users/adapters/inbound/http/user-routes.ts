import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { AUDIT_DESCRIPTION_MAX_LENGTH } from '../../../../audits/domain/audit.js';
import { authorizeCatalog, authorizeUserManagement } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { ForbiddenError } from '../../../../authorization/domain/forbidden-error.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { UserServices } from '../../../application/factories/user-services-factory.js';
import { SelfDeactivationError, UserNotFoundError } from '../../../domain/user-errors.js';
import { createUserBodySchema, updateUserBodySchema, userIdParamsSchema, userListQuerySchema } from './user-schemas.js';

export function registerUserRoutes(
  app: FastifyInstance,
  services: UserServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/usuarios/:id/codigo-acesso', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const user = await services.getUser.execute(params.id);
    await authorizeUserManagement(authorizer, actor.id, user.id);
    const issued = await services.issueAccessCode.execute(user);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'USUARIO', recursoId: user.id, descricao: `Código de acesso emitido: ${user.nome}`.slice(0, AUDIT_DESCRIPTION_MAX_LENGTH) });
    return reply.header('cache-control', 'no-store').code(201).send(issued);
  });

  app.post('/v1/usuarios', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const body = createUserBodySchema.parse(request.body);
    const user = await services.createUser.execute(body, actor.id);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'USUARIO', recursoId: user.id, descricao: user.nome });
    return reply.code(201).send(user);
  });

  app.get('/v1/usuarios/eu', async (request) => {
    const authenticated = await requireUser(request, getCurrentUser);
    return services.getUserBySubject.execute(authenticated.id);
  });

  app.get('/v1/usuarios', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const query = userListQuerySchema.parse(request.query);
    return services.listUsers.execute(actor.id, query);
  });

  app.get('/v1/usuarios/:id/telas', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const user = await services.getUser.execute(params.id);
    await allowScreens(services, authorizer, actor.id, user.id);
    return services.listUserScreens.execute(user.id);
  });

  app.get('/v1/usuarios/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const user = await services.getUser.execute(params.id);
    await authorizeUserManagement(authorizer, actor.id, user.id);
    return user;
  });

  app.patch('/v1/usuarios/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const body = updateUserBodySchema.parse(request.body);
    const user = await services.getUser.execute(params.id);
    await authorizeUserManagement(authorizer, actor.id, user.id);
    if (body.status === 'DESATIVADO' && user.keycloakSub === actor.id.trim().toLowerCase()) throw new SelfDeactivationError();
    const updated = await services.updateUser.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'USUARIO', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });

  app.delete('/v1/usuarios/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = userIdParamsSchema.parse(request.params);
    const user = await services.getUser.execute(params.id);
    await authorizeUserManagement(authorizer, actor.id, user.id);
    await services.deleteUser.ensureDeletable(user.id);
    if (user.keycloakSub !== actor.id.trim().toLowerCase()) {
      await recordChange(audits, actor.id, { acao: 'EXCLUIR', recursoTipo: 'USUARIO', recursoId: user.id, descricao: user.nome });
    }
    await services.deleteUser.execute(user.id);
    return reply.code(204).send();
  });
}

async function allowScreens(
  services: UserServices,
  authorizer: Authorizer | undefined,
  subject: string,
  userId: number,
): Promise<void> {
  if (!authorizer) return;
  try {
    const actor = await services.getUserBySubject.execute(subject);
    if (actor.id === userId) {
      if (actor.status !== 'ATIVADO') throw new ForbiddenError();
      return;
    }
  } catch (error) {
    if (!(error instanceof UserNotFoundError)) throw error;
  }
  await authorizeUserManagement(authorizer, subject, userId);
}
