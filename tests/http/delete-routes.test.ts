import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createAccessServices } from '../../src/modules/accesses/application/factories/access-services-factory.js';
import { createAuthorizer } from '../../src/modules/authorization/application/services/authorize-access.js';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createPermissionServices } from '../../src/modules/permissions/application/factories/permission-services-factory.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import { createProfileServices } from '../../src/modules/profiles/application/factories/profile-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { createUserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryAuditRepository } from '../audits/in-memory-audit-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryPermissionRepository } from '../permissions/in-memory-permission-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

describe('HTTP delete', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp(extra: Parameters<typeof buildApp>[1] = {}) {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: subject }) },
      logger: false,
      ...extra,
    });
    apps.push(app);
    return app;
  }

  it('rejects a delete without a bearer token', async () => {
    const response = await createApp({ companyRepository: new InMemoryCompanyRepository() }).inject({
      method: 'DELETE',
      url: `/v1/empresas/${missingId}`,
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('deletes a company that has no children and keeps one that has a system', async () => {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const app = createApp({ companyRepository: companies, systemRepository: systems });
    const headers = { authorization: 'Bearer access-token' };

    const created = await app.inject({
      method: 'POST',
      url: '/v1/empresas',
      headers,
      payload: { nome: 'Alfa' },
    });
    const company = created.json();

    const removed = await app.inject({ method: 'DELETE', url: `/v1/empresas/${company.id}`, headers });
    expect(removed.statusCode).toBe(204);
    expect(removed.body).toBe('');

    const missing = await app.inject({ method: 'GET', url: `/v1/empresas/${company.id}`, headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'company_not_found' });

    const again = await app.inject({
      method: 'POST',
      url: '/v1/empresas',
      headers,
      payload: { nome: 'Beta' },
    });
    const parent = again.json();
    const system = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: parent.id },
    });
    expect(system.statusCode).toBe(201);

    const blocked = await app.inject({ method: 'DELETE', url: `/v1/empresas/${parent.id}`, headers });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toEqual({ error: 'delete_restricted' });

    const stillThere = await app.inject({ method: 'GET', url: `/v1/empresas/${parent.id}`, headers });
    expect(stillThere.statusCode).toBe(200);
  });

  it('returns not found for a missing company', async () => {
    const response = await createApp({ companyRepository: new InMemoryCompanyRepository() }).inject({
      method: 'DELETE',
      url: `/v1/empresas/${missingId}`,
      headers: { authorization: 'Bearer access-token' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'company_not_found' });
  });

  it('requires excluir and refuses a user who authored an audit', async () => {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    const users = new InMemoryUserRepository();
    const profiles = new InMemoryProfileRepository();
    const permissions = new InMemoryPermissionRepository();
    const accesses = new InMemoryAccessRepository();
    const audits = new InMemoryAuditRepository();
    const resources = createWalkingChainResourceLookup(companies, systems, modules, menus, submenus);
    const companyServices = createCompanyServices(companies);
    const systemServices = createSystemServices(systems, companies);
    const userServices = createUserServices(users, companies);
    const profileServices = createProfileServices(profiles, companies);
    const permissionServices = createPermissionServices(permissions, profiles, resources);
    const accessServices = createAccessServices(accesses, users, profiles, systems);
    const company = await companyServices.createCompany.execute({ nome: 'Alfa' });
    const system = await systemServices.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const user = await userServices.createUser.execute({
      nome: 'Ana',
      email: 'ana@example.com',
      keycloakSub: subject,
      empresaId: company.id,
    });
    const profile = await profileServices.createProfile.execute({ nome: 'Supervisor', empresaId: company.id });
    await accessServices.createAccess.execute({ usuarioId: user.id, perfilId: profile.id, sistemaId: system.id });
    const permission = await permissionServices.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'EMPRESA',
      recursoId: company.id,
      visualizar: true,
      criar: false,
      editar: false,
      excluir: false,
    });
    const authorizer = createAuthorizer({ users, accesses, profiles, permissions, systems, resources });
    const app = createApp({
      companyRepository: companies,
      systemRepository: systems,
      userRepository: users,
      profileRepository: profiles,
      permissionRepository: permissions,
      accessRepository: accesses,
      auditRepository: audits,
      authorizer,
    });
    const headers = { authorization: 'Bearer access-token' };

    const forbidden = await app.inject({ method: 'DELETE', url: `/v1/empresas/${company.id}`, headers });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toEqual({ error: 'forbidden' });

    await permissionServices.updatePermission.execute(permission.id, { excluir: true });
    const blockedByChild = await app.inject({ method: 'DELETE', url: `/v1/empresas/${company.id}`, headers });
    expect(blockedByChild.statusCode).toBe(409);

    await audits.add({
      ocorridoEm: new Date(),
      usuarioId: user.id,
      usuarioNome: user.nome,
      acao: 'CRIAR',
      recursoTipo: 'EMPRESA',
      recursoId: company.id,
      descricao: company.nome,
      empresaId: company.id,
    });
    const [access] = await accessServices.listAccesses.execute({ usuarioId: user.id });
    await accessServices.deleteAccess.execute(access.id);
    const kept = await app.inject({ method: 'DELETE', url: `/v1/usuarios/${user.id}`, headers });
    expect(kept.statusCode).toBe(409);
    expect(kept.json()).toEqual({ error: 'delete_restricted' });
  });
});
