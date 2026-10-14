import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { AccessSystemNotFoundError, AccessUserNotFoundError } from '../../../domain/access-errors.js';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { SystemRepository } from '../../../../systems/application/ports/system-repository.js';
import type { UserRepository } from '../../../../users/application/ports/user-repository.js';
import type { AccessServices } from '../../../application/factories/access-services-factory.js';
import { accessIdParamsSchema, createAccessBodySchema, listAccessesQuerySchema, updateAccessBodySchema } from './access-schemas.js';

export function registerAccessRoutes(
  app: FastifyInstance,
  services: AccessServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  parties?: { users: UserRepository; systems: SystemRepository },
  audits?: AuditRecorder,
) {
  async function companyOfSystem(sistemaId: string) {
    const system = await parties?.systems.findById(sistemaId);
    if (!system) throw new AccessSystemNotFoundError();
    return system.empresaId;
  }

  app.post('/v1/acessos', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createAccessBodySchema.parse(request.body);
    if (authorizer) {
      const user = await parties?.users.findById(body.usuarioId);
      if (!user) throw new AccessUserNotFoundError();
      const systemCompanyId = await companyOfSystem(body.sistemaId);
      await authorize(authorizer, actor.id, 'criar', { tipo: 'EMPRESA', id: user.empresaId });
      if (systemCompanyId !== user.empresaId) {
        await authorize(authorizer, actor.id, 'criar', { tipo: 'EMPRESA', id: systemCompanyId });
      }
    }
    const access = await services.createAccess.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'ACESSO', recursoId: access.id, descricao: 'acesso' });
    return reply.code(201).send(access);
  });

  app.get('/v1/acessos', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listAccessesQuerySchema.parse(request.query);
    const accesses = await services.listAccesses.execute(query);
    if (!authorizer) return accesses;
    const located = [];
    for (const access of accesses) {
      const system = await parties?.systems.findById(access.sistemaId);
      if (!system) continue;
      located.push({ access, empresaId: system.empresaId });
    }
    const visible = await onlyVisible(authorizer, actor.id, located, (row) => ({ tipo: 'EMPRESA', id: row.empresaId }));
    return visible.map((row) => row.access);
  });

  app.get('/v1/acessos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = accessIdParamsSchema.parse(request.params);
    const access = await services.getAccess.execute(params.id);
    if (authorizer) await authorize(authorizer, actor.id, 'visualizar', { tipo: 'EMPRESA', id: await companyOfSystem(access.sistemaId) });
    return access;
  });

  app.patch('/v1/acessos/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = accessIdParamsSchema.parse(request.params);
    const body = updateAccessBodySchema.parse(request.body);
    const access = await services.getAccess.execute(params.id);
    if (authorizer) await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: await companyOfSystem(access.sistemaId) });
    const updated = await services.updateAccess.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'ACESSO', recursoId: updated.id, descricao: 'acesso' });
    return updated;
  });
}
