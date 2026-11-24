import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';

describe('HTTP sistemas', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: 'sub-1' }) },
      systemRepository: new InMemorySystemRepository(),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('requires a bearer token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/v1/sistemas' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('creates a system for a company and rejects a repeated name', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };

    const created = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: ' Escala ', empresaIds: [1] },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ nome: 'Escala', status: 'ATIVADO', empresaIds: [1] });
    expect(created.json()).not.toHaveProperty('empresaId');

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'escala', empresaIds: [1] },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'system_name_conflict' });

    const listed = await app.inject({ method: 'GET', url: '/v1/sistemas', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: created.json().id, nome: 'Escala' })]);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/sistemas/${created.json().id}`,
      headers,
      payload: { status: 'DESATIVADO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ status: 'DESATIVADO', nome: 'Escala' });
  });

  it('rejects an empty update and a company id on the body', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const missingCompany = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala' },
    });
    expect(missingCompany.statusCode).toBe(400);
    expect(missingCompany.json().error).toBe('validation_error');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: 1 },
    });
    expect(created.statusCode).toBe(400);
    expect(created.json().error).toBe('validation_error');

    const system = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaIds: [1] },
    });
    const empty = await app.inject({
      method: 'PATCH',
      url: `/v1/sistemas/${system.json().id}`,
      headers,
      payload: {},
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error).toBe('validation_error');
  });

  it('links a system to companies and lists the systems of one company', async () => {
    const companies = new InMemoryCompanyRepository();
    const alfa = await companies.add({ razaoSocial: 'Alfa', nomeFantasia: null, nomeReduzido: null, cnpj: null, dataConstituicao: null, status: 'ATIVADO' });
    const beta = await companies.add({ razaoSocial: 'Beta', nomeFantasia: null, nomeReduzido: null, cnpj: null, dataConstituicao: null, status: 'ATIVADO' });
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: 'sub-1' }) },
      systemRepository: new InMemorySystemRepository(),
      companyRepository: companies,
      logger: false,
    });
    apps.push(app);
    const headers = { authorization: 'Bearer access-token' };

    const escala = await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Escala', empresaIds: [beta.id, alfa.id, beta.id] } });
    expect(escala.statusCode).toBe(201);
    expect(escala.json().empresaIds).toEqual([alfa.id, beta.id]);
    await app.inject({ method: 'POST', url: '/v1/sistemas', headers, payload: { nome: 'Portal', empresaIds: [beta.id] } });

    const ofAlfa = await app.inject({ method: 'GET', url: `/v1/sistemas?empresaId=${alfa.id}`, headers });
    expect(ofAlfa.json().map((system: { nome: string }) => system.nome)).toEqual(['Escala']);

    const unlinked = await app.inject({ method: 'PATCH', url: `/v1/sistemas/${escala.json().id}`, headers, payload: { empresaIds: [beta.id] } });
    expect(unlinked.statusCode).toBe(200);
    expect(unlinked.json().empresaIds).toEqual([beta.id]);

    const unknown = await app.inject({ method: 'PATCH', url: `/v1/sistemas/${escala.json().id}`, headers, payload: { empresaIds: [999] } });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toEqual({ error: 'company_not_found' });
  });
});
