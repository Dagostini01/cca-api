import type { FastifyInstance } from 'fastify';
import { recordChange } from '../../../../audits/adapters/inbound/http/record-change.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeCatalog } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { CompanyServices } from '../../../application/factories/company-services-factory.js';
import { tamanhoOf } from '../../../../../shared/http/page.js';
import { companyIdParamsSchema, companyListQuerySchema, createCompanyBodySchema, updateCompanyBodySchema } from './company-schemas.js';

export function registerCompanyRoutes(
  app: FastifyInstance,
  services: CompanyServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  app.post('/v1/empresas', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const body = createCompanyBodySchema.parse(request.body);
    const company = await services.createCompany.execute({
      ...body,
      dataConstituicao: body.dataConstituicao === undefined ? undefined : body.dataConstituicao === null ? null : new Date(body.dataConstituicao),
    });
    await recordChange(audits, actor.id, { acao: 'CRIAR', recursoTipo: 'EMPRESA', recursoId: company.id, descricao: company.razaoSocial });
    return reply.code(201).send(company);
  });

  app.get('/v1/empresas', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const query = companyListQuerySchema.parse(request.query);
    if (query.pagina === undefined) return services.listCompanies.execute({ q: query.q });
    return services.listCompanies.page({ q: query.q, pagina: query.pagina, tamanho: tamanhoOf(query) });
  });

  app.get('/v1/empresas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = companyIdParamsSchema.parse(request.params);
    return services.getCompany.execute(params.id);
  });

  app.patch('/v1/empresas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = companyIdParamsSchema.parse(request.params);
    const body = updateCompanyBodySchema.parse(request.body);
    const updated = await services.updateCompany.execute(params.id, {
      ...body,
      dataConstituicao: body.dataConstituicao === undefined ? undefined : body.dataConstituicao === null ? null : new Date(body.dataConstituicao),
    });
    await recordChange(audits, actor.id, { acao: 'ATUALIZAR', recursoTipo: 'EMPRESA', recursoId: updated.id, descricao: updated.razaoSocial });
    return updated;
  });

  app.delete('/v1/empresas/:id', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCatalog(authorizer, actor.id);
    const params = companyIdParamsSchema.parse(request.params);
    await services.deleteCompany.execute(params.id);
    return reply.code(204).send();
  });
}
