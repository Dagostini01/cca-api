import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeScreen, authorizeUserManagement } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { UserRepository } from '../../../../users/application/ports/user-repository.js';
import { UserNotFoundError } from '../../../../users/domain/user-errors.js';
import type { AccessServices } from '../../../application/factories/access-services-factory.js';
import { accessIdParamsSchema, createAccessBodySchema, listAccessesQuerySchema, updateAccessBodySchema } from './access-schemas.js';

export function registerAccessRoutes(
  app: FastifyInstance,
  services: AccessServices,
  users: UserRepository,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/acessos', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createAccessBodySchema.parse(request.body);
    await authorizeUserManagement(authorizer, actor.id, body.usuarioId);
    const access = await services.createAccess.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'ACESSO', recursoId: access.id, descricao: 'acesso' });
    return reply.code(201).send(access);
  });

  app.get('/v1/acessos', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listAccessesQuerySchema.parse(request.query);
    await allowAccessList(users, authorizer, actor.id, query.usuarioId);
    return services.listAccesses.execute(query);
  });

  app.get('/v1/acessos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = accessIdParamsSchema.parse(request.params);
    const access = await services.getAccess.execute(params.id);
    await allowAccessList(users, authorizer, actor.id, access.usuarioId, access.submenuId);
    return access;
  });

  app.patch('/v1/acessos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = accessIdParamsSchema.parse(request.params);
    const body = updateAccessBodySchema.parse(request.body);
    const access = await services.getAccess.execute(params.id);
    await authorizeUserManagement(authorizer, actor.id, access.usuarioId);
    const updated = await services.updateAccess.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'ACESSO', recursoId: updated.id, descricao: 'acesso' });
    return updated;
  });

  app.delete('/v1/acessos/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = accessIdParamsSchema.parse(request.params);
    const access = await services.getAccess.execute(params.id);
    await authorizeUserManagement(authorizer, actor.id, access.usuarioId);
    await recordChange(audits, actor.id, { acao: 'EXCLUIR', recursoTipo: 'ACESSO', recursoId: access.id, descricao: 'acesso' });
    await services.deleteAccess.execute(access.id);
    return reply.code(204).send();
  });
}

async function allowAccessList(
  users: UserRepository,
  authorizer: Authorizer | undefined,
  subject: string,
  usuarioId: number,
  submenuId?: number,
): Promise<void> {
  if (!authorizer) return;
  const actor = await users.findBySubject(subject);
  if (actor && actor.id === usuarioId && actor.status === 'ATIVADO') {
    if (submenuId !== undefined) await authorizeScreen(authorizer, subject, submenuId);
    return;
  }
  try {
    await authorizeUserManagement(authorizer, subject, usuarioId);
  } catch (error) {
    if (error instanceof UserNotFoundError) throw error;
    throw error;
  }
}
