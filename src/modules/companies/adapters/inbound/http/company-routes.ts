import type { FastifyInstance } from 'fastify';
import { authorize, authorizeCompanyCreation, onlyVisible } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { CompanyServices } from '../../../application/factories/company-services-factory.js';
import { companyIdParamsSchema, createCompanyBodySchema, updateCompanyBodySchema } from './company-schemas.js';

export function registerCompanyRoutes(
  app: FastifyInstance,
  services: CompanyServices,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
) {
  app.post('/v1/empresas', async (request, reply) => {
    const actor = await requireUser(request, getCurrentUser);
    await authorizeCompanyCreation(authorizer, actor.id);
    const body = createCompanyBodySchema.parse(request.body);
    const company = await services.createCompany.execute(body);
    return reply.code(201).send(company);
  });

  app.get('/v1/empresas', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const companies = await services.listCompanies.execute();
    return onlyVisible(authorizer, actor.id, companies, (company) => ({ tipo: 'EMPRESA', id: company.id }));
  });

  app.get('/v1/empresas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = companyIdParamsSchema.parse(request.params);
    const company = await services.getCompany.execute(params.id);
    await authorize(authorizer, actor.id, 'visualizar', { tipo: 'EMPRESA', id: company.id });
    return company;
  });

  app.patch('/v1/empresas/:id', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const params = companyIdParamsSchema.parse(request.params);
    const body = updateCompanyBodySchema.parse(request.body);
    const company = await services.getCompany.execute(params.id);
    await authorize(authorizer, actor.id, 'editar', { tipo: 'EMPRESA', id: company.id });
    return services.updateCompany.execute(params.id, body);
  });
}
