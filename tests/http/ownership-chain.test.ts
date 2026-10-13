import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';

describe('HTTP ownership chain', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: 'sub-1' }) },
      companyRepository: new InMemoryCompanyRepository(),
      systemRepository: new InMemorySystemRepository(),
      moduleRepository: new InMemoryModuleRepository(),
      menuRepository: new InMemoryMenuRepository(),
      submenuRepository: new InMemorySubmenuRepository(),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('requires a bearer token on the new routes', async () => {
    const app = createApp();
    for (const url of ['/v1/modulos', '/v1/menus', '/v1/submenus']) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'unauthorized' });
    }
  });

  it('creates the chain from company to submenu and keeps each child bound to its parent', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const system = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: company.json().id },
    });
    const missingModule = await app.inject({
      method: 'POST',
      url: '/v1/modulos',
      headers,
      payload: { nome: 'Cadastro', sistemaId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d' },
    });
    expect(missingModule.statusCode).toBe(404);
    expect(missingModule.json()).toEqual({ error: 'system_not_found' });

    const module = await app.inject({
      method: 'POST',
      url: '/v1/modulos',
      headers,
      payload: { nome: ' Cadastro ', sistemaId: system.json().id },
    });
    expect(module.statusCode).toBe(201);
    expect(module.json()).toMatchObject({ nome: 'Cadastro', sistemaId: system.json().id, status: 'ATIVO' });

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/modulos',
      headers,
      payload: { nome: 'cadastro', sistemaId: system.json().id },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'module_name_conflict' });

    const menu = await app.inject({
      method: 'POST',
      url: '/v1/menus',
      headers,
      payload: { nome: 'Pessoas', moduloId: module.json().id },
    });
    expect(menu.statusCode).toBe(201);
    expect(menu.json()).toMatchObject({ moduloId: module.json().id });

    const submenu = await app.inject({
      method: 'POST',
      url: '/v1/submenus',
      headers,
      payload: { nome: 'Novo', menuId: menu.json().id },
    });
    expect(submenu.statusCode).toBe(201);
    expect(submenu.json()).toMatchObject({ menuId: menu.json().id, status: 'ATIVO' });

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/submenus?menuId=${menu.json().id}`,
      headers,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: submenu.json().id })]);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/submenus/${submenu.json().id}`,
      headers,
      payload: { status: 'INATIVO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ status: 'INATIVO', menuId: menu.json().id });

    const withoutParent = await app.inject({
      method: 'POST',
      url: '/v1/menus',
      headers,
      payload: { nome: 'Solto' },
    });
    expect(withoutParent.statusCode).toBe(400);
    expect(withoutParent.json().error).toBe('validation_error');
  });
});
