import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryApp } from '../helpers/memory-app.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('HTTP auditoria', () => {
  const apps: Array<ReturnType<typeof createMemoryApp>['app']> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('records a company change and refuses a manual write', async () => {
    const { app } = createMemoryApp({ verify: async () => ({ id: subject }), audits: true });
    apps.push(app);
    const headers = { authorization: 'Bearer access-token' };
    const created = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Alfa' } });
    expect(created.statusCode).toBe(201);
    const listed = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([
      expect.objectContaining({
        acao: 'CRIAR',
        recursoTipo: 'EMPRESA',
        descricao: 'Alfa',
        usuarioId: null,
      }),
    ]);
    expect(JSON.stringify(listed.json())).not.toContain(subject);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/empresas/${created.json().id}`,
      headers,
      payload: { razaoSocial: 'Beta' },
    });
    expect(updated.statusCode).toBe(200);
    const again = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    const rows = again.json() as Array<{ acao: string; descricao: string; criadoEm: string }>;
    expect(rows.map((entry) => [entry.acao, entry.descricao])).toEqual([['ATUALIZAR', 'Beta'], ['CRIAR', 'Alfa']]);
    const page = await app.inject({ method: 'GET', url: '/v1/auditorias?q=criou&pagina=1&tamanho=5', headers });
    expect(page.statusCode).toBe(200);
    expect(page.json().total).toBe(1);
    expect(page.json().itens).toEqual([expect.objectContaining({ acao: 'CRIAR', descricao: 'Alfa' })]);
    expect(new Date(rows[0].criadoEm).getTime()).toBeGreaterThanOrEqual(new Date(rows[1].criadoEm).getTime());

    const found = await app.inject({ method: 'GET', url: `/v1/auditorias/${again.json()[0].id}`, headers });
    expect(found.statusCode).toBe(200);
    const missing = await app.inject({ method: 'GET', url: '/v1/auditorias/999', headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'audit_not_found' });
    const manual = await app.inject({ method: 'POST', url: '/v1/auditorias', headers, payload: { descricao: 'manual' } });
    expect(manual.statusCode).toBe(404);
  });

  it('hides the history once an administrator exists and the token is not that administrator', async () => {
    const { app } = createMemoryApp({
      verify: async () => ({ id: subject }),
      audits: true,
      authorizer: true,
    });
    apps.push(app);
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { razaoSocial: 'Alfa' } });
    expect(company.statusCode).toBe(201);
    const open = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    expect(open.statusCode).toBe(200);
    expect(open.json().length).toBeGreaterThan(0);

    const admin = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@example.com', keycloakSub: otherSubject, tipo: 'ADMINITRADOR' },
    });
    expect(admin.statusCode).toBe(201);
    const hidden = await app.inject({ method: 'GET', url: '/v1/auditorias', headers });
    expect(hidden.statusCode).toBe(403);
    expect(hidden.json()).toEqual({ error: 'forbidden' });
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers });
    expect(me.statusCode).toBe(200);
  });
});
