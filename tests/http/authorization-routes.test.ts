import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryApp } from '../helpers/memory-app.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('HTTP authorization', () => {
  const apps: Array<ReturnType<typeof createMemoryApp>['app']> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const { app } = createMemoryApp({
      authorizer: true,
      verify: async (token) => ({ id: token === 'other-token' ? otherSubject : subject }),
    });
    apps.push(app);
    return app;
  }

  it('keeps the catalog open until the first administrator and then limits it to that type', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Alfa' } });
    expect(company.statusCode).toBe(201);
    const system = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Escala', empresaIds: [company.json().id] } });
    expect(system.statusCode).toBe(201);

    const admin = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@example.com', keycloakSub: subject, tipo: 'ADMINITRADOR' },
    });
    expect(admin.statusCode).toBe(201);
    const supervisor = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Bruno', email: 'bruno@example.com', keycloakSub: otherSubject, tipo: 'SUPERVISOR' },
    });
    expect(supervisor.statusCode).toBe(201);

    const me = await app.inject({ method: 'GET', url: '/v1/me', headers });
    expect(me.statusCode).toBe(200);
    const myself = await app.inject({ method: 'GET', url: '/v1/usuarios/eu', headers });
    expect(myself.statusCode).toBe(200);
    expect(myself.json().id).toBe(admin.json().id);

    const outsider = { authorization: 'Bearer other-token' };
    const denied = await app.inject({ method: 'POST', url: '/v1/empresas', headers: outsider, payload: { razaoSocial: 'Beta' } });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({ error: 'forbidden' });
    const claims = await app.inject({ method: 'GET', url: '/v1/me', headers: outsider });
    expect(claims.statusCode).toBe(200);

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
    const access = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: {
        usuarioId: supervisor.json().id,
        empresaId: company.json().id,
        sistemaId: system.json().id,
        moduloId: module.json().id,
        menuId: menu.json().id,
        submenuId: submenu.json().id,
      },
    });
    expect(access.statusCode).toBe(201);

    const ownScreen = await app.inject({ method: 'GET', url: `/v1/acessos/${access.json().id}`, headers: outsider });
    expect(ownScreen.statusCode).toBe(200);
    const catalog = await app.inject({ method: 'GET', url: '/v1/empresas', headers: outsider });
    expect(catalog.statusCode).toBe(403);
  });
});
