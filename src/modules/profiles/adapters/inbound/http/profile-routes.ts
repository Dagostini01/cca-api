import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorize, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { ProfileServices } from '../../../application/factories/profile-services-factory.js';
import { createProfileBodySchema, listProfilesQuerySchema, profileIdParamsSchema, updateProfileBodySchema } from './profile-schemas.js';

export function registerProfileRoutes(
  app: FastifyInstance,
  services: ProfileServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/perfis', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = createProfileBodySchema.parse(request.body);
    await authorize(authorizer, actor.id, 'criar', { tipo: 'EMPRESA', id: body.empresaId });
    const profile = await services.createProfile.execute(body);
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'PERFIL', recursoId: profile.id, descricao: profile.nome });
    return reply.code(201).send(profile);
  });

  app.get('/v1/perfis', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const query = listProfilesQuerySchema.parse(request.query);
    const profiles = await services.listProfiles.execute(query);
    return onlyVisible(authorizer, actor.id, profiles, (profile) => ({ tipo: 'EMPRESA', id: profile.empresaId }));
  });

  app.get('/v1/perfis/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = profileIdParamsSchema.parse(request.params);
    const profile = await services.getProfile.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'EMPRESA', id: profile.empresaId });
    return profile;
  });

  app.patch('/v1/perfis/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = profileIdParamsSchema.parse(request.params);
    const body = updateProfileBodySchema.parse(request.body);
    const profile = await services.getProfile.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: profile.empresaId });
    if (body.empresaId && body.empresaId !== profile.empresaId) {
      await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: body.empresaId });
    }
    const updated = await services.updateProfile.execute(params.id, body);
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'PERFIL', recursoId: updated.id, descricao: updated.nome });
    return updated;
  });
}
