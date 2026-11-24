import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';

describe('HTTP legacy import', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }) },
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

  const payload = {
    statuses: [{ id: 1, nome: 'ATIVADO' }],
    companies: [{ id: 1, nome: 'Casa', cnpj: null, statusId: 1 }],
    systems: [{ id: 1, parentId: null, nome: 'Portal', statusId: 1 }],
    modules: [],
    menus: [],
    submenus: [],
    profiles: [],
    users: [],
    accesses: [],
    senhasIgnoradas: 2,
  };

  it('requires a bearer token', async () => {
    const response = await createApp().inject({ method: 'POST', url: '/v1/importacoes/legado', payload });
    expect(response.statusCode).toBe(401);
  });

  it('creates the catalog and rejects a password field', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({ method: 'POST', url: '/v1/importacoes/legado', headers, payload });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      empresas: { criadas: 1, existentes: 0, ignoradas: 0 },
      sistemas: { criadas: 1 },
      senhasIgnoradas: 2,
    });
    expect(created.json()).not.toHaveProperty('perfis');
    expect(created.json()).not.toHaveProperty('permissoes');

    const listed = await app.inject({ method: 'GET', url: '/v1/empresas', headers });
    expect(listed.json()).toEqual([expect.objectContaining({ razaoSocial: 'Casa', cnpj: null })]);

    const leaked = 'secret-must-not-leak';
    const rejected = await app.inject({
      method: 'POST',
      url: '/v1/importacoes/legado',
      headers,
      payload: { ...payload, senha: leaked },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().error).toBe('validation_error');
    expect(JSON.stringify(rejected.json())).not.toContain(leaked);
  });

  it('imports one global system when several companies exist', async () => {
    const response = await createApp().inject({
      method: 'POST',
      url: '/v1/importacoes/legado',
      headers: { authorization: 'Bearer access-token' },
      payload: {
        ...payload,
        companies: [
          { id: 1, nome: 'Casa', cnpj: null, statusId: 1 },
          { id: 2, nome: 'Outra', cnpj: null, statusId: 1 },
        ],
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      empresas: { criadas: 2 },
      sistemas: { criadas: 1 },
    });
  });
});
