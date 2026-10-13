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
      companyRepository: new InMemoryCompanyRepository(),
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

  it('creates a system bound to a company and lists it by that company', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const company = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const other = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Beta' } });
    const empresaId = company.json().id as string;

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d' },
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'company_not_found' });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: ' Escala ', empresaId },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ nome: 'Escala', empresaId, status: 'ATIVO' });

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'escala', empresaId },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'system_name_conflict' });

    const sameNameElsewhere = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: other.json().id },
    });
    expect(sameNameElsewhere.statusCode).toBe(201);

    const listed = await app.inject({ method: 'GET', url: `/v1/sistemas?empresaId=${empresaId}`, headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: created.json().id, empresaId })]);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/sistemas/${created.json().id}`,
      headers,
      payload: { status: 'INATIVO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ status: 'INATIVO', empresaId });
  });

  it('rejects a system without a company id and an empty update', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const createdCompany = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala' },
    });
    expect(created.statusCode).toBe(400);
    expect(created.json().error).toBe('validation_error');

    const system = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId: createdCompany.json().id },
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
});
