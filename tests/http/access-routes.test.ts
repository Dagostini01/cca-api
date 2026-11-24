import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryApp } from '../helpers/memory-app.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('HTTP acessos', () => {
  const apps: Array<ReturnType<typeof createMemoryApp>['app']> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const { app } = createMemoryApp({ verify: async () => ({ id: subject }) });
    apps.push(app);
    return app;
  }

  it('requires a bearer token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/v1/acessos' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('grants one screen, rejects a broken chain and a repeated submenu', async () => {
    const app = createApp();
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
    const other = await app.inject({
      method: 'POST',
      url: '/v1/submenus',
      headers,
      payload: { nome: 'Lista', menuId: menu.json().id },
    });
    const user = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject },
    });
    const usuarioId = user.json().id as number;
    const screen = {
      usuarioId,
      empresaId: company.json().id,
      sistemaId: system.json().id,
      moduloId: module.json().id,
      menuId: menu.json().id,
      submenuId: submenu.json().id,
    };

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { ...screen, usuarioId: 999 },
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'user_not_found' });

    const otherMenu = await app.inject({
      method: 'POST',
      url: '/v1/menus',
      headers,
      payload: { nome: 'Outro', moduloId: module.json().id },
    });
    const broken = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { ...screen, menuId: otherMenu.json().id },
    });
    expect(broken.statusCode).toBe(400);
    expect(broken.json()).toEqual({ error: 'incoherent_screen' });

    const outsider = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Beta' } });
    const foreign = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { ...screen, empresaId: outsider.json().id },
    });
    expect(foreign.statusCode).toBe(400);
    expect(foreign.json()).toEqual({ error: 'system_not_in_company' });

    const created = await app.inject({ method: 'POST', url: '/v1/acessos', headers, payload: screen });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ usuarioId, submenuId: submenu.json().id, status: 'ATIVADO' });
    expect(created.json()).not.toHaveProperty('email');

    const conflict = await app.inject({ method: 'POST', url: '/v1/acessos', headers, payload: screen });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'access_conflict' });

    const second = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { ...screen, submenuId: other.json().id },
    });
    expect(second.statusCode).toBe(201);

    const unlinkUsed = await app.inject({
      method: 'PATCH',
      url: `/v1/sistemas/${system.json().id}`,
      headers,
      payload: { empresaIds: [outsider.json().id] },
    });
    expect(unlinkUsed.statusCode).toBe(409);
    expect(unlinkUsed.json()).toEqual({ error: 'system_company_in_use' });

    const listed = await app.inject({ method: 'GET', url: `/v1/acessos?usuarioId=${usuarioId}`, headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().itens).toHaveLength(2);
    expect(listed.json().total).toBe(2);
    expect(listed.json().itens[0]).toMatchObject({ empresa: 'Alfa', sistema: 'Escala' });

    const rejected = await app.inject({
      method: 'PATCH',
      url: `/v1/acessos/${created.json().id}`,
      headers,
      payload: { usuarioId },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().error).toBe('validation_error');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/acessos/${created.json().id}`,
      headers,
      payload: { status: 'DESATIVADO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ submenuId: submenu.json().id, status: 'DESATIVADO' });
  });
});
