import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createAuthorizer } from '../../src/modules/authorization/application/services/authorize-access.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryPermissionRepository } from '../permissions/in-memory-permission-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

describe('HTTP authorization', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    const users = new InMemoryUserRepository();
    const profiles = new InMemoryProfileRepository();
    const permissions = new InMemoryPermissionRepository();
    const accesses = new InMemoryAccessRepository();
    const resources = createWalkingChainResourceLookup(companies, systems, modules, menus, submenus);
    const app = buildApp(testEnv, {
      tokenVerifier: {
        verify: async (token) => ({ id: token === 'other-token' ? otherSubject : subject }),
      },
      companyRepository: companies,
      systemRepository: systems,
      moduleRepository: modules,
      menuRepository: menus,
      submenuRepository: submenus,
      userRepository: users,
      profileRepository: profiles,
      permissionRepository: permissions,
      chainResourceLookup: resources,
      accessRepository: accesses,
      authorizer: createAuthorizer({ users, accesses, profiles, permissions, systems, resources }),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('keeps routes open until the first access and then enforces the grant', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    expect(company.statusCode).toBe(201);
    const empresaId = company.json().id as string;

    const system = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Escala', empresaId } });
    expect(system.statusCode).toBe(201);
    const sistemaId = system.json().id as string;

    const user = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@example.com', keycloakSub: subject, empresaId },
    });
    expect(user.statusCode).toBe(201);
    const profile = await app.inject({ method: 'POST', url: '/v1/perfis', headers, payload: { nome: 'Supervisor', empresaId } });
    expect(profile.statusCode).toBe(201);
    const perfilId = profile.json().id as string;

    const companyGrant = await app.inject({
      method: 'POST',
      url: '/v1/permissoes',
      headers,
      payload: { perfilId, recursoTipo: 'EMPRESA', recursoId: empresaId, visualizar: true, criar: true, editar: true, excluir: false },
    });
    expect(companyGrant.statusCode).toBe(201);
    const systemGrant = await app.inject({
      method: 'POST',
      url: '/v1/permissoes',
      headers,
      payload: { perfilId, recursoTipo: 'SISTEMA', recursoId: sistemaId, visualizar: true, criar: false, editar: false, excluir: false },
    });
    expect(systemGrant.statusCode).toBe(201);

    const access = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId: user.json().id, perfilId, sistemaId },
    });
    expect(access.statusCode).toBe(201);

    const me = await app.inject({ method: 'GET', url: '/v1/me', headers });
    expect(me.statusCode).toBe(200);
    const myself = await app.inject({ method: 'GET', url: '/v1/usuarios/eu', headers });
    expect(myself.statusCode).toBe(200);
    expect(myself.json().id).toBe(user.json().id);

    const readCompany = await app.inject({ method: 'GET', url: `/v1/empresas/${empresaId}`, headers });
    expect(readCompany.statusCode).toBe(200);
    const missing = await app.inject({ method: 'GET', url: `/v1/empresas/${missingId}`, headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'company_not_found' });

    const deniedModule = await app.inject({ method: 'POST', url: '/v1/modulos', headers, payload: { nome: 'Funcionários', sistemaId } });
    expect(deniedModule.statusCode).toBe(403);
    expect(deniedModule.json()).toEqual({ error: 'forbidden' });

    const edited = await app.inject({
      method: 'PATCH',
      url: `/v1/permissoes/${systemGrant.json().id}`,
      headers,
      payload: { criar: true },
    });
    expect(edited.statusCode).toBe(200);
    const module = await app.inject({ method: 'POST', url: '/v1/modulos', headers, payload: { nome: 'Funcionários', sistemaId } });
    expect(module.statusCode).toBe(201);
    const hiddenModule = await app.inject({ method: 'GET', url: `/v1/modulos/${module.json().id}`, headers });
    expect(hiddenModule.statusCode).toBe(403);

    const second = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Portal', empresaId } });
    expect(second.statusCode).toBe(201);
    const listed = await app.inject({ method: 'GET', url: '/v1/sistemas', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().map((item: { id: string }) => item.id)).toEqual([sistemaId]);
    const hiddenSystem = await app.inject({ method: 'GET', url: `/v1/sistemas/${second.json().id}`, headers });
    expect(hiddenSystem.statusCode).toBe(403);

    const outsider = await app.inject({ method: 'GET', url: `/v1/empresas/${empresaId}`, headers: { authorization: 'Bearer other-token' } });
    expect(outsider.statusCode).toBe(403);
    const claims = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer other-token' } });
    expect(claims.statusCode).toBe(200);
  });
});
