import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { testEnv } from '../helpers/env.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('HTTP acessos', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createApp() {
    const app = buildApp(testEnv, {
      tokenVerifier: { verify: async () => ({ id: subject }) },
      companyRepository: new InMemoryCompanyRepository(),
      systemRepository: new InMemorySystemRepository(),
      userRepository: new InMemoryUserRepository(),
      profileRepository: new InMemoryProfileRepository(),
      accessRepository: new InMemoryAccessRepository(),
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('requires a bearer token', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/v1/acessos' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('links a user, a profile and a system of the same company', async () => {
    const app = createApp();
    const headers = { authorization: 'Bearer access-token' };
    const alfa = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Alfa' } });
    const beta = await app.inject({ method: 'POST', url: '/v1/empresas', headers, payload: { nome: 'Beta' } });
    const empresaId = alfa.json().id as string;
    const user = await app.inject({
      method: 'POST',
      url: '/v1/usuarios',
      headers,
      payload: { nome: 'Ana', email: 'ana@exemplo.com', keycloakSub: subject, empresaId },
    });
    const supervisor = await app.inject({
      method: 'POST',
      url: '/v1/perfis',
      headers,
      payload: { nome: 'Supervisor', empresaId },
    });
    const viewer = await app.inject({
      method: 'POST',
      url: '/v1/perfis',
      headers,
      payload: { nome: 'Visualizador', empresaId },
    });
    const foreign = await app.inject({
      method: 'POST',
      url: '/v1/perfis',
      headers,
      payload: { nome: 'Supervisor', empresaId: beta.json().id },
    });
    const escala = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Escala', empresaId },
    });
    const portal = await app.inject({
      method: 'POST',
      url: '/v1/sistemas',
      headers,
      payload: { nome: 'Portal', empresaId },
    });
    const usuarioId = user.json().id as string;
    const sistemaId = escala.json().id as string;

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId: '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d', perfilId: supervisor.json().id, sistemaId },
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'user_not_found' });

    const mismatch = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId, perfilId: foreign.json().id, sistemaId },
    });
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json()).toEqual({ error: 'access_company_mismatch' });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId, perfilId: supervisor.json().id, sistemaId },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ usuarioId, perfilId: supervisor.json().id, sistemaId, status: 'ATIVO' });
    expect(created.json()).not.toHaveProperty('email');

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId, perfilId: viewer.json().id, sistemaId },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'access_conflict' });

    const second = await app.inject({
      method: 'POST',
      url: '/v1/acessos',
      headers,
      payload: { usuarioId, perfilId: viewer.json().id, sistemaId: portal.json().id },
    });
    expect(second.statusCode).toBe(201);

    const listed = await app.inject({ method: 'GET', url: `/v1/acessos?usuarioId=${usuarioId}&sistemaId=${sistemaId}`, headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ id: created.json().id, sistemaId })]);

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
      payload: { perfilId: viewer.json().id, status: 'INATIVO' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ perfilId: viewer.json().id, sistemaId, status: 'INATIVO' });
  });
});
