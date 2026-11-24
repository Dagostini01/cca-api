import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryApp } from '../helpers/memory-app.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('HTTP usuarios', () => {
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
    const response = await createApp().inject({ method: 'GET', url: '/v1/usuarios' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('creates the user and the screens in one request and lists only who that admin created', async () => {
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
    const tela = {
      empresaId: company.json().id,
      sistemaId: system.json().id,
      moduloId: module.json().id,
      menuId: menu.json().id,
      submenuId: submenu.json().id,
    };

    const missingLocal = await app.inject({ method: 'GET', url: '/v1/usuarios/eu', headers });
    expect(missingLocal.statusCode).toBe(404);
    expect(missingLocal.json()).toEqual({ error: 'user_not_found' });

    const admin = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: ' Admin ', email: 'Admin@Exemplo.com', keycloakSub: subject },
    });
    expect(admin.statusCode).toBe(201);
    expect(admin.json()).toMatchObject({
      nome: 'Admin',
      email: 'admin@exemplo.com',
      keycloakSub: subject,
      tipo: 'ADMINITRADOR',
      status: 'ATIVADO',
      criadoPorId: null,
      rg: null,
      cpf: null,
    });
    expect(admin.json()).not.toHaveProperty('senha');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: {
        nome: ' Ana ',
        email: 'Ana@Exemplo.com',
        keycloakSub: otherSubject,
        tipo: 'SUPERVISOR',
        telas: [tela],
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      criadoPorId: admin.json().id,
      tipo: 'SUPERVISOR',
    });

    const telas = await app.inject({ method: 'GET', url: `/v1/usuarios/${created.json().id}/telas`, headers });
    expect(telas.statusCode).toBe(200);
    expect(telas.json()).toEqual([{
      sistemaId: expect.any(Number),
      sistema: 'Escala',
      moduloId: expect.any(Number),
      modulo: 'Cadastro',
      menuId: expect.any(Number),
      menu: 'Pessoas',
      submenuId: expect.any(Number),
      submenu: 'Novo',
    }]);

    const mine = await app.inject({ method: 'GET', url: '/v1/usuarios/eu', headers });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().id).toBe(admin.json().id);

    const emailConflict = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Outra', email: 'ana@exemplo.com', keycloakSub: 'cccccccc-dddd-4eee-8fff-000000000000' },
    });
    expect(emailConflict.statusCode).toBe(409);
    expect(emailConflict.json()).toEqual({ error: 'user_email_conflict' });

    const listed = await app.inject({ method: 'GET', url: '/v1/usuarios', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual({
      itens: [expect.objectContaining({ id: created.json().id, nome: 'Ana' })],
      total: 1,
      pagina: 1,
      tamanho: 20,
    });

    const replaced = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: { telas: [] },
    });
    expect(replaced.statusCode).toBe(200);
    const cleared = await app.inject({ method: 'GET', url: `/v1/usuarios/${created.json().id}/telas`, headers });
    expect(cleared.json()).toEqual([]);

    const immutable = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: { status: 'DESATIVADO', keycloakSub: subject },
    });
    expect(immutable.statusCode).toBe(400);
    expect(immutable.json().error).toBe('validation_error');
  });

  it('rejects an empty update and a route id that is not an integer', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject },
    });
    const empty = await app.inject({
      method: 'PATCH',
      url: `/v1/usuarios/${created.json().id}`,
      headers,
      payload: {},
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error).toBe('validation_error');

    const invalidId = await app.inject({ method: 'GET', url: '/v1/usuarios/eu-nao', headers });
    expect(invalidId.statusCode).toBe(400);
    expect(invalidId.json().error).toBe('validation_error');
  });
});
