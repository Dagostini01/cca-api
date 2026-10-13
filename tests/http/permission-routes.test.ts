import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryPermissionRepository } from '../permissions/in-memory-permission-repository.js';

describe('HTTP permissoes', () => {
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
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: 'sub-1' }) },
      companyRepository: companies,
      systemRepository: systems,
      moduleRepository: modules,
      menuRepository: menus,
      submenuRepository: submenus,
      profileRepository: new InMemoryProfileRepository(),
      permissionRepository: new InMemoryPermissionRepository(),
      chainResourceLookup: createWalkingChainResourceLookup(companies, systems, modules, menus, submenus),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('requires a bearer token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/v1/permissoes' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('grants a module of the profile company and rejects the same grant and a foreign system', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const alfa = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const beta = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Beta' } });
    const system = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: alfa.json().id },
    });
    const foreign = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Portal', empresaId: beta.json().id },
    });
    const module = await app.inject({
      method: 'POST',
      url: '/v1/modulos',
      headers,
      payload: { nome: 'Funcionários', sistemaId: system.json().id },
    });
    const profile = await app.inject({
      method: 'POST',
      url: '/v1/perfis',
      headers,
      payload: { nome: 'Supervisor', empresaId: alfa.json().id },
    });
    const perfilId = profile.json().id as string;
    const recursoId = module.json().id as string;

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/permissoes',
      headers,
      payload: {
        perfilId,
        recursoTipo: 'MODULO',
        recursoId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d',
        visualizar: true,
        criar: false,
        editar: false,
        excluir: false,
      },
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'resource_not_found' });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/permissoes',
      headers,
      payload: { perfilId, recursoTipo: 'MODULO', recursoId, visualizar: true, criar: true, editar: true, excluir: false },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ perfilId, recursoTipo: 'MODULO', recursoId, visualizar: true, excluir: false });
    expect(created.json()).not.toHaveProperty('empresaId');

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/permissoes',
      headers,
      payload: { perfilId, recursoTipo: 'MODULO', recursoId, visualizar: true, criar: false, editar: false, excluir: false },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'permission_conflict' });

    const mismatch = await app.inject({
      method: 'POST',
      url: '/v1/permissoes',
      headers,
      payload: {
        perfilId,
        recursoTipo: 'SISTEMA',
        recursoId: foreign.json().id,
        visualizar: true,
        criar: false,
        editar: false,
        excluir: false,
      },
    });
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json()).toEqual({ error: 'permission_company_mismatch' });

    const listed = await app.inject({ method: 'GET', url: `/v1/permissoes?perfilId=${perfilId}`, headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: created.json().id, recursoId })]);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/permissoes/${created.json().id}`,
      headers,
      payload: { excluir: true, perfilId },
    });
    expect(updated.statusCode).toBe(400);
    expect(updated.json().error).toBe('validation_error');

    const changed = await app.inject({
      method: 'PATCH',
      url: `/v1/permissoes/${created.json().id}`,
      headers,
      payload: { excluir: true },
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json()).toMatchObject({ recursoId, excluir: true, criar: true });
  });
});
