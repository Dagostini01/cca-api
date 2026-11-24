import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';
import { createMemoryApp } from '../helpers/memory-app.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('HTTP delete', () => {
  const apps: Array<{ close(): Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('rejects a delete without a bearer token', async () => {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: subject }) },
      companyRepository: new InMemoryCompanyRepository(),
      logger: false,
    });
    apps.push(app);
    const response = await app.inject({ method: 'DELETE', url: '/v1/empresas/999' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('deletes a company and keeps a system that still has a module', async () => {
    const { app } = createMemoryApp({ verify: async () => ({ id: subject }) });
    apps.push(app);
    const headers = { authorization: 'Bearer access-token' };

    const created = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Alfa' } });
    const removed = await app.inject({ method: 'DELETE', url: `/v1/empresas/${created.json().id}`, headers });
    expect(removed.statusCode).toBe(204);
    expect(removed.body).toBe('');
    const missing = await app.inject({ method: 'GET', url: `/v1/empresas/${created.json().id}`, headers });
    expect(missing.statusCode).toBe(404);

    const owner = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Beta' } });
    const system = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Escala', empresaIds: [owner.json().id] } });
    const module = await app.inject({
      method: 'POST',
      url: '/v1/modulos',
      headers,
      payload: { nome: 'Cadastro', sistemaId: system.json().id },
    });
    expect(module.statusCode).toBe(201);
    const blocked = await app.inject({ method: 'DELETE', url: `/v1/sistemas/${system.json().id}`, headers });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toEqual({ error: 'delete_restricted' });
    const stillThere = await app.inject({ method: 'GET', url: `/v1/sistemas/${system.json().id}`, headers });
    expect(stillThere.statusCode).toBe(200);
  });

  it('returns not found for a missing company', async () => {
    const { app } = createMemoryApp({ verify: async () => ({ id: subject }) });
    apps.push(app);
    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/empresas/999',
      headers: { authorization: 'Bearer access-token' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'company_not_found' });
  });

  it('refuses a company that still grants a screen and a user who authored an audit', async () => {
    const { app } = createMemoryApp({ verify: async () => ({ id: subject }), audits: true });
    apps.push(app);
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Alfa' } });
    const system = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Escala', empresaIds: [company.json().id] } });
    const module = await app.inject({
      method: 'POST',
      url: '/v1/modulos',
      headers,
      payload: { nome: 'Cadastro', sistemaId: system.json().id },
    });
    const menu = await app.inject({
      method: 'POST',
      url: '/v1/menus',
      headers,
      payload: { nome: 'Pessoas', moduloId: module.json().id },
    });
    const submenu = await app.inject({
      method: 'POST',
      url: '/v1/submenus',
      headers,
      payload: { nome: 'Novo', menuId: menu.json().id },
    });
    const admin = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@example.com', keycloakSub: subject },
    });
    const child = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: {
        nome: 'Bruno',
        email: 'bruno@example.com',
        keycloakSub: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
        tipo: 'SUPERVISOR',
        telas: [{
          empresaId: company.json().id,
          sistemaId: system.json().id,
          moduloId: module.json().id,
          menuId: menu.json().id,
          submenuId: submenu.json().id,
        }],
      },
    });
    expect(child.statusCode).toBe(201);

    const blockedCompany = await app.inject({ method: 'DELETE', url: `/v1/empresas/${company.json().id}`, headers });
    expect(blockedCompany.statusCode).toBe(409);
    expect(blockedCompany.json()).toEqual({ error: 'delete_restricted' });

    const blockedChild = await app.inject({ method: 'DELETE', url: `/v1/usuarios/${child.json().id}`, headers });
    expect(blockedChild.statusCode).toBe(409);

    const blockedAdmin = await app.inject({ method: 'DELETE', url: `/v1/usuarios/${admin.json().id}`, headers });
    expect(blockedAdmin.statusCode).toBe(409);
    expect(blockedAdmin.json()).toEqual({ error: 'delete_restricted' });
  });
});
